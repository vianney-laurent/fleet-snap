
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Disable Next.js default body parsing for multipart/form-data
export const config = { api: { bodyParser: false } };

// Supabase server-side client with Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart/form-data
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: true });
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    // Authenticate user via Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Invalid user' });

    const email = user.email;
    const collaborateur = user.user_metadata?.name || email;
    const concession = user.user_metadata?.concession || '';

    // Prepare files array
    const uploadedFiles = Array.isArray(files.photos) ? files.photos : [files.photos];
    const records = [];

    for (const file of uploadedFiles) {
      // Read file buffer and upload to Storage
      const buffer = await readFile(file.filepath);
      const filePath = `photos/${Date.now()}_${file.originalFilename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET)
        .upload(filePath, buffer, { contentType: file.mimetype });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl }, error: publicUrlError } = supabase.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);
      if (publicUrlError) throw publicUrlError;

      // Build pending record
      records.push({
        concession,
        collaborateur,
        zone: fields.zone,
        commentaire: fields.comment,
        photo_url: publicUrl,
        identifiant: '',
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    // Batch insert and return inserted rows
    const { data: insertData, error: insertError } = await supabase
      .from('inventaire')
      .insert(records)
      .select();
    if (insertError) throw insertError;

    // Determine how many were inserted
    const insertedCount = Array.isArray(insertData) ? insertData.length : records.length;
    return res.status(200).json({ insertedCount });
  } catch (err) {
    console.error('API Bulk Inventory Error:', err);
    return res.status(500).json({ error: err.message });
  }
}