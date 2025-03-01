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
    const [enlargedPhoto, setEnlargedPhoto] = useState(null);

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
            setRecords(records.map((r) =>
                r.id === editingRecord.id ? { ...r, fields: { ...r.fields, 'Plaque / VIN': newPlateVin } } : r
            ));
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
            setRecords(records.filter(r => r.id !== recordToDelete.id));
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
        return <Layout><div className="p-6">Chargement...</div></Layout>;
    }

    return (
        <Layout>
            <div className="p-4 space-y-4">
                <h1 className="text-xl font-bold">Mon historique d'inventaire</h1>

                {error && <p className="text-red-500">{error}</p>}

                {records.map((record) => (
                    <div key={record.id} className="flex items-center space-x-4 bg-white shadow rounded-lg p-3 border border-gray-200">
                        <img
                            src={record.fields['Photo']?.[0]?.url || ''}
                            alt="Photo véhicule"
                            className="w-16 h-16 object-cover rounded cursor-pointer"
                            onClick={() => handlePhotoClick(record.fields['Photo']?.[0]?.url)}
                        />
                        <div className="flex-1">
                            <p className="font-bold">{record.fields['Plaque / VIN']}</p>
                            <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                            <p className="text-sm">{record.fields['Collaborateur']}</p>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <button onClick={() => handleEditClick(record)}>
                                ✏️
                            </button>
                            <button onClick={() => handleDeleteClick(record)}>
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}

                {/* Modal de modification */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center transition-opacity animate-fadeIn z-50">
                        <div className="bg-white p-6 rounded-lg">
                            <h2 className="text-xl font-bold">Modifier la plaque / VIN</h2>
                            <input
                                className="border p-2 w-full mt-4"
                                value={newPlateVin}
                                onChange={(e) => setNewPlateVin(e.target.value)}
                            />
                            <div className="mt-4 flex space-x-2">
                                <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-300 rounded">Annuler</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de suppression */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center transition-opacity animate-fadeIn z-50">
                        <div className="bg-white p-6 rounded-lg">
                            <h2 className="text-xl font-bold">Confirmer la suppression</h2>
                            <p>Voulez-vous vraiment supprimer cet enregistrement ?</p>
                            <div className="mt-4 flex space-x-2">
                                <button onClick={handleCloseDeleteModal} className="px-4 py-2 bg-gray-300 rounded">Annuler</button>
                                <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}