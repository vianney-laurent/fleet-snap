// /pages/api/adminUsers.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ users: data.users });
    }

    res.status(405).json({ error: 'Méthode non autorisée' });
}