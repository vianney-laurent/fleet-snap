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
                            <div
                                key={record.id}
                                className="p-4 bg-white shadow rounded-lg flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-bold">{record.fields['Plaque / VIN']}</p>
                                    <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                                    <p className="text-sm">{record.fields['Collaborateur']}</p>
                                </div>
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
                        ))}
                    </div>
                )}
            </div>

            {/* Modal pour modifier */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Modifier la plaque ou le VIN</h2>
                        <input
                            type="text"
                            value={newPlateVin}
                            onChange={(e) => setNewPlateVin(e.target.value)}
                            className="w-full border p-2 rounded mb-4"
                        />
                        <div className="flex justify-end space-x-2">
                            <button className="bg-gray-300 px-4 py-2 rounded" onClick={handleCloseModal}>
                                Annuler
                            </button>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSave}>
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pour confirmer la suppression */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Confirmer la suppression</h2>
                        <p>Voulez-vous vraiment supprimer cet enregistrement ?</p>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button className="bg-gray-300 px-4 py-2 rounded" onClick={handleCloseDeleteModal}>
                                Annuler
                            </button>
                            <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDeleteConfirm}>
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}