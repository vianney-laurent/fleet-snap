import { useState } from 'react';
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
    const router = useRouter();

    const handleLogin = async () => {
        setError('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setError('Email ou mot de passe incorrect.');
            return;
        }

        // Stocker les metadata dans le localStorage pour les récupérer dans d'autres pages si besoin
        const user = data.user;
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.user_metadata?.name || '');
        localStorage.setItem('userConcession', user.user_metadata?.concession || '');

        // Redirige vers l'inventaire
        router.push('/inventory');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Connexion</h1>
                
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
            </div>
        </div>
    );
}