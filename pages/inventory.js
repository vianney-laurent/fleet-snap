import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';  // Le Layout contient déjà le Header

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Inventory() {
    const [photo, setPhoto] = useState(null);
    const [comment, setComment] = useState('');
    const [showModal, setShowModal] = useState(false);
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
        if (!user) {
            alert('Utilisateur non chargé, veuillez vous reconnecter.');
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('photo', photo);
        formData.append('email', user.email);
        formData.append('name', user.user_metadata?.name || 'Nom inconnu');
        formData.append('concession', user.user_metadata?.concession || 'Concession inconnue');
        formData.append('comment', comment);
        const response = await fetch('https://hook.eu2.make.com/ykv6mtd6snp2ypz4g8t4jtqxw3vrujth', {
            method: 'POST',
            body: formData,
        });
        setLoading(false);
        setShowModal(false);
        if (response.ok) {
            alert('Photo envoyée avec succès !');
            setPhoto(null);
            setComment('');
        } else {
            alert('Erreur lors de l’envoi.');
        }
    };

    return (
        <Layout>
            <div className="flex flex-col items-center min-h-screen bg-gray-100 py-4">
                <div className="w-full max-w-md mt-4">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-full max-h-40 object-contain"
                    />
                </div>

                <div className="bg-white shadow-lg rounded-lg p-6 mt-4 w-full max-w-md">
                    <h1 className="text-xl font-bold mb-2">Inventaire voitures</h1>
                    <p className="text-gray-600 text-sm mb-2">
                        Merci de prendre en photo la plaque d'immatriculation ou le VIN du véhicule.
                    </p>
                    <p className="text-gray-500 text-xs mb-4">
                        Attention à limiter les reflets pour le traitement automatique de la photo.
                    </p>

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
                            <span className="text-5xl mb-2">📸</span>
                            {photo ? (
                                <span className="text-sm">{photo.name}</span>
                            ) : (
                                <span className="text-sm">Déposer une photo</span>
                            )}
                        </label>
                    </div>

                    {/* Boutons d'envoi */}
                    <div className="mt-6 flex gap-4">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                            {loading ? 'Envoi...' : 'Envoyer sans commentaire'}
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                            {loading ? 'Envoi...' : 'Envoyer avec commentaire'}
                        </button>
                    </div>
                </div>

                {/* Modal pour le commentaire */}
                {showModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                            <h2 className="text-lg font-semibold mb-4">Ajouter un commentaire</h2>
                            <textarea
                                rows={4}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 mb-4"
                                placeholder="Entrez votre commentaire ici..."
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                    Fermer
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Valider et envoyer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}