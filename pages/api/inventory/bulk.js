
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../../lib/logger';
import { metricsCollector } from '../../../lib/monitoring';

// Disable Next.js default body parsing for multipart/form-data
export const config = { api: { bodyParser: false } };

// Supabase server-side client with Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  let user_id = 'unknown';

  try {
    logger.info('Début upload batch inventaire');

    // Parse multipart/form-data
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: true });
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    const fileCount = Array.isArray(files.photos) ? files.photos.length : 1;
    logger.info('Fichiers batch reçus', { fileCount, zone: fields.zone });

    // Authenticate user via Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Tentative upload batch sans token');
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      logger.warn('Token invalide pour upload batch', { error: userError?.message });
      return res.status(401).json({ error: 'Invalid user' });
    }

    user_id = user.id;
    const email = user.email;
    const collaborateur = user.user_metadata?.name || email;
    const concession = user.user_metadata?.concession || '';

    logger.info('Utilisateur authentifié pour upload batch', {
      userId: user_id,
      email,
      concession,
      fileCount
    });

    // Prepare files array
    const uploadedFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
    
    logger.info('Début upload parallèle', {
      userId: user_id,
      fileCount,
      totalSize: uploadedFiles.reduce((acc, file) => acc + file.size, 0),
      avgFileSize: Math.round(uploadedFiles.reduce((acc, file) => acc + file.size, 0) / fileCount)
    });

    // 🚀 PARALLÉLISATION : Traiter tous les fichiers en parallèle
    const uploadPromises = uploadedFiles.map(async (file, index) => {
      const fileStartTime = Date.now();
      
      try {
        logger.info('Début upload fichier', {
          userId: user_id,
          fileIndex: index,
          fileName: file.originalFilename,
          fileSize: file.size,
          mimeType: file.mimetype
        });

        // Read file buffer and upload to Storage
        const readStartTime = Date.now();
        const buffer = await readFile(file.filepath);
        const readDuration = Date.now() - readStartTime;

        const filePath = `photos/${Date.now()}_${index}_${file.originalFilename}`;
        
        const uploadStartTime = Date.now();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET)
          .upload(filePath, buffer, { contentType: file.mimetype });
        const uploadDuration = Date.now() - uploadStartTime;

        if (uploadError) {
          logger.error('Erreur upload fichier', uploadError, {
            userId: user_id,
            fileIndex: index,
            fileName: file.originalFilename,
            uploadDuration
          });
          throw uploadError;
        }

        // Get public URL
        const urlStartTime = Date.now();
        const { data: { publicUrl }, error: publicUrlError } = supabase.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);
        const urlDuration = Date.now() - urlStartTime;

        if (publicUrlError) {
          logger.error('Erreur URL publique', publicUrlError, {
            userId: user_id,
            fileIndex: index,
            fileName: file.originalFilename
          });
          throw publicUrlError;
        }

        const totalFileDuration = Date.now() - fileStartTime;

        // Métriques détaillées par fichier
        logger.info('Upload fichier terminé', {
          userId: user_id,
          fileIndex: index,
          fileName: file.originalFilename,
          fileSize: file.size,
          durations: {
            read: readDuration,
            upload: uploadDuration,
            url: urlDuration,
            total: totalFileDuration
          },
          uploadSpeed: Math.round(file.size / (uploadDuration / 1000)) // bytes/sec
        });

        // Enregistrer métriques individuelles
        metricsCollector.recordUserActivity(user_id, 'file_upload_individual', {
          fileIndex: index,
          fileSize: file.size,
          duration: totalFileDuration,
          uploadSpeed: Math.round(file.size / (uploadDuration / 1000))
        });

        // Build pending record
        return {
          concession,
          collaborateur,
          zone: fields.zone,
          commentaire: fields.comment,
          photo_url: publicUrl,
          identifiant: '',
          status: 'pending',
          created_at: new Date().toISOString(),
          // Métadonnées pour debug
          _uploadMetrics: {
            fileIndex: index,
            fileName: file.originalFilename,
            fileSize: file.size,
            duration: totalFileDuration
          }
        };

      } catch (error) {
        const totalFileDuration = Date.now() - fileStartTime;
        
        logger.error('Échec upload fichier', error, {
          userId: user_id,
          fileIndex: index,
          fileName: file.originalFilename,
          fileSize: file.size,
          duration: totalFileDuration
        });

        // Retourner un objet d'erreur au lieu de throw pour ne pas casser le batch
        return {
          error: true,
          errorMessage: error.message,
          fileIndex: index,
          fileName: file.originalFilename,
          fileSize: file.size,
          duration: totalFileDuration
        };
      }
    });

    // Attendre tous les uploads en parallèle
    const parallelStartTime = Date.now();
    const uploadResults = await Promise.all(uploadPromises);
    const parallelDuration = Date.now() - parallelStartTime;

    // Séparer les succès des échecs
    const successfulUploads = uploadResults.filter(result => !result.error);
    const failedUploads = uploadResults.filter(result => result.error);

    logger.info('Upload parallèle terminé', {
      userId: user_id,
      totalFiles: fileCount,
      successfulFiles: successfulUploads.length,
      failedFiles: failedUploads.length,
      parallelDuration,
      avgFileTime: Math.round(parallelDuration / fileCount),
      totalSize: uploadedFiles.reduce((acc, file) => acc + file.size, 0),
      avgUploadSpeed: Math.round(
        uploadedFiles.reduce((acc, file) => acc + file.size, 0) / (parallelDuration / 1000)
      )
    });

    if (failedUploads.length > 0) {
      logger.warn('Certains fichiers ont échoué', {
        userId: user_id,
        failedCount: failedUploads.length,
        failedFiles: failedUploads.map(f => ({
          index: f.fileIndex,
          name: f.fileName,
          error: f.errorMessage
        }))
      });
    }

    // Ne garder que les uploads réussis pour l'insertion
    const records = successfulUploads.map(result => {
      // Retirer les métadonnées de debug avant insertion
      const { _uploadMetrics, ...record } = result;
      return record;
    });

    // Batch insert and return inserted rows
    const { data: insertData, error: insertError } = await supabase
      .from('inventaire')
      .insert(records)
      .select();
    if (insertError) {
      logger.error('Erreur insertion batch Supabase', insertError, {
        userId: user_id,
        recordCount: records.length
      });
      throw insertError;
    }

    const insertedCount = Array.isArray(insertData) ? insertData.length : records.length;
    const totalDuration = Date.now() - startTime;
    const failedCount = fileCount - insertedCount;

    // Métriques de performance détaillées
    const performanceMetrics = {
      totalDuration,
      parallelDuration,
      dbInsertDuration: totalDuration - parallelDuration,
      avgTimePerFile: Math.round(totalDuration / fileCount),
      avgParallelTimePerFile: Math.round(parallelDuration / fileCount),
      totalSize: uploadedFiles.reduce((acc, file) => acc + file.size, 0),
      avgFileSize: Math.round(uploadedFiles.reduce((acc, file) => acc + file.size, 0) / fileCount),
      overallUploadSpeed: Math.round(
        uploadedFiles.reduce((acc, file) => acc + file.size, 0) / (parallelDuration / 1000)
      ),
      successRate: Math.round((insertedCount / fileCount) * 100),
      parallelizationGain: fileCount > 1 ? Math.round(((fileCount * (totalDuration / fileCount)) - totalDuration) / 1000) : 0
    };

    logger.inventory.upload(user_id, fileCount, fields.zone, concession, {
      duration: totalDuration,
      recordCount: insertedCount,
      failedCount,
      success: insertedCount > 0,
      batchMode: true,
      parallel: true,
      performance: performanceMetrics
    });

    // 🚀 DÉCLENCHEMENT ASYNCHRONE DU TRAITEMENT OCR
    if (insertedCount > 0) {
      logger.info('Déclenchement traitement OCR asynchrone', {
        userId: user_id,
        pendingRecords: insertedCount
      });
      
      // Stratégie robuste pour construire l'URL de base sur Vercel
      const getBaseUrl = () => {
        // 1. Priorité à l'origin header (le plus fiable)
        if (req.headers.origin) {
          return req.headers.origin;
        }
        
        // 2. Construire depuis les headers Vercel
        if (process.env.VERCEL) {
          // En production Vercel, utiliser VERCEL_URL ou VERCEL_BRANCH_URL
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}`;
          }
          if (process.env.VERCEL_BRANCH_URL) {
            return `https://${process.env.VERCEL_BRANCH_URL}`;
          }
          // Fallback avec le host header
          if (req.headers.host) {
            return `https://${req.headers.host}`;
          }
        }
        
        // 3. Construire depuis les headers de forwarding
        if (req.headers['x-forwarded-host']) {
          const proto = req.headers['x-forwarded-proto'] || 'https';
          return `${proto}://${req.headers['x-forwarded-host']}`;
        }
        
        // 4. Fallback avec host header
        if (req.headers.host) {
          const proto = req.headers['x-forwarded-proto'] || 'http';
          return `${proto}://${req.headers.host}`;
        }
        
        // 5. Fallback local
        return 'http://localhost:3000';
      };
      
      const baseUrl = getBaseUrl();
      const triggerUrl = `${baseUrl}/api/inventory/triggerOcr`;
      
      logger.info('URL de déclenchement OCR construite', {
        userId: user_id,
        baseUrl,
        triggerUrl,
        headers: {
          origin: req.headers.origin,
          host: req.headers.host,
          'x-forwarded-host': req.headers['x-forwarded-host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto']
        },
        env: {
          VERCEL: process.env.VERCEL,
          VERCEL_URL: process.env.VERCEL_URL,
          VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL
        }
      });
      
      // Appel asynchrone avec timeout et retry
      const triggerOcr = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
          
          const response = await fetch(triggerUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'FleetSnap-Auto-Trigger',
              'X-Triggered-By': 'bulk-upload',
              'X-User-Id': user_id,
              'X-Record-Count': insertedCount.toString()
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.text();
          logger.info('OCR déclenché avec succès', {
            userId: user_id,
            triggerUrl,
            responseStatus: response.status,
            responsePreview: result.substring(0, 200)
          });
          
        } catch (error) {
          logger.warn('Erreur déclenchement OCR asynchrone', { 
            userId: user_id,
            triggerUrl,
            error: error.message,
            errorType: error.name
          });
          
          // Retry avec une URL alternative si c'est un problème de réseau
          if (error.name === 'AbortError' || error.message.includes('fetch')) {
            logger.info('Tentative de retry avec URL alternative', { userId: user_id });
            
            // Essayer avec localhost si on est en développement
            if (process.env.NODE_ENV === 'development') {
              try {
                await fetch('http://localhost:3000/api/inventory/triggerOcr', {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'FleetSnap-Auto-Trigger-Retry',
                    'X-Triggered-By': 'bulk-upload-retry',
                    'X-User-Id': user_id,
                    'X-Record-Count': insertedCount.toString()
                  }
                });
                logger.info('Retry OCR réussi avec localhost', { userId: user_id });
              } catch (retryError) {
                logger.error('Retry OCR échoué', retryError, { userId: user_id });
              }
            }
          }
        }
      };
      
      // Lancer le déclenchement sans bloquer la réponse
      triggerOcr();
    }

    // Enregistrer les métriques globales
    metricsCollector.recordUserActivity(user_id, 'inventory_batch_upload_parallel', {
      fileCount,
      zone: fields.zone,
      concession,
      duration: totalDuration,
      recordCount: insertedCount,
      failedCount,
      ...performanceMetrics
    });

    // Enregistrer métriques de performance pour alertes
    if (performanceMetrics.avgTimePerFile > 5000) { // Plus de 5s par fichier
      metricsCollector.recordError('slow_upload_performance', new Error('Upload lent détecté'), {
        userId: user_id,
        avgTimePerFile: performanceMetrics.avgTimePerFile,
        fileCount,
        totalDuration
      });
    }

    if (performanceMetrics.successRate < 100) { // Échecs détectés
      metricsCollector.recordError('upload_failures', new Error('Échecs d\'upload détectés'), {
        userId: user_id,
        successRate: performanceMetrics.successRate,
        failedCount,
        fileCount
      });
    }

    return res.status(200).json({ 
      insertedCount,
      failedCount,
      ocrTriggered: insertedCount > 0,
      performance: {
        totalDuration,
        avgTimePerFile: performanceMetrics.avgTimePerFile,
        uploadSpeed: performanceMetrics.overallUploadSpeed,
        successRate: performanceMetrics.successRate
      },
      message: insertedCount > 0 ? 
        `${insertedCount} photo(s) uploadée(s) en ${Math.round(totalDuration/1000)}s, traitement OCR en cours...` :
        failedCount > 0 ? 
          `Échec de l'upload (${failedCount} erreur(s))` :
          'Upload terminé'
    });

  } catch (err) {
    const totalDuration = Date.now() - startTime;
    logger.inventory.error(user_id, err, {
      duration: totalDuration,
      zone: fields?.zone,
      fileCount: Array.isArray(files?.photos) ? files.photos.length : 1,
      batchMode: true
    });
    return res.status(500).json({ error: err.message });
  }
}

export default withApiLogging(handler);