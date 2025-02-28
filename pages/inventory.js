import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Header from '../components/Header';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InventoryPage() {
    const [photo, setPhoto] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
                setUser(data.user);
            } else {
                router.push('/');
            }
        }
        fetchUser();
    }, []);

    const handleSubmit = async () => {
        if (!photo) {
            alert('Veuillez ajouter une photo.');
            return;
        }
        setLoading(true);

        const formData = new FormData();
        formData.append('photo', photo);
        formData.append('email', user.email);
        formData.append('concession', user.user_metadata?.concession || 'Non renseignée');

        const response = await fetch('https://hook.eu2.make.com/ykv6mtd6snp2ypz4g8t4jtqxw3vrujth', {
            method: 'POST',
            body: formData,
        });

        setLoading(false);

        if (response.ok) {
            alert('Photo envoyée avec succès !');
            router.push('/history');
        } else {
            alert('Erreur lors de l’envoi.');
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100 py-4">
            <Header />

            {/* En-tête avec logo responsive */}
            <div className="w-full max-w-md mt-4">
                <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full max-h-40 object-contain" // max-h-40 limite la hauteur, object-contain conserve les proportions
                />
            </div>

            {/* Carte contenant le formulaire */}
            <div className="bg-white shadow-lg rounded-lg p-6 mt-4 w-full max-w-md">
                <h1 className="text-xl font-bold mb-2">Inventaire voitures</h1>
                <p className="text-gray-600 text-sm mb-2">
                    Merci de prendre en photo la plaque d'immatriculation ou le VIN du véhicule.
                </p>
                <p className="text-gray-500 text-xs mb-4">
                    Attention à limiter les reflets pour le traitement automatique de la photo.
                </p>

                {/* Upload photo */}
                <label className="block text-sm font-medium mb-2">Photo *</label>
                <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="photoInput"
                        onChange={(e) => setPhoto(e.target.files[0])}
                    />
                    <label htmlFor="photoInput" className="flex flex-col items-center cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16l3 3m0 0l3-3m-3 3V10a4 4 0 014-4h12M16 3l3 3m0 0l-3 3m3-3H10a4 4 0 00-4 4v10" />
                        </svg>
                        {photo ? (
                            <span className="text-sm">{photo.name}</span>
                        ) : (
                            <span className="text-sm">Déposer une photo</span>
                        )}
                    </label>
                </div>

                {/* Bouton envoyer */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <span>Envoi...</span>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Envoyer la voiture
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}