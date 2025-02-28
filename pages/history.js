import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/Layout';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HistoryPage() {
    const [records, setRecords] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        async function fetchUser() {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);

            if (data?.user) {
                const response = await fetch(`/api/history?email=${data.user.email}`);
                const data = await response.json();
                setRecords(data);
            }
        }
        fetchUser();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Historique de {user?.email}</h1>
            {records.length === 0 ? <p>Aucun inventaire trouvé</p> :
                records.map((record) => (
                    <div key={record.id} className="p-2 border-b">
                        <p>{record.fields['Date']}</p>
                        <img src={record.fields['Photo']} alt="Photo" className="w-24 h-24 object-cover" />
                        <p>{record.fields['Plaque / VIN']}</p>
                    </div>
                ))}
        </div>
    );
}