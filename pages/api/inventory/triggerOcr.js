import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { withApiLogging, logger } from '../../../lib/logger';
import { metricsCollector } from '../../../lib/monitoring';
import { detectImageMimeType, isValidImageMimeType, formatFileSize } from '../../../lib/image-utils';

// Disable Next.js default body parsing
export const config = { api: { bodyParser: false } };

// Initialize Supabase server client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const triggeredBy = req.headers['x-triggered-by'] || 'manual';
  const triggerUserId = req.headers['x-user-id'] || 'unknown';
  const expectedRecords = parseInt(req.headers['x-record-count'] || '0');

  try {
    logger.info('🚀 Déclenchement traitement OCR hybride', {
      triggeredBy,
      triggerUserId,
      expectedRecords,
      userAgent: req.headers['user-agent']
    });

    // 1. Fetch pending records (limité pour éviter la surcharge)
    const BATCH_LIMIT = triggeredBy === 'bulk-upload' ? Math.min(expectedRecords + 5, 50) : 30;
    
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('inventaire')
      .select('id, photo_url, zone, concession, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);
    
    if (fetchError) {
      logger.error('Erreur récupération records pending', fetchError);
      throw fetchError;
    }

    logger.info('Records pending récupérés', { 
      count: pendingRecords.length,
      expectedRecords,
      triggeredBy
    });

    if (pendingRecords.length === 0) {
      return res.status(200).json({ 
        processedCount: 0,
        message: 'Aucun enregistrement en attente',
        triggeredBy
      });
    }

    let processedCount = 0;
    let errorCount = 0;

    // 2. Traiter chaque record en parallèle (pour de meilleures performances)
    const processPromises = pendingRecords.map(async (record) => {
      try {
        // Marquer comme en cours de traitement
        const { error: claimError } = await supabase
          .from('inventaire')
          .update({ status: 'processing' })
          .eq('id', record.id)
          .eq('status', 'pending'); // Condition pour éviter les doublons
        
        if (claimError) {
          logger.warn('Impossible de réclamer le record', { 
            recordId: record.id, 
            error: claimError.message 
          });
          return { success: false, recordId: record.id };
        }

        logger.info('Début traitement OCR', { 
          recordId: record.id,
          zone: record.zone,
          concession: record.concession
        });

        // Download image
        const imgRes = await fetch(record.photo_url);
        if (!imgRes.ok) {
          logger.warn('Échec téléchargement image', { 
            recordId: record.id,
            status: imgRes.status 
          });
          
          await supabase
            .from('inventaire')
            .update({ status: 'error', identifiant: 'DOWNLOAD_ERROR' })
            .eq('id', record.id);
          
          return { success: false, recordId: record.id };
        }
        
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        
        // Détection robuste du mimeType
        const mimeType = detectImageMimeType(imgRes, record.photo_url, arrayBuffer);

        logger.info('Image téléchargée pour OCR', {
          recordId: record.id,
          mimeType,
          imageSize: formatFileSize(arrayBuffer.byteLength),
          photoUrl: record.photo_url.substring(0, 100) + '...',
          contentTypeHeader: imgRes.headers.get('content-type')
        });

        // Validation du mimeType avant envoi à Gemini
        if (!isValidImageMimeType(mimeType)) {
          logger.error('MimeType invalide détecté', null, {
            recordId: record.id,
            mimeType,
            photoUrl: record.photo_url,
            contentTypeHeader: imgRes.headers.get('content-type')
          });
          
          await supabase
            .from('inventaire')
            .update({ status: 'error', identifiant: 'INVALID_MIMETYPE' })
            .eq('id', record.id);
          
          return { success: false, recordId: record.id, error: 'Invalid mimeType' };
        }

        // OCR via Gemini Flash avec prompt optimisé
        const ocrStartTime = Date.now();
        const ocrResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: mimeType } },
              { text: 'Extrait uniquement la plaque d\'immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.' }
            ]
          },
          config: {
            systemInstruction: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d\'immatriculation et VIN.'
          }
        });

        const ocrDuration = Date.now() - ocrStartTime;
        const identifiant = (ocrResponse.text || '').trim() || 'NO_DETECTION';

        logger.inventory.ocrResult('system', identifiant, null, {
          recordId: record.id,
          duration: ocrDuration,
          zone: record.zone,
          concession: record.concession,
          triggeredBy
        });

        // Enregistrer les métriques OCR
        metricsCollector.recordUserActivity('system', 'ocr_processing_hybrid', {
          duration: ocrDuration,
          result: identifiant,
          recordId: record.id,
          triggeredBy
        });

        // Update record to done
        const { error: updateError } = await supabase
          .from('inventaire')
          .update({ identifiant, status: 'done' })
          .eq('id', record.id);
        
        if (updateError) {
          logger.error('Erreur mise à jour record après OCR', updateError, { 
            recordId: record.id 
          });
          return { success: false, recordId: record.id };
        }

        logger.info('OCR terminé avec succès', { 
          recordId: record.id,
          identifiant,
          duration: ocrDuration
        });

        return { success: true, recordId: record.id, identifiant, duration: ocrDuration };

      } catch (error) {
        logger.error('Erreur traitement record', error, { 
          recordId: record.id,
          triggeredBy
        });
        
        // Marquer comme erreur
        await supabase
          .from('inventaire')
          .update({ status: 'error', identifiant: 'PROCESSING_ERROR' })
          .eq('id', record.id);
        
        return { success: false, recordId: record.id, error: error.message };
      }
    });

    // Attendre tous les traitements
    const results = await Promise.all(processPromises);
    processedCount = results.filter(r => r.success).length;
    errorCount = results.filter(r => !r.success).length;

    const totalDuration = Date.now() - startTime;
    
    logger.info('🎯 Traitement OCR hybride terminé', {
      totalRecords: pendingRecords.length,
      processedCount,
      errorCount,
      duration: totalDuration,
      triggeredBy,
      triggerUserId,
      avgOcrTime: results
        .filter(r => r.success && r.duration)
        .reduce((acc, r) => acc + r.duration, 0) / Math.max(processedCount, 1)
    });

    return res.status(200).json({ 
      processedCount,
      errorCount,
      totalRecords: pendingRecords.length,
      duration: totalDuration,
      triggeredBy,
      message: `${processedCount} photo(s) traitée(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`
    });

  } catch (err) {
    const totalDuration = Date.now() - startTime;
    logger.error('Erreur traitement OCR hybride', err, { 
      duration: totalDuration,
      triggeredBy,
      triggerUserId
    });
    return res.status(500).json({ 
      error: err.message,
      triggeredBy,
      duration: totalDuration
    });
  }
}

export default withApiLogging(handler);