import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    const { email, concession, startDate, endDate, collaborateur } = req.body;

    // Log des critères reçus (pour debug)
    console.log({ concession, startDate, endDate, collaborateur });

    // Ajout de zone au select
    let query = supabase
      .from('inventaire')
      .select('created_at, concession, identifiant, commentaire, collaborateur, zone, photo_url');

    // Ajout des filtres dynamiquement
    if (concession) query = query.eq('concession', concession);
    if (collaborateur) query = query.eq('collaborateur', collaborateur);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    // Exécution de la requête
    const { data, error } = await query;

    if (error) {
      console.log('Erreur Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Générer le CSV : ajout "Zone"
    const csvRows = [
      ['Date', 'Concession', 'Identifiant', 'Commentaire', 'Collaborateur', 'Zone', 'photo_url'],
      ...(data || []).map(row => [
        new Date(row.created_at).toISOString().split('T')[0],
        row.concession,
        row.identifiant,
        row.commentaire || '',
        row.collaborateur,
        row.zone || '',
        row.photo_url || ''
      ])
    ];
    const csvContent = csvRows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    console.log('CSV généré:', csvContent.substring(0, 200) + '...');

    // Envoi du mail via Brevo
    const filename = `inventaire_${concession}_${new Date().toISOString().split('T')[0]}.csv`;
    const brevoBody = {
      sender: { name: "Fleet Snap", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email }],
      subject: `📦 Export de l'inventaire — ${concession}`,
      htmlContent: `<p>Voici le fichier CSV exporté depuis Fleet Snap.</p>`,
      attachment: [{
        name: filename,
        content: Buffer.from(csvContent).toString('base64')
      }]
    };
    console.log('Payload Brevo:', brevoBody);

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(brevoBody)
    });

    const brevoRespText = await brevoResponse.text();
    console.log('Réponse Brevo:', brevoRespText);

    if (!brevoResponse.ok) {
      return res.status(500).json({ error: `Erreur envoi mail: ${brevoRespText}` });
    }

    return res.status(200).json({ success: true });

  } catch (e) {
    console.error('ERREUR API EXPORT:', e);
    return res.status(500).json({ error: e.message });
  }
}