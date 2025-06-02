// ✅ pages/api/deleteRecord.js — version Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { recordId } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId manquant' });
  }

  try {
    const { error } = await supabase
      .from('inventaire')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }

    return res.status(200).json({ message: 'Enregistrement supprimé' });
  } catch (err) {
    console.error('Erreur serveur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}