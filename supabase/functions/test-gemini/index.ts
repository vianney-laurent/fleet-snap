import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY manquante')
    }
    
    console.log('🧪 Test simple de l\'API Gemini...')
    
    // Test simple avec du texte seulement
    const testPayload = {
      contents: [{
        parts: [
          { text: 'Dis simplement "TEST OK" pour confirmer que l\'API fonctionne.' }
        ]
      }]
    }
    
    console.log('📤 Envoi requête test à Gemini...')
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })
    
    console.log(`📥 Réponse Gemini: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur Gemini:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: `Gemini API Error: ${response.status}`,
          details: errorText,
          apiKeyPresent: !!geminiApiKey,
          apiKeyLength: geminiApiKey.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    const result = await response.json()
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Pas de réponse'
    
    console.log('✅ Test Gemini réussi:', textResponse)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        geminiResponse: textResponse,
        apiKeyPresent: true,
        apiKeyLength: geminiApiKey.length,
        message: 'API Gemini fonctionne correctement'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erreur test Gemini:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})