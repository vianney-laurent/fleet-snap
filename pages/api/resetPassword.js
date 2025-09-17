// pages/api/resetPassword.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email requis' });
    }

    try {
        // Méthode 1: Essayer avec resetPasswordForEmail
        console.log('Tentative d\'envoi d\'email de reset pour:', email);
        
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`
        });

        if (error) {
            console.error('Erreur avec resetPasswordForEmail:', error);
            
            // Méthode 2: Essayer de générer un lien de reset avec l'Admin API
            console.log('Tentative avec generateLink...');
            
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: email,
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`
                }
            });

            if (linkError) {
                console.error('Erreur avec generateLink:', linkError);
                return res.status(500).json({ 
                    error: 'Impossible d\'envoyer l\'email de réinitialisation',
                    details: linkError.message 
                });
            }

            console.log('Lien de reset généré:', linkData);
            
            // Si on arrive ici, on a un lien mais pas d'email automatique
            // On pourrait envoyer l'email manuellement avec un service comme Brevo
            return res.status(200).json({
                message: 'Lien de réinitialisation généré (email manuel requis)',
                resetLink: linkData.properties?.action_link,
                data: linkData
            });
        }

        console.log('Reset password envoyé avec succès pour:', email);
        return res.status(200).json({
            message: 'Email de réinitialisation envoyé avec succès',
            data
        });
    } catch (err) {
        console.error('Erreur inattendue:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}