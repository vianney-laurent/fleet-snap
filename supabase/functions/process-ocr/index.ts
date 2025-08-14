import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Variables d\'environnement manquantes')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('🚀 Démarrage traitement OCR')

    // Récupérer les records pending
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('inventaire')
      .select('id, photo_url, zone, concession, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Limite raisonnable
    
    if (fetchError) {
      throw fetchError
    }

    console.log(`📋 ${pendingRecords.length} records pending trouvés`)

    if (pendingRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          processedCount: 0,
          message: 'Aucun enregistrement en attente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let errorCount = 0

    // Traiter chaque record séquentiellement
    for (let i = 0; i < pendingRecords.length; i++) {
      const record = pendingRecords[i]
      
      try {
        console.log(`🔄 Traitement ${i + 1}/${pendingRecords.length}: ${record.id}`)

        // Marquer comme processing
        const { error: claimError } = await supabase
          .from('inventaire')
          .update({ status: 'processing' })
          .eq('id', record.id)
          .eq('status', 'pending')

        if (claimError) {
          console.warn(`⚠️ Record déjà traité: ${record.id}`)
          continue
        }

        // Télécharger l'image
        const imgRes = await fetch(record.photo_url)
        if (!imgRes.ok) {
          throw new Error(`Téléchargement échoué: ${imgRes.status}`)
        }

        const arrayBuffer = await imgRes.arrayBuffer()
        const imageSize = arrayBuffer.byteLength
        
        console.log(`📊 Image téléchargée: ${Math.round(imageSize/1024)}KB`)

        // Limite de taille
        if (imageSize > 8 * 1024 * 1024) { // 8MB max
          throw new Error('Image trop grande')
        }

        // Conversion base64 (méthode fiable)
        const bytes = new Uint8Array(arrayBuffer)
        let binaryString = ''
        for (let j = 0; j < bytes.length; j++) {
          binaryString += String.fromCharCode(bytes[j])
        }
        const base64Image = btoa(binaryString)

        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        console.log(`✅ Base64 prêt: ${Math.round(base64Image.length/1024)}KB, ${mimeType}`)

        // Appel Gemini 2.0 Flash
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Image } },
                { text: 'Extrait uniquement la plaque d\'immatriculation ou le VIN visible dans cette image. Si aucune détection, réponds NO_DETECTION.' }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 50
            }
          })
        })

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error(`❌ Erreur Gemini: ${geminiResponse.status} - ${errorText}`)
          throw new Error(`Gemini error: ${geminiResponse.status}`)
        }

        const result = await geminiResponse.json()
        const identifiant = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NO_DETECTION'

        // Mettre à jour le record
        await supabase
          .from('inventaire')
          .update({ identifiant, status: 'done' })
          .eq('id', record.id)

        processedCount++
        console.log(`✅ ${i + 1}/${pendingRecords.length} terminé: "${identifiant}"`)

      } catch (error) {
        console.error(`❌ Erreur record ${i + 1}/${pendingRecords.length}:`, error.message)
        
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
        message: `${processedCount} photo(s) traitée(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur Edge Function:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})