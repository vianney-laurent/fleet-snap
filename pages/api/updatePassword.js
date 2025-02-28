import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    const { email, newPassword } = req.body;

    const { data: userData } = await supabase.auth.admin.listUsers({ email });

    if (!userData || userData.users.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const userId = userData.users[0].id;

    const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Mot de passe mis à jour' });
}