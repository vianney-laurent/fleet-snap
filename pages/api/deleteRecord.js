// ✅ pages/api/deleteRecord.js — version Supabase

import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { recordId } = req.body;

  if (!recordId) {
    logger.warn('Tentative suppression sans recordId');
    return res.status(400).json({ error: 'recordId manquant' });
  }

  logger.info('Tentative suppression enregistrement', { recordId });

  try {
    const { error } = await supabase
      .from('inventaire')
      .delete()
      .eq('id', recordId);

    if (error) {
      logger.error('Erreur suppression Supabase', error, { recordId });
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }

    logger.info('Enregistrement supprimé avec succès', { recordId });
    return res.status(200).json({ message: 'Enregistrement supprimé' });
  } catch (err) {
    logger.error('Erreur serveur suppression', err, { recordId });
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withApiLogging(handler);