import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function History() {
  // États de gestion
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // États pour les dates avec deux datepickers séparés
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

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
        const queryParams = new URLSearchParams({
          collaborateur: userName,
          page: currentPage,
          limit: 10,
        });
        if (startDate)
          queryParams.append('startDate', startDate.toISOString().slice(0, 10));
        if (endDate)
          queryParams.append('endDate', endDate.toISOString().slice(0, 10));

        const response = await fetch(`/api/history?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const { records, totalPages } = await response.json();
        setRecords(records || []);
        setTotalPages(totalPages);
      } catch (err) {
        setError('Impossible de récupérer les données.');
      } finally {
        setLoading(false);
      }
    }
    fetchUserAndData();
  }, [router, user?.id, currentPage, startDate, endDate]);

  // Fonctions de gestion (édition, suppression, affichage de photo, etc.)
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
        r.id === editingRecord.id
          ? { ...r, fields: { ...r.fields, 'Plaque / VIN': newPlateVin } }
          : r
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
      setRecords(records.filter((r) => r.id !== recordToDelete.id));
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
        <div className="p-6 text-center">Chargement...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">Mon historique d'inventaire</h1>
        
        {/* Section des datepickers séparés pour une meilleure lisibilité */}
        <div className="mb-4 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="yyyy-MM-dd"
              placeholderText="Sélectionner la date de début"
              isClearable
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="yyyy-MM-dd"
              placeholderText="Sélectionner la date de fin"
              isClearable
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minDate={startDate}
            />
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Liste des enregistrements */}
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex flex-col sm:flex-row items-center justify-between bg-white shadow rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={record.fields['Photo']?.[0]?.url || ''}
                  alt="Photo véhicule"
                  className="w-16 h-16 object-cover rounded cursor-pointer"
                  onClick={() => handlePhotoClick(record.fields['Photo']?.[0]?.url)}
                />
                <div>
                  <p className="font-bold text-lg">{record.fields['Plaque / VIN']}</p>
                  <p className="text-sm text-gray-500">{record.fields['Date']}</p>
                  <p className="text-sm text-gray-600">{record.fields['Collaborateur']}</p>
                </div>
              </div>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <button
                  onClick={() => handleEditClick(record)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Éditer
                </button>
                <button
                  onClick={() => handleDeleteClick(record)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal d'agrandissement de la photo */}
        {enlargedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="relative bg-white rounded-lg overflow-hidden max-w-full max-h-full p-4">
              <img
                src={enlargedPhoto}
                alt="Agrandissement"
                className="max-w-full max-h-[90vh] object-contain"
              />
              <div className="text-center mt-4">
                <button
                  onClick={handleClosePhotoModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de modification */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Modifier la plaque / VIN</h2>
              <input
                className="border p-2 w-full rounded mb-4"
                value={newPlateVin}
                onChange={(e) => setNewPlateVin(e.target.value)}
                placeholder="Nouvelle plaque / VIN"
              />
              <div className="flex justify-between">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Confirmer la suppression</h2>
              <p className="mb-4">Voulez-vous vraiment supprimer cet enregistrement ?</p>
              <div className="flex justify-between">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Précédent
          </button>
          <span>
            Page {currentPage} sur {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </Layout>
  );
}