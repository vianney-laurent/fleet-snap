import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { withApiLogging, logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/monitoring';

// Désactive le parsing natif de Next.js pour multipart/form-data
export const config = { api: { bodyParser: false } };

// Initialisation Supabase server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialisation Google Gemini Flash SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Nom du bucket Supabase Storage défini en .env.local (défaut: 'photos')
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'photos';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const startTime = Date.now();
  let user_id = 'unknown';
  let fields = {};
  let fileCount = 0;

  try {
    logger.info('Début traitement inventaire');

    // 1. Parser le form-data (zones, comment, photos[])
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB par fichier
        maxTotalFileSize: 50 * 1024 * 1024 // 50MB total pour tous les fichiers
      });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    fileCount = Array.isArray(files.photos) ? files.photos.length : 1;
    logger.info('Fichiers reçus', { fileCount, zone: fields.zone });

    // 2. Authentification via token Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Tentative accès inventaire sans token');
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      logger.warn('Token invalide pour inventaire', { error: userError?.message });
      return res.status(401).json({ error: 'Utilisateur invalide' });
    }

    user_id = user.id;
    const { email, user_metadata } = user;
    const concession = user_metadata.concession || '';

    logger.info('Utilisateur authentifié pour inventaire', {
      userId: user_id,
      email,
      concession
    });

    // 3. Préparer et traiter chaque photo
    const uploadedFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
    const records = [];

    for (const file of uploadedFiles) {
      // 3.a. Lire le fichier en buffer
      const buffer = await readFile(file.filepath);
      // Encode image as base64 for inlineData
      const base64Image = buffer.toString('base64');
      const filePath = `inventories/${user_id}/${Date.now()}_${file.originalFilename}`;

      // 3.b. Upload dans Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, { contentType: file.mimetype });
      if (uploadError) {
        logger.error('Erreur upload Supabase Storage', uploadError, {
          userId: user_id,
          filePath,
          fileSize: buffer.length
        });
        throw uploadError;
      }

      // 3.c. Récupérer l'URL publique (bucket public)
      const { data: { publicUrl }, error: publicUrlError } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);
      if (publicUrlError) {
        logger.error('Erreur URL publique Supabase', publicUrlError, { userId: user_id, filePath });
        throw publicUrlError;
      }

      logger.info('Image uploadée avec succès', {
        userId: user_id,
        filePath,
        fileSize: buffer.length,
        publicUrl: publicUrl.substring(0, 50) + '...'
      });

      // 3.d. OCR via Gemini Flash multimodal (image + text)
      const imagePart = {
        inlineData: { mimeType: file.mimetype, data: base64Image }
      };
      const textPart = {
        text: 'Extrait uniquement la plaque d’immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.'
      };
      const ocrStartTime = Date.now();
      const ocrResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d’immatriculation et VIN.'
        }
      });
      const ocrDuration = Date.now() - ocrStartTime;
      const identifiant = ocrResponse.text.trim() || 'NO_DETECTION';

      logger.inventory.ocrResult(user_id, identifiant, null, {
        duration: ocrDuration,
        fileSize: buffer.length,
        mimeType: file.mimetype
      });

      // Enregistrer les métriques OCR
      metricsCollector.recordUserActivity(user_id, 'ocr_processing', {
        duration: ocrDuration,
        result: identifiant,
        fileSize: buffer.length
      });

      // 3.e. Construire l'enregistrement
      records.push({
        zone: fields.zone,
        commentaire: fields.comment,
        concession,
        collaborateur: user_metadata.name || email,
        photo_url: publicUrl,
        identifiant,
        created_at: new Date().toISOString(),
      });
    }

    // 4. Insertion dans la table SQL 'inventaire'
    const { data: insertData, error: insertError } = await supabase
      .from('inventaire')
      .insert(records);
    if (insertError) {
      logger.error('Erreur insertion inventaire Supabase', insertError, {
        userId: user_id,
        recordCount: records.length
      });
      throw insertError;
    }

    const totalDuration = Date.now() - startTime;
    logger.inventory.upload(user_id, fileCount, fields.zone, concession, {
      duration: totalDuration,
      recordCount: records.length,
      success: true
    });

    // Enregistrer les métriques d'upload
    metricsCollector.recordUserActivity(user_id, 'inventory_upload', {
      fileCount,
      zone: fields.zone,
      concession,
      duration: totalDuration,
      recordCount: records.length
    });

    return res.status(200).json({ success: true, records: insertData });
  } catch (err) {
    const totalDuration = Date.now() - startTime;
    logger.inventory.error(user_id, err, {
      duration: totalDuration,
      zone: fields?.zone,
      fileCount
    });
    return res.status(500).json({ error: err.message });
  }
}

export default withApiLogging(handler);