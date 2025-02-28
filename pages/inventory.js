import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InventoryPage() {
    const [photo, setPhoto] = useState(null);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setUser(data.user);
            else router.push('/');
        }
        fetchUser();
    }, []);

    async function handleSubmit() {
        if (!photo) return alert('Ajoutez une photo');

        const formData = new FormData();
        formData.append('photo', photo);
        formData.append('email', user.email);

        const response = await fetch('https://hook.eu2.make.com/ykv6mtd6snp2ypz4g8t4jtqxw3vrujth', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            alert('Photo envoyée');
            router.push('/history');
        } else {
            alert('Erreur lors de l’envoi');
        }
    }

    return (
        <Layout>
            <h1 className="text-xl font-bold mb-4">Inventaire - {user?.email}</h1>
            <input type="file" onChange={(e) => setPhoto(e.target.files[0])} className="mb-4" />
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2">Envoyer la voiture</button>
        </Layout>
    );
}