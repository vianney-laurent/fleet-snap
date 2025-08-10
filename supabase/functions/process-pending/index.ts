// supabase/functions/process-pending/index.ts
import { serve } from 'https://deno.land/x/sift@0.5.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai';

// Initialize Supabase client with Service Role Key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') });

// Start the Edge function
serve(async (_req) => {
  // Fetch records with status 'pending'
  const { data: pending, error: fetchErr } = await supabase
    .from('inventaire')
    .select('id, photo_url')
    .eq('status', 'pending');
  if (fetchErr) return new Response(fetchErr.message, { status: 500 });

  let processedCount = 0;

  for (const rec of pending) {
    try {
      // Download the image
      const response = await fetch(rec.photo_url);
      if (!response.ok) continue;
      const arrayBuffer = await response.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Perform OCR via Gemini Flash
      const ocr = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: { data: b64 } }] },
        config: {
          systemInstruction: 'You are an OCR assistant for license plates/VIN. Reply only with the plate or VIN, or NO_DETECTION.'
        }
      });
      const identifiant = (ocr.text || '').trim() || 'NO_DETECTION';

      // Update the record to 'done'
      await supabase
        .from('inventaire')
        .update({ identifiant, status: 'done' })
        .eq('id', rec.id);

      processedCount++;
    } catch (e) {
      console.error('Error processing record', rec.id, e);
    }
  }

  return new Response(JSON.stringify({ processedCount }), {
    headers: { 'Content-Type': 'application/json' }
  });
});