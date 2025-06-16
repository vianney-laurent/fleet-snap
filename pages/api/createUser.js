import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Pour debugger :
  console.log('Body reçu:', req.body);

  const { email, password, fullName, concession } = req.body || {};

  if (!email || !password || !fullName || !concession) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {name: fullName, concession }
    });

    if (error) {
      console.log('Erreur Supabase:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Utilisateur créé avec succès', data });
  } catch (err) {
    console.log('Erreur serveur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}