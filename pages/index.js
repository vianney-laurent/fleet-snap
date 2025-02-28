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
    const router = useRouter();

    async function handleLogin() {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Identifiants incorrects');
        } else {
            router.push('/inventory');
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Connexion Fleet Snap</h2>
                <input className="border p-2 w-full mb-4" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="border p-2 w-full mb-4" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button onClick={handleLogin} className="w-full bg-blue-500 text-white p-2">Se connecter</button>
            </div>
        </div>
    );
}