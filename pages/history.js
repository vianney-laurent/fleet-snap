import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';  // Le Layout inclut le Header global.

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function History() {
    const [records, setRecords] = useState([]);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data } = await supabase.auth.getUser();

            if (data?.user) {
                setUser(data.user);
                const response = await fetch(`/api/history`);
                const dataJson = await response.json();
                setRecords(dataJson);
            } else {
                router.push('/');
            }
        }

        fetchUser();
    }, []);

    return (
        <Layout>
            <div className="p-6">
                <h1 className="text-xl font-bold mb-4">Historique de {user?.email}</h1>
                
                {records.length === 0 ? (
                    <p>Aucun inventaire trouvé</p>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => (
                            <div key={record.id} className="p-4 bg-white shadow rounded-lg flex items-center space-x-4">
                                <img
                                    src={record.fields['Photo']}
                                    alt="Photo"
                                    className="w-24 h-24 object-cover rounded"
                                />
                                <div>
                                    <p className="font-medium">{record.fields['Plaque / VIN']}</p>
                                    <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}