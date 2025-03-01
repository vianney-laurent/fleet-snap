import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function History() {
    const [records, setRecords] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUserAndData() {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.push('/');
                return;
            }

            setUser(userData.user);

            const userName = userData.user.user_metadata?.name || '';

            try {
                const response = await fetch(`/api/history?collaborateur=${encodeURIComponent(userName)}`);

                if (!response.ok) {
                    throw new Error(`Erreur API: ${response.status}`);
                }

                const { records } = await response.json();
                setRecords(records || []);
            } catch (err) {
                setError('Impossible de récupérer les données.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchUserAndData();
    }, [router]);

    if (loading) {
        return (
            <Layout>
                <div className="p-6">Chargement...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6">
                <h1 className="text-xl font-bold mb-4">Mon historique d'inventaire</h1>

                {error && <p className="text-red-500">{error}</p>}

                {records.length === 0 ? (
                    <p>Aucun inventaire trouvé</p>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => (
                            <div key={record.id} className="p-4 bg-white shadow rounded-lg">
                                <p className="font-bold">{record.fields['Plaque / VIN']}</p>
                                <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                                <p className="text-sm">{record.fields['Collaborateur']}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}