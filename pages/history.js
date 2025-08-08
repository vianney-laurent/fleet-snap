import { useState, useEffect, forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { log } from 'next-axiom';

import fr from 'date-fns/locale/fr';
registerLocale('fr', fr);

// Helper pour formater les champs stockés sous forme de JSON array string
const formatTextArray = (value) => {
  if (!value) return '';
  // Si c'est déjà un tableau
  if (Array.isArray(value)) return value.join(', ');
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ');
  } catch {}
  return value;
};

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
      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
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
  const [newCommentaire, setNewCommentaire] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState([null, null]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');
  const [startDate, endDate] = dateRange;

  // Export : concession à sélectionner
  const [exportConcession, setExportConcession] = useState('');
  const [exportConcessionOptions, setExportConcessionOptions] = useState([]);

  const router = useRouter();

  useEffect(() => {
    async function fetchUserAndData() {
      const { data: userData } = await supabase.auth.getUser();
      log.info('Utilisateur récupéré dans History', { user: userData.user });
      if (!userData.user) {
        log.warn('Utilisateur non authentifié in History, redirection vers login');
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
          queryParams.append('endDate', endDate.toISOString().split('T')[0]);
        }

        log.debug('Appel API /api/history', { url: `/api/history?${queryParams.toString()}` });
        const response = await fetch(`/api/history?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const { records, totalPages } = await response.json();
        log.info('History records reçus', { recordCount: records.length, totalPages });
        setRecords(records || []);
        setTotalPages(totalPages);
      } catch (err) {
        log.error('Error fetching history', { message: err.message, stack: err.stack });
        setError('Impossible de récupérer les données.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndData();
  }, [router, user?.id, currentPage, startDate, endDate]);

useEffect(() => {
  async function fetchConcessions() {
    try {
      const response = await fetch('/api/getConcessions');
      const json = await response.json();
      if (response.ok) {
        // Extract names if concessions are objects
        const options = Array.isArray(json.concessions)
          ? json.concessions.map(item => (item && item.name) || item)
          : [];
        setExportConcessionOptions(options);
      } else {
        log.error('fetchConcessions error', { error: json?.error });
      }
    } catch (err) {
      log.error('fetchConcessions error', { error: err });
    }
  }
  fetchConcessions();
}, []);

  useEffect(() => {
    if (exportConcessionOptions.length > 0) {
      const profileConcession = user?.user_metadata?.concession;
      const defaultValue = exportConcessionOptions.includes(profileConcession)
        ? profileConcession
        : exportConcessionOptions[0];
      setExportConcession(defaultValue);
    }
  }, [exportConcessionOptions, user]);

  useEffect(() => {
    if (user?.user_metadata?.concession) {
      setExportConcession(user.user_metadata.concession);
    }
  }, [user]);

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setNewPlateVin(record.identifiant);
    setNewCommentaire(record.commentaire || '');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setNewPlateVin('');
    setNewCommentaire('');
  };

  const handleSave = async () => {
    const response = await fetch(`/api/updateRecord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId: editingRecord.id,
        newPlateVin,
        newCommentaire
      })
    });

    if (response.ok) {
      setRecords(records.map((r) =>
        r.id === editingRecord.id
          ? { ...r, identifiant: newPlateVin, commentaire: newCommentaire }
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

  const handleExport = async () => {
  setExportLoading(true);
  setExportError('');
  setExportSuccess(false);
  try {
      const [start, end] = exportDateRange;
      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      const body = {
        email: user.email,
        concession: exportConcession,
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
      };

    const response = await fetch('/api/exportInventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Erreur lors de l’export');

    setExportSuccess(true);
  } catch (err) {
    setExportError("Une erreur est survenue pendant l'export.");
  } finally {
    setExportLoading(false);
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
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-center">Mon historique d'inventaire</h1>

        <div className="flex justify-between items-center">
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            dateFormat="yyyy-MM-dd"
            locale="fr"
            customInput={<CustomDateInput clearSelection={clearDateRange} />}
          />
          <button
            onClick={() => setExportModalOpen(true)}
            className="ml-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            📤 Exporter
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between bg-white shadow-md rounded-md p-4 border border-gray-200"
            >
              <div className="flex items-center space-x-4 min-w-0">
                <img
                  src={record.photo_url || ''}
                  alt="Photo véhicule"
                  className="w-16 h-16 object-cover rounded cursor-pointer"
                  onClick={() => handlePhotoClick(record.photo_url)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{record.identifiant}</p>
                  {formatTextArray(record.commentaire) && (
                    <p className="text-sm text-gray-600 italic">{formatTextArray(record.commentaire)}</p>
                  )}
                  {formatTextArray(record.zone) && (
                    <p className="text-sm text-gray-700">{formatTextArray(record.zone)}</p>
                  )}
                  <p className="text-sm text-gray-600">{record.collaborateur}</p>
                  <p className="text-sm text-gray-500">{new Date(record.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleEditClick(record)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  title="Modifier"
                >✏️</button>
                <button
                  onClick={() => handleDeleteClick(record)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  title="Supprimer"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* Modale d'édition */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity duration-200 ease-in-out">
            <div className="bg-white rounded-md shadow-md p-6 w-full max-w-sm space-y-4 transition-transform duration-200 ease-in-out transform">
              <h2 className="text-xl font-semibold">Modifier l’enregistrement</h2>

              <label className="block font-medium">Plaque / VIN</label>
              <input
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                value={newPlateVin}
                onChange={(e) => setNewPlateVin(e.target.value)}
                placeholder="Nouvelle plaque / VIN"
              />

              <label className="block font-medium">Commentaire</label>
              <textarea
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                rows={3}
                value={newCommentaire}
                onChange={(e) => setNewCommentaire(e.target.value)}
                placeholder="Ajouter un commentaire"
              />

              <div className="flex justify-between">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >Annuler</button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modale suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity duration-200 ease-in-out">
            <div className="bg-white rounded-md shadow-md p-6 w-full max-w-sm space-y-4 transition-transform duration-200 ease-in-out transform">
              <h2 className="text-xl font-semibold">Confirmer la suppression</h2>
              <p>Voulez-vous vraiment supprimer cet enregistrement ?</p>
              <div className="flex justify-between">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >Annuler</button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >Précédent</button>
          <span>Page {currentPage} sur {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >Suivant</button>
        </div>

        {exportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity duration-200 ease-in-out">
            <div className="bg-white rounded-md shadow-md p-6 w-full max-w-md space-y-4 transition-transform duration-200 ease-in-out transform">
              <h2 className="text-xl font-semibold">Exporter l'inventaire</h2>
              <div>
                <label className="block font-medium">Concession à exporter</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 mb-2"
                  value={exportConcession}
                  onChange={e => setExportConcession(e.target.value)}
                >
                  <option value="" disabled>-- Sélectionnez une concession --</option>
                  {exportConcessionOptions.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm">Choisissez une plage de dates (facultatif) :</p>
              <DatePicker
                selectsRange
                startDate={exportDateRange[0]}
                endDate={exportDateRange[1]}
                onChange={(update) => setExportDateRange(update)}
                dateFormat="yyyy-MM-dd"
                locale="fr"
                className="w-full mb-4"
                placeholderText="Sélectionner une plage de dates"
              />
              {exportError && <p className="text-red-500">{exportError}</p>}
              {exportSuccess && <p className="text-green-600">Email envoyé avec succès !</p>}
              <div className="flex justify-between">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >Annuler</button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={exportLoading}
                >
                  {exportLoading ? 'Envoi...' : 'Envoyer par e-mail'}
                </button>
              </div>
            </div>
          </div>
        )}

        {enlargedPhoto && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={handleClosePhotoModal}
          >
            <div
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClosePhotoModal}
                className="absolute top-2 right-2 text-white text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Fermer"
              >
                &times;
              </button>
              <img
                src={enlargedPhoto}
                alt="Photo agrandie"
                className="object-contain max-w-full max-h-[90vh] rounded-md shadow-md"
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}