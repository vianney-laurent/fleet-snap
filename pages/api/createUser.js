import { createClient } from '@supabase/supabase-js';

// Création du client Supabase en mode "admin" avec la clé Service Role
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Clé qui doit être uniquement dans .env.local côté serveur
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { email, password, name, concession } = req.body;

    if (!email || !password || !name || !concession) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    try {
        // Création de l'utilisateur avec metadata personnalisées
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: {
                name,
                concession
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ message: 'Utilisateur créé avec succès', data });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
}