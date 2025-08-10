

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Use global fetch (Node 18+) to download images

// Disable Next.js default body parsing (not needed for GET)
export const config = { api: { bodyParser: false } };

// Initialize Supabase server client (Service Role Key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch all pending records
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('inventaire')
      .select('id, photo_url')
      .eq('status', 'pending');
    if (fetchError) throw fetchError;

    let processedCount = 0;

    // 2. Process each pending record
    for (const record of pendingRecords) {
      try {
        // Download image as array buffer
        const imgRes = await fetch(record.photo_url);
        if (!imgRes.ok) {
          console.warn(`Failed to fetch image for record id ${record.id}`);
          continue;
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        // OCR via Gemini Flash 2.0
        const ocrResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              { inlineData: { data: base64Image } }
            ]
          },
          config: {
            systemInstruction: 'You are a specialized OCR assistant. Extract only the license plate or VIN (17 alphanumeric characters, no I,O,Q). Reply with the text or NO_DETECTION.'
          }
        });

        const identifiant = (ocrResponse.text || '').trim() || 'NO_DETECTION';

        // 3. Update record in database
        const { error: updateError } = await supabase
          .from('inventaire')
          .update({ identifiant, status: 'done' })
          .eq('id', record.id);
        if (updateError) {
          console.error(`Failed to update record id ${record.id}:`, updateError);
          continue;
        }

        processedCount++;
      } catch (innerErr) {
        console.error(`Error processing record id ${record.id}:`, innerErr);
      }
    }

    // 4. Return summary
    return res.status(200).json({ processedCount });
  } catch (err) {
    console.error('API processPending Error:', err);
    return res.status(500).json({ error: err.message });
  }
}