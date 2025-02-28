import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Clé de service à ajouter dans .env.local
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { email, password, concession } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
            concession
        }
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Utilisateur créé avec succès', data });
}