import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  try {
    const { data, error } = await supabase
      .from('concessions')
      .select('id, name')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ concessions: data });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}