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
    console.log('🕐 Cron OCR déclenché')
    
    // Appeler l'Edge Function principale
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'cron',
        triggeredAt: new Date().toISOString()
      })
    })
    
    const result = await response.json()
    
    console.log('✅ Cron OCR terminé:', result)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        cronExecutedAt: new Date().toISOString(),
        ocrResult: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur cron OCR:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        cronExecutedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})