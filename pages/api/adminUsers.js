// /pages/api/adminUsers.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            let allUsers = [];
            let page = 1;
            let hasMore = true;
            const perPage = 1000; // Limite maximale par page

            while (hasMore) {
                const { data, error } = await supabaseAdmin.auth.admin.listUsers({
                    page: page,
                    perPage: perPage
                });

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                allUsers = allUsers.concat(data.users);
                
                // Si on a moins d'utilisateurs que la limite, on a tout récupéré
                hasMore = data.users.length === perPage;
                page++;
            }

            return res.status(200).json({ 
                users: allUsers,
                total: allUsers.length 
            });
        } catch (error) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
        }
    }

    res.status(405).json({ error: 'Méthode non autorisée' });
}