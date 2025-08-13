// supabase/functions/process-pending/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

// Initialize Supabase client with Service Role Key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') });

// How many pending records to process per run (override via env PROCESS_BATCH_SIZE)
const BATCH_SIZE = Number(Deno.env.get('PROCESS_BATCH_SIZE') ?? '30');
console.log('[process-pending] BATCH_SIZE =', BATCH_SIZE);

// Start the Edge function using native Deno server
Deno.serve(async (_req) => {
  // Fetch records with status 'pending' or 'processing'
  const { data: pending, error: fetchErr } = await supabase
    .from('inventaire')
    .select('id, photo_url, status')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (fetchErr) return new Response(fetchErr.message, { status: 500 });
  console.log('[process-pending] pending fetched =', pending ? pending.length : 0);
  if (pending && pending.length) {
    console.log('[process-pending] first ids =', pending.slice(0, 10).map(r => r.id));
  }

  let processedCount = 0;

  const list = pending ?? [];
  for (const rec of list) {
    try {
      // Claim only if still pending; otherwise continue processing
      if (rec.status === 'pending') {
        const { data: claimData, error: claimErr } = await supabase
          .from('inventaire')
          .update({ status: 'processing' })
          .eq('id', rec.id)
          .eq('status', 'pending')
          .select('id');
        if (claimErr) {
          console.error('[process-pending] claim error for id', rec.id, claimErr);
          continue;
        }
        if (!claimData || claimData.length === 0) {
          console.log('[process-pending] already claimed, skip id =', rec.id);
          continue;
        }
        console.log('[process-pending] claimed id =', rec.id);
      } else {
        console.log('[process-pending] resume processing id =', rec.id);
      }

      // Download the image
      const response = await fetch(rec.photo_url);
      if (!response.ok) {
        await supabase
          .from('inventaire')
          .update({ identifiant: 'NO_DETECTION', status: 'done' })
          .eq('id', rec.id);
        processedCount++;
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      const b64 = encodeBase64(bytes);

      // Perform OCR via Gemini Flash with detailed prompt
      const ocrStartTime = Date.now();
      const ocr = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { 
          parts: [
            { inlineData: { data: b64, mimeType: contentType } },
            { text: 'Extrait uniquement la plaque d\'immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.' }
          ]
        },
        config: {
          systemInstruction: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d\'immatriculation et VIN.'
        }
      });
      const ocrDuration = Date.now() - ocrStartTime;
      console.log(`[process-pending] OCR completed for id ${rec.id} in ${ocrDuration}ms`);
      const identifiant = (ocr.text || '').trim() || 'NO_DETECTION';
      console.log(`[process-pending] OCR result for id ${rec.id}: "${identifiant}" (${ocrDuration}ms)`);

      // Update the record to 'done'
      await supabase
        .from('inventaire')
        .update({ identifiant, status: 'done' })
        .eq('id', rec.id);

      console.log(`[process-pending] Record ${rec.id} updated to done with identifiant: ${identifiant}`);
      processedCount++;
    } catch (e) {
      console.error('[process-pending] error id =', rec.id, e?.message || e);
    }
  }

  console.log('[process-pending] processedCount =', processedCount);
  return new Response(JSON.stringify({ processedCount }), {
    headers: { 'Content-Type': 'application/json' }
  });
});