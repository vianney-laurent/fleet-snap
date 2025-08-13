import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email, password, fullName, concession } = req.body || {};

  logger.info('Tentative création utilisateur', { email, fullName, concession });

  if (!email || !password || !fullName || !concession) {
    logger.warn('Création utilisateur - champs manquants', { email, fullName, concession });
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {name: fullName, concession },
      email_confirm: true
    });

    if (error) {
      logger.error('Erreur création utilisateur Supabase', error, { email, concession });
      return res.status(400).json({ error: error.message });
    }

    logger.admin.userCreated('admin', email, concession, { 
      userId: data.user.id,
      fullName 
    });

    return res.status(200).json({ message: 'Utilisateur créé avec succès', data });
  } catch (err) {
    logger.error('Erreur serveur création utilisateur', err, { email, concession });
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withApiLogging(handler);