import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../lib/logger';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    const { email, concession, startDate, endDate } = req.body;

    logger.info('Demande export inventaire', { 
      email, 
      concession, 
      startDate, 
      endDate 
    });

    // Ajout de zone au select
    let query = supabase
      .from('inventaire')
      .select('created_at, concession, identifiant, commentaire, collaborateur, zone, photo_url');

    // Ajout des filtres dynamiquement
    if (concession) query = query.eq('concession', concession);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    // Exécution de la requête
    const { data, error } = await query;

    if (error) {
      logger.error('Erreur requête export Supabase', error, { 
        email, 
        concession, 
        startDate, 
        endDate 
      });
      return res.status(500).json({ error: error.message });
    }

    logger.info('Données récupérées pour export', { 
      email, 
      concession, 
      recordCount: data?.length || 0 
    });

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
    // Générer le contenu CSV avec BOM UTF-8 pour Excel
    const bom = '\uFEFF';
    const csvBody = csvRows
      .map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const csvContent = bom + csvBody;
    
    logger.info('CSV généré', { 
      email, 
      concession, 
      csvSize: csvContent.length,
      recordCount: data?.length || 0
    });

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

    if (!brevoResponse.ok) {
      logger.error('Erreur envoi email Brevo', null, { 
        email, 
        concession, 
        brevoResponse: brevoRespText,
        statusCode: brevoResponse.status
      });
      return res.status(500).json({ error: `Erreur envoi mail: ${brevoRespText}` });
    }

    const totalDuration = Date.now() - startTime;
    logger.admin.export(email, concession, { startDate, endDate }, data?.length || 0, {
      duration: totalDuration,
      csvSize: csvContent.length,
      success: true
    });

    return res.status(200).json({ success: true });

  } catch (e) {
    const totalDuration = Date.now() - startTime;
    logger.error('Erreur API export', e, { 
      email, 
      concession, 
      duration: totalDuration 
    });
    return res.status(500).json({ error: e.message });
  }
}

export default withApiLogging(handler);