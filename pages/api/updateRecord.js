// ✅ pages/api/updateRecord.js — version Supabase avec identifiant + commentaire

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { recordId, newPlateVin, newCommentaire } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId manquant' });
  }

  const updateFields = {};
  if (newPlateVin !== undefined) updateFields.identifiant = newPlateVin;
  if (newCommentaire !== undefined) updateFields.commentaire = newCommentaire;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
  }

  try {
    const { error } = await supabase
      .from('inventaire')
      .update(updateFields)
      .eq('id', recordId);

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }

    return res.status(200).json({ message: 'Mise à jour réussie' });
  } catch (err) {
    console.error('Erreur serveur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}