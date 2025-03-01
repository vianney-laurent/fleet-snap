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
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                setName(data.user.user_metadata?.name || '');
                setConcession(data.user.user_metadata?.concession || '');
            } else {
                router.push('/');
            }
        }
        fetchUser();
    }, []);

    async function updateProfile() {
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.updateUser({
            data: {
                name,
                concession
            }
        });

        if (error) {
            setMessage('Erreur lors de la mise à jour du profil : ' + error.message);
        } else {
            setMessage('Profil mis à jour avec succès !');
        }

        setLoading(false);
    }

    return (
        <Layout>
            <div className="p-6 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-4">Profil utilisateur</h1>

                {message && (
                    <div className={`p-2 mb-4 rounded ${message.includes('Erreur') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {message}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <input
                            type="text"
                            value={user?.email}
                            disabled
                            className="w-full p-2 border rounded bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Nom complet</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Concession</label>
                        <input
                            type="text"
                            value={concession}
                            onChange={(e) => setConcession(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <button
                        onClick={updateProfile}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
                    </button>
                </div>
            </div>
        </Layout>
    );
}