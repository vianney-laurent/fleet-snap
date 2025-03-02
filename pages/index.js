import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const { reason } = router.query;
        if (reason === 'session-expired') {
            setInfoMessage("Votre session a expiré. Merci de vous reconnecter pour continuer.");
        }
    }, [router.query]);

    const handleLogin = async () => {
        setError('');
        setInfoMessage('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setError('Email ou mot de passe incorrect.');
            return;
        }

        const user = data.user;
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.user_metadata?.name || '');
        localStorage.setItem('userConcession', user.user_metadata?.concession || '');

        router.push('/inventory');
    };

    const handleForgotPassword = async () => {
        setShowForgotPasswordModal(true);
    };

    const sendPasswordReset = async () => {
        setForgotError('');
        setForgotSuccess('');

        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
            setForgotError(`Erreur : ${error.message}`);
        } else {
            setForgotSuccess('Un email de réinitialisation de mot de passe vous a été envoyé.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>

                {infoMessage && (
                    <p className="text-blue-600 text-sm mb-4">{infoMessage}</p>
                )}

                {error && (
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                    />
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                >
                    Se connecter
                </button>

                <div className="text-center mt-4">
                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Mot de passe oublié ?
                    </button>
                </div>
            </div>

            {/* Modale mot de passe oublié */}
            {showForgotPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Réinitialisation du mot de passe</h2>
                        <p className="text-sm mb-4">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                        <input
                            type="email"
                            placeholder="Votre email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-4"
                        />
                        {forgotError && <p className="text-red-500 text-sm">{forgotError}</p>}
                        {forgotSuccess && <p className="text-green-500 text-sm">{forgotSuccess}</p>}
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowForgotPasswordModal(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={sendPasswordReset}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}