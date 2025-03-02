import { useState } from 'react';
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
    const router = useRouter();

    const handlePasswordReset = async () => {
        setError('');
        setSuccess('');

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setError(`Erreur : ${error.message}`);
        } else {
            setSuccess('Mot de passe mis à jour avec succès ! Vous allez être redirigé.');
            setTimeout(() => {
                router.push('/');
            }, 3000);
        }
    };

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
                    />
                </div>

                <button
                    onClick={handlePasswordReset}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                >
                    Mettre à jour le mot de passe
                </button>
            </div>
        </div>
    );
}