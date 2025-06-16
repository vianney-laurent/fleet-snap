import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
  }
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Id manquant." });
    }
    const { error } = await supabase
      .from('concessions')
      .delete()
      .eq('id', id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    // Retourne la liste à jour (optionnel)
    const { data } = await supabase.from('concessions').select('id, name').order('name');
    return res.status(200).json({ concessions: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}