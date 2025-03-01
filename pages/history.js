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
    const [editingRecord, setEditingRecord] = useState(null);
    const [newPlateVin, setNewPlateVin] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [enlargedPhoto, setEnlargedPhoto] = useState(null); // Pour afficher la photo en grand

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
                if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

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

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setNewPlateVin(record.fields['Plaque / VIN']);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingRecord(null);
        setNewPlateVin('');
    };

    const handleSave = async () => {
        const response = await fetch(`/api/updateRecord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordId: editingRecord.id, newPlateVin })
        });

        if (response.ok) {
            const updatedRecords = records.map((record) =>
                record.id === editingRecord.id
                    ? { ...record, fields: { ...record.fields, 'Plaque / VIN': newPlateVin } }
                    : record
            );
            setRecords(updatedRecords);
            handleCloseModal();
        } else {
            alert('Erreur lors de la mise à jour');
        }
    };

    const handleDeleteClick = (record) => {
        setRecordToDelete(record);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        const response = await fetch(`/api/deleteRecord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordId: recordToDelete.id })
        });

        if (response.ok) {
            setRecords(records.filter(record => record.id !== recordToDelete.id));
            setShowDeleteModal(false);
            setRecordToDelete(null);
        } else {
            alert('Erreur lors de la suppression');
        }
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setRecordToDelete(null);
    };

    const handlePhotoClick = (photoUrl) => {
        setEnlargedPhoto(photoUrl);
    };

    const handleClosePhotoModal = () => {
        setEnlargedPhoto(null);
    };

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
                        {records.map((record) => {
                            const photoUrl = record.fields['Photo']?.[0]?.url;

                            return (
                                <div
                                    key={record.id}
                                    className="p-4 bg-white shadow rounded-lg flex items-center space-x-4"
                                >
                                    {/* Miniature cliquable */}
                                    {photoUrl ? (
                                        <img
                                            src={photoUrl}
                                            alt="Photo véhicule"
                                            className="w-16 h-16 object-cover rounded cursor-pointer"
                                            onClick={() => handlePhotoClick(photoUrl)}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-500">
                                            ❓
                                        </div>
                                    )}

                                    {/* Infos */}
                                    <div className="flex-1">
                                        <p className="font-bold">{record.fields['Plaque / VIN']}</p>
                                        <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                                        <p className="text-sm">{record.fields['Collaborateur']}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleEditClick(record)}
                                            className="text-gray-500 hover:text-gray-700"
                                            aria-label="Modifier"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(record)}
                                            className="text-red-500 hover:text-red-700"
                                            aria-label="Supprimer"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal pour afficher la photo en grand */}
            {enlargedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                    <div className="relative bg-white rounded-lg overflow-hidden">
                        <button
                            onClick={handleClosePhotoModal}
                            className="absolute top-2 right-2 bg-gray-700 text-white rounded-full p-1"
                        >
                            ✕
                        </button>
                        <img src={enlargedPhoto} alt="Photo en grand" className="max-w-full max-h-screen object-contain" />
                        <div className="p-2 text-center">
                            <button
                                onClick={handleClosePhotoModal}
                                className="mt-2 bg-gray-500 text-white px-4 py-2 rounded"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}