import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

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

  try {
    // 1. Parser le form-data (zones, comment, photos[])
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: true });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const fileCount = Array.isArray(files.photos) ? files.photos.length : 1;

    // 2. Authentification via token Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Utilisateur invalide' });

    const { id: user_id, email, user_metadata } = user;
    const concession = user_metadata.concession || '';

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
      if (uploadError) throw uploadError;

      // 3.c. Récupérer l'URL publique (bucket public)
      const { data: { publicUrl }, error: publicUrlError } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);
      if (publicUrlError) throw publicUrlError;
      console.log('OCR image URL:', publicUrl);

      // 3.d. OCR via Gemini Flash multimodal (image + text)
      const imagePart = {
        inlineData: { mimeType: file.mimetype, data: base64Image }
      };
      const textPart = {
        text: 'Extrait uniquement la plaque d’immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.'
      };
      const ocrResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d’immatriculation et VIN.'
        }
      });
      console.log('OCR raw response:', ocrResponse);
      const identifiant = ocrResponse.text.trim() || 'NO_DETECTION';

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
    if (insertError) throw insertError;

    return res.status(200).json({ success: true, records: insertData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default handler;