// pages/api/updateUser.js
import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../lib/logger';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { userId, fullName, concession } = req.body;

    logger.info('Tentative mise à jour utilisateur', { userId, fullName, concession });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { name: fullName, concession }
    });

    if (error) {
        logger.error('Erreur mise à jour utilisateur Supabase', error, { userId, fullName, concession });
        return res.status(500).json({ error: error.message });
    }

    logger.admin.userUpdated('admin', userId, { fullName, concession });

    return res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
}

export default withApiLogging(handler);