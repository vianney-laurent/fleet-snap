import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Profile() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [concession, setConcession] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
                setUser(userData.user);
                const { data } = await supabase.from('users').select('*').eq('email', userData.user.email).single();
                if (data) {
                    setName(data.name);
                    setConcession(data.concession);
                }
            } else {
                router.push('/');
            }
        }
        fetchUser();
    }, []);

    async function updateProfile() {
        const response = await fetch('/api/updateProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name, concession })
        });
        if (response.ok) {
            alert('Profil mis à jour !');
        } else {
            alert('Erreur lors de la mise à jour');
        }
    }

    async function updatePassword() {
        const response = await fetch('/api/updatePassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, newPassword })
        });
        if (response.ok) {
            alert('Mot de passe mis à jour');
        } else {
            alert('Erreur lors du changement de mot de passe');
        }
    }

    return (
        <Layout>
            <div className="p-6">
                <h1 className="text-xl font-bold mb-4">Profil utilisateur</h1>
                <div className="space-y-4">
                    <div>
                        <label className="block font-medium mb-1">Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border p-2 w-full"
                        />
                    </div>
                    <div>
                        <label className="block font-medium mb-1">Concession</label>
                        <input
                            type="text"
                            value={concession}
                            onChange={(e) => setConcession(e.target.value)}
                            className="border p-2 w-full"
                        />
                    </div>
                    <button
                        onClick={updateProfile}
                        className="bg-blue-500 text-white p-2 w-full"
                    >
                        Mettre à jour le profil
                    </button>

                    <div className="mt-6">
                        <label className="block font-medium mb-1">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border p-2 w-full"
                        />
                    </div>
                    <button
                        onClick={updatePassword}
                        className="bg-blue-500 text-white p-2 w-full"
                    >
                        Changer le mot de passe
                    </button>
                </div>
            </div>
        </Layout>
    );
}