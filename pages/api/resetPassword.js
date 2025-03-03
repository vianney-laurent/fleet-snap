// pages/api/resetPassword.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Email de réinitialisation envoyé avec succès' });
}