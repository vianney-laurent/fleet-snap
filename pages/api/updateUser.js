// pages/api/updateUser.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { userId, fullName, concession } = req.body;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { name: fullName, concession }
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
}