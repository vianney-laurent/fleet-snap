import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { withApiLogging, logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/monitoring';
import { validateApiRequest, validateImageFile, validateAuthToken, rateLimiter } from '../../lib/securityValidator';
import { requestManager } from '../../lib/performanceOptimizer';

// Configuration pour les uploads avec limites augmentées
export const config = { 
  api: { 
    bodyParser: false,
    responseLimit: '10mb',
  } 
};

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
    // 1. Validation de sécurité de la requête
    const validation = validateApiRequest(req, ['zone']);
    if (!validation.valid) {
      logger.warn('Requête API invalide', { errors: validation.errors, ip: req.headers['x-forwarded-for'] });
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // 2. Rate limiting par IP
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    if (!rateLimiter.isAllowed(clientIp)) {
      logger.warn('Rate limit dépassé', { ip: clientIp });
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
    }

    logger.info('Début traitement inventaire', { ip: clientIp });

    // 3. Parser le form-data avec limites augmentées et validation
    const { fields, files } = await requestManager.executeWithRetry(
      `parse_form_${clientIp}`,
      () => new Promise((resolve, reject) => {
        const form = formidable({ 
          multiples: true,
          maxFileSize: 10 * 1024 * 1024, // 10MB par fichier
          maxTotalFileSize: 50 * 1024 * 1024, // 50MB total
          maxFields: 10,
          maxFieldsSize: 2 * 1024 * 1024, // 2MB pour les champs texte
          keepExtensions: true,
          allowEmptyFiles: false,
          filter: ({ name, originalFilename, mimetype }) => {
            // Validation préliminaire des fichiers
            if (name === 'photos') {
              const mockFile = { 
                name: originalFilename, 
                type: mimetype, 
                size: 1024 // Taille temporaire pour validation
              };
              const validation = validateImageFile(mockFile);
              if (!validation.valid && !validation.error.includes('trop petit')) {
                logger.warn('Fichier rejeté lors du parsing', { 
                  originalFilename, 
                  mimetype, 
                  error: validation.error 
                });
                return false;
              }
            }
            return true;
          }
        });
        
        form.parse(req, (err, fields, files) => {
          if (err) {
            logger.error('Erreur parsing formidable', err, { 
              userId: user_id || 'unknown',
              errorCode: err.code,
              errorMessage: err.message,
              ip: clientIp
            });
            reject(err);
          } else {
            resolve({ fields, files });
          }
        });
      }),
      { maxRetries: 1 } // Pas de retry pour le parsing
    );

    fileCount = Array.isArray(files.photos) ? files.photos.length : 1;
    logger.info('Fichiers reçus', { fileCount, zone: fields.zone, ip: clientIp });

    // 4. Validation complète des fichiers reçus
    const uploadedFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
    for (const file of uploadedFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        logger.warn('Fichier invalide détecté', { 
          fileName: file.originalFilename,
          error: validation.error,
          userId: user_id,
          ip: clientIp
        });
        return res.status(400).json({ error: `Fichier invalide: ${validation.error}` });
      }
    }

    // 5. Authentification via token Supabase avec validation renforcée
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Tentative accès inventaire sans token valide', { 
        authHeader: !!authHeader,
        ip: clientIp
      });
      return res.status(401).json({ error: 'Token d\'authentification manquant ou invalide' });
    }
    
    const token = authHeader.split(' ')[1];
    const tokenValidation = validateAuthToken(token);
    if (!tokenValidation.valid) {
      logger.warn('Token invalide', { 
        error: tokenValidation.error,
        tokenLength: token?.length,
        ip: clientIp
      });
      return res.status(401).json({ error: tokenValidation.error });
    }

    // 6. Vérification utilisateur avec retry et cache
    const { data: { user }, error: userError } = await requestManager.executeWithRetry(
      `auth_user_${token.substring(0, 10)}`,
      () => supabase.auth.getUser(token),
      { maxRetries: 2 }
    );
    
    if (userError || !user) {
      logger.warn('Token invalide pour inventaire', { 
        error: userError?.message,
        tokenPrefix: token.substring(0, 10) + '...',
        ip: clientIp
      });
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }

    user_id = user.id;
    const { email, user_metadata } = user;
    const concession = user_metadata?.concession || '';
    
    // Validation des métadonnées utilisateur
    if (!concession) {
      logger.warn('Utilisateur sans concession', { userId: user_id, email, ip: clientIp });
      return res.status(400).json({ error: 'Concession utilisateur non définie' });
    }
    
    logger.info('Utilisateur authentifié pour inventaire', { 
      userId: user_id, 
      email, 
      concession,
      ip: clientIp
    });

    // 7. Rate limiting par utilisateur
    if (!rateLimiter.isAllowed(`user_${user_id}`)) {
      logger.warn('Rate limit utilisateur dépassé', { userId: user_id, ip: clientIp });
      return res.status(429).json({ error: 'Trop d\'uploads. Attendez avant de réessayer.' });
    }

    // 8. Préparer et traiter chaque photo avec gestion d'erreurs améliorée
    const records = [];
    const errors = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      
      try {
        // 8.a. Lire le fichier en buffer avec gestion mémoire
        const buffer = await requestManager.executeWithRetry(
          `read_file_${user_id}_${i}`,
          () => readFile(file.filepath),
          { maxRetries: 2 }
        );
        
        // Vérification finale de la taille après lecture
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error('Fichier trop volumineux après lecture');
        }
        
        // Encode image as base64 for inlineData
        const base64Image = buffer.toString('base64');
        const sanitizedFilename = file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `inventories/${user_id}/${Date.now()}_${i}_${sanitizedFilename}`;

        // 8.b. Upload dans Supabase Storage avec retry
        const { data: uploadData, error: uploadError } = await requestManager.executeWithRetry(
          `upload_${user_id}_${i}`,
          () => supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, buffer, { 
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            }),
          { maxRetries: 3 }
        );
        
        if (uploadError) {
          logger.error('Erreur upload Supabase Storage', uploadError, { 
            userId: user_id, 
            filePath, 
            fileSize: buffer.length,
            attempt: i + 1
          });
          errors.push(`Upload fichier ${i + 1}: ${uploadError.message}`);
          continue;
        }

        // 8.c. Récupérer l'URL publique (bucket public)
        const { data: { publicUrl }, error: publicUrlError } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);
        if (publicUrlError) {
          logger.error('Erreur URL publique Supabase', publicUrlError, { userId: user_id, filePath });
          errors.push(`URL publique fichier ${i + 1}: ${publicUrlError.message}`);
          continue;
        }
        
        logger.info('Image uploadée avec succès', { 
          userId: user_id, 
          filePath, 
          fileSize: buffer.length,
          publicUrl: publicUrl.substring(0, 50) + '...',
          attempt: i + 1
        });

        // 8.d. OCR via Gemini Flash multimodal avec retry et timeout
        const imagePart = {
          inlineData: { mimeType: file.mimetype, data: base64Image }
        };
        const textPart = {
          text: 'Extrait uniquement la plaque d\'immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.'
        };
        
        const ocrStartTime = Date.now();
        let identifiant = 'NO_DETECTION';
        
        try {
          const ocrResponse = await requestManager.executeWithRetry(
            `ocr_${user_id}_${i}`,
            async () => {
              const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: { parts: [imagePart, textPart] },
                config: {
                  systemInstruction: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d'immatriculation et VIN.',
                  maxOutputTokens: 50,
                  temperature: 0.1
                }
              });
              return response;
            },
            { 
              maxRetries: 2,
              retryCondition: (error) => !error.message?.includes('SAFETY')
            }
          );
          
          identifiant = ocrResponse.text?.trim() || 'NO_DETECTION';
          
          // Validation basique du résultat OCR
          if (identifiant.length > 20) {
            identifiant = identifiant.substring(0, 20);
          }
          
        } catch (ocrError) {
          logger.warn('Erreur OCR non critique', { 
            userId: user_id, 
            error: ocrError.message,
            attempt: i + 1
          });
          identifiant = 'OCR_ERROR';
        }
        
        const ocrDuration = Date.now() - ocrStartTime;
        
        logger.inventory.ocrResult(user_id, identifiant, null, {
          duration: ocrDuration,
          fileSize: buffer.length,
          mimeType: file.mimetype,
          attempt: i + 1
        });

        // Enregistrer les métriques OCR
        metricsCollector.recordUserActivity(user_id, 'ocr_processing', {
          duration: ocrDuration,
          result: identifiant,
          fileSize: buffer.length,
          success: identifiant !== 'OCR_ERROR'
        });

        // 8.e. Construire l'enregistrement avec validation
        const record = {
          zone: fields.zone?.toString().trim() || '',
          commentaire: fields.comment?.toString().trim() || '',
          concession,
          collaborateur: user_metadata?.name || email,
          photo_url: publicUrl,
          identifiant,
          created_at: new Date().toISOString(),
        };
        
        // Validation finale de l'enregistrement
        if (!record.zone) {
          errors.push(`Zone manquante pour fichier ${i + 1}`);
          continue;
        }
        
        records.push(record);
        
        // Libérer la mémoire du buffer
        buffer.fill(0);
        
      } catch (fileError) {
        logger.error('Erreur traitement fichier', fileError, { 
          userId: user_id, 
          fileName: file.originalFilename,
          attempt: i + 1
        });
        errors.push(`Fichier ${i + 1}: ${fileError.message}`);
      }
    }

    // 9. Vérifier qu'au moins un fichier a été traité avec succès
    if (records.length === 0) {
      const errorMessage = errors.length > 0 
        ? `Aucun fichier traité avec succès. Erreurs: ${errors.join('; ')}`
        : 'Aucun fichier valide trouvé';
      
      logger.error('Aucun enregistrement créé', { 
        userId: user_id, 
        errors, 
        fileCount: uploadedFiles.length 
      });
      
      return res.status(400).json({ error: errorMessage });
    }

    // 10. Insertion dans la table SQL 'inventaire' avec retry
    const { data: insertData, error: insertError } = await requestManager.executeWithRetry(
      `insert_inventory_${user_id}`,
      () => supabase.from('inventaire').insert(records),
      { maxRetries: 3 }
    );
    
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
      errorCount: errors.length,
      success: true
    });

    // Enregistrer les métriques d'upload
    metricsCollector.recordUserActivity(user_id, 'inventory_upload', {
      fileCount,
      zone: fields.zone,
      concession,
      duration: totalDuration,
      recordCount: records.length,
      errorCount: errors.length
    });

    // Réponse avec détails des erreurs si partielles
    const response = { 
      success: true, 
      records: insertData,
      processed: records.length,
      total: uploadedFiles.length
    };
    
    if (errors.length > 0) {
      response.warnings = errors;
      response.message = `${records.length}/${uploadedFiles.length} fichiers traités avec succès`;
    }

    return res.status(200).json(response);
    
  } catch (err) {
    const totalDuration = Date.now() - startTime;
    
    // Déterminer le code d'erreur approprié
    let statusCode = 500;
    let errorMessage = err.message;
    
    if (err.code === 'LIMIT_FILE_SIZE' || err.message.includes('maxFileSize')) {
      statusCode = 413;
      errorMessage = 'Fichier trop volumineux. Taille maximale: 10MB par image.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      statusCode = 413;
      errorMessage = 'Trop de fichiers envoyés simultanément.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      errorMessage = 'Type de fichier non autorisé.';
    } else if (err.message.includes('Circuit breaker')) {
      statusCode = 503;
      errorMessage = 'Service temporairement indisponible. Réessayez plus tard.';
    } else if (err.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Délai d\'attente dépassé. Réessayez avec des fichiers plus petits.';
    }

    logger.inventory.error(user_id, err, {
      duration: totalDuration,
      zone: fields?.zone,
      fileCount,
      statusCode,
      errorCode: err.code,
      ip: req.headers['x-forwarded-for']
    });

    return res.status(statusCode).json({ 
      error: errorMessage,
      code: err.code,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

export default withApiLogging(handler);