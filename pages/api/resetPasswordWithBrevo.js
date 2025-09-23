// pages/api/resetPasswordWithBrevo.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sendEmailWithBrevo = async (email, resetLink) => {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: {
                    name: "FleetSnap",
                    email: process.env.BREVO_SENDER_EMAIL
                },
                to: [{
                    email: email
                }],
                subject: "Réinitialisation de votre mot de passe FleetSnap",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Réinitialisation de votre mot de passe</h2>
                        <p>Bonjour,</p>
                        <p>Vous avez demandé la réinitialisation de votre mot de passe FleetSnap.</p>
                        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                        <p style="margin: 20px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Réinitialiser mon mot de passe
                            </a>
                        </p>
                        <p><strong>Ce lien expire dans 1 heure.</strong></p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                        </p>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur Brevo: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur envoi email Brevo:', error);
        throw error;
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email requis' });
    }

    try {
        console.log('Génération du lien de reset pour:', email);

        // Générer un lien de reset avec l'Admin API
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`
            }
        });

        if (linkError) {
            console.error('Erreur génération lien:', linkError);
            return res.status(500).json({
                error: 'Impossible de générer le lien de réinitialisation',
                details: linkError.message
            });
        }

        const resetLink = linkData.properties?.action_link;
        if (!resetLink) {
            return res.status(500).json({
                error: 'Lien de réinitialisation non généré'
            });
        }

        console.log('Lien généré, envoi de l\'email via Brevo...');

        // Envoyer l'email via Brevo
        await sendEmailWithBrevo(email, resetLink);

        console.log('Email de reset envoyé avec succès via Brevo pour:', email);
        return res.status(200).json({
            message: 'Email de réinitialisation envoyé avec succès',
            method: 'brevo'
        });

    } catch (err) {
        console.error('Erreur inattendue:', err);
        return res.status(500).json({
            error: 'Erreur lors de l\'envoi de l\'email',
            details: err.message
        });
    }
}