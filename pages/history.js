// ✅ pages/history.js — version adaptée à Supabase

import { useState, useEffect, forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import fr from 'date-fns/locale/fr';
registerLocale('fr', fr);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CustomDateInput = forwardRef(({ value, onClick, clearSelection }, ref) => (
  <div className="relative">
    <input
      type="text"
      onClick={onClick}
      value={value}
      readOnly
      ref={ref}
      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Sélectionner une plage de dates"
    />
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <span role="img" aria-label="calendar">📅</span>
    </div>
    {value && (
      <button
        type="button"
        onClick={clearSelection}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
        title="Effacer la sélection"
      >
        <span role="img" aria-label="clear">❌</span>
      </button>
    )}
  </div>
));

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
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

        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          queryParams.append('startDate', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
          queryParams.append('endDate', adjustedEndDate.toISOString().split('T')[0]);
        }

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

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setNewPlateVin(record.identifiant);
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
          ? { ...r, identifiant: newPlateVin }
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

  const clearDateRange = () => {
    setDateRange([null, null]);
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

        <div className="mb-6">
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            dateFormat="yyyy-MM-dd"
            locale="fr"
            customInput={<CustomDateInput clearSelection={clearDateRange} />}
          />
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between bg-white shadow rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={record.photo_url || ''}
                  alt="Photo véhicule"
                  className="w-16 h-16 object-cover rounded cursor-pointer"
                  onClick={() => handlePhotoClick(record.photo_url)}
                />
                <div>
                  <p className="font-bold text-lg">{record.identifiant}</p>
                  <p className="text-sm text-gray-600">{record.collaborateur}</p>
                  <p className="text-sm text-gray-500">{new Date(record.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleEditClick(record)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Modifier"
                >✏️</button>
                <button
                  onClick={() => handleDeleteClick(record)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Supprimer"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {enlargedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="relative bg-white rounded-lg overflow-hidden max-w-full max-h-full p-4">
              <img src={enlargedPhoto} alt="Agrandissement" className="max-w-full max-h-[90vh] object-contain" />
              <div className="text-center mt-4">
                <button
                  onClick={handleClosePhotoModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >Fermer</button>
              </div>
            </div>
          </div>
        )}

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
                <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Annuler</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Confirmer la suppression</h2>
              <p className="mb-4">Voulez-vous vraiment supprimer cet enregistrement ?</p>
              <div className="flex justify-between">
                <button onClick={handleCloseDeleteModal} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Annuler</button>
                <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >Précédent</button>
          <span>Page {currentPage} sur {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >Suivant</button>
        </div>
      </div>
    </Layout>
  );
}