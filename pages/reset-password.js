import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [validSession, setValidSession] = useState(false);
    const router = useRouter();

    // Vérifier si l'utilisateur a une session valide pour reset
    useEffect(() => {
        const checkSession = async () => {
            try {
                console.log('Paramètres URL reçus:', router.query);
                
                // Vérifier si on a des paramètres de reset dans l'URL
                const { access_token, refresh_token, type, token, error: urlError } = router.query;
                
                // Gérer les erreurs dans l'URL
                if (urlError) {
                    console.error('Erreur dans URL:', urlError);
                    setError('Erreur dans le lien de réinitialisation.');
                    setLoading(false);
                    return;
                }
                
                // Essayer avec access_token et refresh_token (format standard)
                if (access_token && refresh_token && type === 'recovery') {
                    console.log('Tentative avec access_token/refresh_token');
                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token
                    });
                    
                    if (error) {
                        console.error('Erreur définition session:', error);
                        setError('Lien de réinitialisation invalide ou expiré.');
                        setLoading(false);
                        return;
                    }
                    
                    console.log('Session définie avec succès');
                    setValidSession(true);
                } 
                // Essayer avec token simple (format alternatif)
                else if (token) {
                    console.log('Tentative avec token simple');
                    // Pour un token simple, on essaie de vérifier directement la session
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        console.log('Session existante trouvée');
                        setValidSession(true);
                    } else {
                        setError('Token de réinitialisation invalide.');
                    }
                }
                // Vérifier si on a déjà une session active (cas où l'utilisateur revient)
                else {
                    console.log('Vérification session existante');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        console.log('Session active trouvée');
                        setValidSession(true);
                    } else {
                        console.log('Aucune session trouvée');
                        setError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
                    }
                }
            } catch (err) {
                console.error('Erreur vérification session:', err);
                setError('Erreur lors de la vérification du lien.');
            }
            setLoading(false);
        };

        if (router.isReady) {
            checkSession();
        }
    }, [router.isReady, router.query]);

    const handlePasswordReset = async () => {
        if (!newPassword || newPassword.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setError('');
        setSuccess('');

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setError(`Erreur : ${error.message}`);
            } else {
                setSuccess('Mot de passe mis à jour avec succès ! Vous allez être redirigé.');
                setTimeout(() => {
                    router.push('/');
                }, 3000);
            }
        } catch (err) {
            setError('Erreur lors de la mise à jour du mot de passe.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md text-center">
                    <p>Vérification du lien de réinitialisation...</p>
                </div>
            </div>
        );
    }

    if (!validSession) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-6 text-center">Lien invalide</h1>
                    {error && (
                        <p className="text-red-600 text-sm mb-4">{error}</p>
                    )}
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Réinitialisation du mot de passe</h1>

                {error && (
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                )}
                {success && (
                    <p className="text-green-600 text-sm mb-4">{success}</p>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Minimum 6 caractères"
                    />
                </div>

                <button
                    onClick={handlePasswordReset}
                    disabled={!newPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded"
                >
                    Mettre à jour le mot de passe
                </button>
            </div>
        </div>
    );
}