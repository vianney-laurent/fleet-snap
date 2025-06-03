// supabase/functions/exportInventory/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { email, concession, startDate, endDate } = await req.json()

  const filters = supabase
    .from('inventaire')
    .select('created_at, concession, identifiant, commentaire, collaborateur, photo_url')
    .eq('concession', concession)
    .order('created_at', { ascending: true })

  if (startDate) filters.gte('created_at', startDate)
  if (endDate) filters.lte('created_at', endDate)

  const { data, error } = await filters

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const csvRows = [
    ['Date', 'Concession', 'Identifiant', 'Commentaire', 'Collaborateur', 'photo_url'],
    ...data.map(row => [
      new Date(row.created_at).toISOString().split('T')[0],
      row.concession,
      row.identifiant,
      row.commentaire || '',
      row.collaborateur,
      row.photo_url || ''
    ])
  ]

  const csvContent = csvRows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')

  const filename = `inventaire_${concession}_${new Date().toISOString().split('T')[0]}.csv`

  const { error: mailError } = await supabase.functions.sendEmail({
    to: email,
    subject: `📦 Export de l'inventaire — ${concession}`,
    html: `<p>Voici le fichier CSV exporté depuis Fleet Snap.</p>`,
    attachments: [{
      content: btoa(csvContent), // base64
      filename,
      type: 'text/csv',
      disposition: 'attachment'
    }]
  })

  if (mailError) {
    return new Response(JSON.stringify({ error: mailError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }))
})