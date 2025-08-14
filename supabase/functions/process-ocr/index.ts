import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 Démarrage traitement OCR Edge Function')

    // 1. Fetch pending records (limité à 20 pour éviter timeout)
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('inventaire')
      .select('id, photo_url, zone, concession, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20)
    
    if (fetchError) {
      console.error('Erreur récupération records pending:', fetchError)
      throw fetchError
    }

    console.log(`📋 ${pendingRecords.length} records pending trouvés`)

    if (pendingRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          processedCount: 0,
          message: 'Aucun enregistrement en attente',
          source: 'edge-function'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    let processedCount = 0
    let errorCount = 0

    // 2. Traiter chaque record
    for (const record of pendingRecords) {
      try {
        console.log(`🔄 Traitement record ${record.id}`)

        // Marquer comme en cours de traitement
        const { error: claimError } = await supabase
          .from('inventaire')
          .update({ status: 'processing' })
          .eq('id', record.id)
          .eq('status', 'pending') // Condition pour éviter les doublons
        
        if (claimError) {
          console.warn(`⚠️ Impossible de réclamer le record ${record.id}:`, claimError.message)
          continue
        }

        // Download image
        const imgRes = await fetch(record.photo_url)
        if (!imgRes.ok) {
          console.warn(`❌ Échec téléchargement image ${record.id}: ${imgRes.status}`)
          
          await supabase
            .from('inventaire')
            .update({ status: 'error', identifiant: 'DOWNLOAD_ERROR' })
            .eq('id', record.id)
          
          errorCount++
          continue
        }
        
        const arrayBuffer = await imgRes.arrayBuffer()
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        
        // Détection du mimeType
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg'

        console.log(`📷 Image téléchargée ${record.id}: ${mimeType}, ${arrayBuffer.byteLength} bytes`)

        // OCR via Gemini Flash
        const ocrStartTime = Date.now()
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Image } },
                { text: 'Extrait uniquement la plaque d\'immatriculation ou le VIN (17 caractères alphanumériques, il ne peut pas y avoir de lettres I, O, Q. Les O sont forcément des 0). Si aucune détection, renvoyez NO_DETECTION.' }
              ]
            }],
            systemInstruction: {
              parts: [{ text: 'Vous êtes un OCR automobile ultra-spécialisé pour extraire plaques d\'immatriculation et VIN.' }]
            }
          })
        })

        const ocrDuration = Date.now() - ocrStartTime

        if (!geminiResponse.ok) {
          console.error(`❌ Erreur Gemini ${record.id}: ${geminiResponse.status}`)
          
          await supabase
            .from('inventaire')
            .update({ status: 'error', identifiant: 'OCR_ERROR' })
            .eq('id', record.id)
          
          errorCount++
          continue
        }

        const geminiResult = await geminiResponse.json()
        const identifiant = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NO_DETECTION'

        console.log(`✅ OCR terminé ${record.id}: "${identifiant}" (${ocrDuration}ms)`)

        // Update record to done
        const { error: updateError } = await supabase
          .from('inventaire')
          .update({ identifiant, status: 'done' })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour record ${record.id}:`, updateError)
          errorCount++
          continue
        }

        processedCount++

      } catch (error) {
        console.error(`❌ Erreur traitement record ${record.id}:`, error)
        
        // Marquer comme erreur
        await supabase
          .from('inventaire')
          .update({ status: 'error', identifiant: 'PROCESSING_ERROR' })
          .eq('id', record.id)
        
        errorCount++
      }
    }

    console.log(`🎯 Traitement terminé: ${processedCount} succès, ${errorCount} erreurs`)

    return new Response(
      JSON.stringify({ 
        processedCount,
        errorCount,
        totalRecords: pendingRecords.length,
        source: 'edge-function',
        message: `${processedCount} photo(s) traitée(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erreur Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        source: 'edge-function'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})