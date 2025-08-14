import { useState, useEffect, forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { logger } from '../lib/logger';

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
  } catch { }
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

  // Filtre par statut (par défaut: tout)
  const ALL_STATUSES = ['pending', 'processing', 'done', 'error'];
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const isActive = (s) => statusFilter.includes(s);
  const setAllStatuses = () => {
    logger.info('Filtre historique: Tout sélectionné', {
      userId: user?.id,
      previousFilter: statusFilter
    });
    setStatusFilter(ALL_STATUSES);
  };
  const toggleStatus = (s) => {
    setStatusFilter(prev => {
      let next;
      const isCurrentlySelected = prev.includes(s);
      const isAllCurrentlySelected = prev.length === ALL_STATUSES.length && 
                                    ALL_STATUSES.every(status => prev.includes(status));
      
      if (isAllCurrentlySelected) {
        // CAS SPÉCIAL: Si tout est sélectionné → ne garder que ce statut
        next = [s];
      } else if (isCurrentlySelected) {
        // COMPORTEMENT: Clic sur un statut déjà sélectionné → le retirer
        next = prev.filter(x => x !== s);
        // Si on retire le dernier, revenir à "tout"
        if (next.length === 0) {
          next = [...ALL_STATUSES];
        }
      } else {
        // COMPORTEMENT: Clic sur un statut non sélectionné → l'ajouter
        next = [...prev, s];
      }
      
      logger.info('Filtre historique modifié', {
        userId: user?.id,
        action: isAllCurrentlySelected ? 'select_only' : (isCurrentlySelected ? 'removed' : 'added'),
        status: s,
        previousFilter: prev,
        newFilter: next,
        wasAllSelected: isAllCurrentlySelected,
        isNowAllSelected: next.length === ALL_STATUSES.length
      });
      
      return next;
    });
  };

  // Affichage des filtres sur mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Export : concession à sélectionner
  const [exportConcession, setExportConcession] = useState('');
  const [exportConcessionOptions, setExportConcessionOptions] = useState([]);

  // Déclenchement manuel OCR
  const [ocrTriggerLoading, setOcrTriggerLoading] = useState(false);
  const [ocrTriggerMessage, setOcrTriggerMessage] = useState('');

  const router = useRouter();

  // Fonction pour rafraîchir les données
  const refreshData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userName = user.user_metadata?.name || '';
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

      const response = await fetch(`/api/history?${queryParams.toString()}`);
      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

      const { records, totalPages } = await response.json();
      setRecords(records || []);
      setTotalPages(totalPages);
    } catch (err) {
      logger.error('Erreur rafraîchissement historique', err, { userId: user.id });
      setError('Impossible de récupérer les données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchUserAndData() {
      const { data: userData } = await supabase.auth.getUser();
      logger.info('Utilisateur connecté sur historique', {
        userId: userData.user?.id,
        email: userData.user?.email,
        concession: userData.user?.user_metadata?.concession
      });
      if (!userData.user) {
        logger.auth.sessionExpired('unknown', { page: 'history' });
        router.push('/?reason=session-expired');
        return;
      }
      setUser(userData.user);
      
      // Charger les données directement ici
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

        logger.info('Consultation historique', {
          userId: userData.user.id,
          page: currentPage,
          dateRange: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }
        });

        const response = await fetch(`/api/history?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Erreur API: ${response.status}`);

        const { records, totalPages } = await response.json();
        logger.info('Historique chargé', {
          userId: userData.user.id,
          recordCount: records.length,
          totalPages,
          page: currentPage
        });
        setRecords(records || []);
        setTotalPages(totalPages);
      } catch (err) {
        logger.error('Erreur chargement historique', err, {
          userId: userData.user?.id,
          page: currentPage
        });
        setError('Impossible de récupérer les données.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndData();
  }, [router]);

  // Rafraîchir les données quand les filtres changent
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user?.id, currentPage, startDate, endDate]);

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
          logger.error('Erreur récupération concessions', new Error(json?.error));
        }
      } catch (err) {
        logger.error('Erreur réseau concessions', err);
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
    logger.info('Début édition enregistrement', {
      userId: user?.id,
      recordId: record.id,
      currentIdentifiant: record.identifiant
    });
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
    logger.info('Sauvegarde modification enregistrement', {
      userId: user?.id,
      recordId: editingRecord.id,
      oldIdentifiant: editingRecord.identifiant,
      newIdentifiant: newPlateVin,
      hasCommentChange: (editingRecord.commentaire || '') !== newCommentaire
    });

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
      logger.info('Enregistrement modifié avec succès', {
        userId: user?.id,
        recordId: editingRecord.id,
        newIdentifiant: newPlateVin
      });
      setRecords(records.map((r) =>
        r.id === editingRecord.id
          ? { ...r, identifiant: newPlateVin, commentaire: newCommentaire }
          : r
      ));
      handleCloseModal();
    } else {
      logger.error('Erreur modification enregistrement', null, {
        userId: user?.id,
        recordId: editingRecord.id,
        status: response.status
      });
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleRetryClick = async (record) => {
    logger.info('Tentative de réessai traitement OCR', {
      userId: user?.id,
      recordId: record.id,
      currentStatus: record.status,
      currentIdentifiant: record.identifiant
    });

    try {
      // Remettre le statut à 'pending' pour qu'il soit retraité
      const { error } = await supabase
        .from('inventaire')
        .update({ 
          status: 'pending', 
          identifiant: null 
        })
        .eq('id', record.id);

      if (error) {
        logger.error('Erreur remise en pending', error, { 
          userId: user?.id,
          recordId: record.id 
        });
        alert('Erreur lors de la remise en traitement');
        return;
      }

      // Déclencher immédiatement le traitement OCR
      const baseUrl = window.location.origin;
      fetch(`${baseUrl}/api/inventory/triggerOcr`, {
        method: 'GET',
        headers: {
          'User-Agent': 'FleetSnap-Retry-Trigger',
          'X-Triggered-By': 'manual-retry',
          'X-User-Id': user?.id,
          'X-Record-Count': '1'
        }
      }).catch(error => {
        logger.warn('Erreur déclenchement OCR retry', { 
          userId: user?.id,
          error: error.message 
        });
      });

      // Mettre à jour l'état local
      setRecords(records.map((r) =>
        r.id === record.id
          ? { ...r, status: 'pending', identifiant: null }
          : r
      ));

      logger.info('Record remis en traitement', {
        userId: user?.id,
        recordId: record.id
      });

      alert('Photo remise en traitement, veuillez patienter...');

    } catch (err) {
      logger.error('Erreur retry traitement', err, { 
        userId: user?.id,
        recordId: record.id 
      });
      alert('Erreur lors de la remise en traitement');
    }
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    logger.info('Suppression enregistrement', {
      userId: user?.id,
      recordId: recordToDelete.id,
      identifiant: recordToDelete.identifiant
    });

    const response = await fetch(`/api/deleteRecord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: recordToDelete.id })
    });

    if (response.ok) {
      logger.info('Enregistrement supprimé avec succès', {
        userId: user?.id,
        recordId: recordToDelete.id
      });
      setRecords(records.filter((r) => r.id !== recordToDelete.id));
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } else {
      logger.error('Erreur suppression enregistrement', null, {
        userId: user?.id,
        recordId: recordToDelete.id,
        status: response.status
      });
      alert('Erreur lors de la suppression');
    }
  };

  const handleManualOcrTrigger = async () => {
    setOcrTriggerLoading(true);
    setOcrTriggerMessage('');
    
    try {
      logger.info('Déclenchement manuel OCR', { userId: user?.id });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const response = await fetch('/api/inventory/manual-trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du déclenchement OCR');
      }

      const result = await response.json();
      setOcrTriggerMessage(result.message);
      
      logger.info('OCR déclenché manuellement avec succès', {
        userId: user?.id,
        result
      });

      // Rafraîchir les données après 2 secondes
      setTimeout(() => {
        refreshData();
      }, 2000);

    } catch (error) {
      logger.error('Erreur déclenchement manuel OCR', error, { userId: user?.id });
      setOcrTriggerMessage(`Erreur: ${error.message}`);
    } finally {
      setOcrTriggerLoading(false);
      // Effacer le message après 5 secondes
      setTimeout(() => {
        setOcrTriggerMessage('');
      }, 5000);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    setExportSuccess(false);
    try {
      const [start, end] = exportDateRange;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
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

  // Applique le filtre côté client (records anciens sans statut = assimilés à "done")
  const filteredRecords = records.filter(r => isActive(r.status || 'done'));
  const mobileSelectValue = statusFilter.length === ALL_STATUSES.length ? 'all' : (statusFilter.length === 1 ? statusFilter[0] : 'all');
  


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
          
          <button
            onClick={handleManualOcrTrigger}
            disabled={ocrTriggerLoading}
            className={`ml-2 px-4 py-2 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              ocrTriggerLoading 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-purple-500 hover:bg-purple-600 text-white focus:ring-purple-500'
            }`}
            title="Déclencher le traitement OCR pour les photos en attente"
          >
            {ocrTriggerLoading ? '⏳ OCR...' : '🔍 OCR'}
          </button>
        </div>

        {/* Bouton filtre - Mobile */}
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters((v) => !v)}
            aria-expanded={showMobileFilters}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 01.8 1.6L12 12v4a1 1 0 01-1.447.894l-2-1A1 1 0 018 15v-3L3.2 4.6A1 1 0 013 4z" />
            </svg>
            Filtres
          </button>
        </div>

        {/* Filtres de statut */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden'} sm:flex flex-wrap items-center gap-2`}>
          <span className="text-sm text-gray-600 mr-1">Filtrer :</span>
          <button
            type="button"
            onClick={setAllStatuses}
            className={`inline-flex px-2.5 py-1 text-xs rounded-full border transition ${statusFilter.length === ALL_STATUSES.length ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            title="Tout afficher"
          >
            Tout
          </button>
          <button
            type="button"
            onClick={() => toggleStatus('pending')}
            className={`inline-flex px-2.5 py-1 text-xs rounded-full border transition ${isActive('pending') ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-yellow-50'}`}
          >
            En attente
          </button>
          <button
            type="button"
            onClick={() => toggleStatus('processing')}
            className={`inline-flex px-2.5 py-1 text-xs rounded-full border transition ${isActive('processing') ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-orange-50'}`}
          >
            En cours
          </button>
          <button
            type="button"
            onClick={() => toggleStatus('done')}
            className={`inline-flex px-2.5 py-1 text-xs rounded-full border transition ${isActive('done') ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-green-50'}`}
          >
            Terminé
          </button>
          <button
            type="button"
            onClick={() => toggleStatus('error')}
            className={`inline-flex px-2.5 py-1 text-xs rounded-full border transition ${isActive('error') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50'}`}
          >
            Erreur
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        {/* Message de statut OCR */}
        {ocrTriggerMessage && (
          <div className={`mb-4 p-3 rounded-md ${
            ocrTriggerMessage.includes('Erreur') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {ocrTriggerMessage}
          </div>
        )}

        {/* Message d'information pour les erreurs */}
        {filteredRecords.some(r => r.status === 'error') && statusFilter.includes('error') && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">⚠️</span>
              <div className="text-sm text-orange-700">
                <p className="font-medium">Photos en erreur détectées</p>
                <p>Certaines photos n'ont pas pu être traitées. Utilisez le bouton 🔄 pour réessayer le traitement OCR.</p>
              </div>
            </div>
          </div>
        )}



        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="relative flex items-center justify-between gap-4 bg-white shadow-md rounded-md p-4 border border-gray-200"
            >
              <div className="flex items-center space-x-4 min-w-0">
                <div className="relative">
                  <img
                    src={record.photo_url || ''}
                    alt="Photo véhicule"
                    className={`w-16 h-16 object-cover rounded cursor-pointer ${record.status === 'error' ? 'opacity-75 border-2 border-red-300' : ''}`}
                    onClick={() => handlePhotoClick(record.photo_url)}
                  />
                  {record.status === 'error' && (
                    <span className="absolute top-1 right-1 text-red-500 text-xs bg-white rounded-full p-0.5 shadow" title="Erreur de traitement">
                      ⚠️
                    </span>
                  )}
                  {record.status === 'done' && (
                    <span className="sm:hidden absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800 border border-green-200 shadow pointer-events-none">
                      Terminé
                    </span>
                  )}
                  {record.status === 'error' && (
                    <span className="sm:hidden absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-800 border border-red-200 shadow pointer-events-none">
                      Erreur
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-3 sm:pr-6">
                  <p className="font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2 flex-nowrap leading-snug tracking-tight">
                    <span className={`whitespace-nowrap ${record.status === 'error' ? 'text-red-600' : ''}`}>
                      {record.status === 'error' ? 
                        (record.identifiant === 'DOWNLOAD_ERROR' ? 'Erreur téléchargement' :
                         record.identifiant === 'INVALID_MIMETYPE' ? 'Format image invalide' :
                         record.identifiant === 'PROCESSING_ERROR' ? 'Erreur traitement' :
                         record.identifiant === 'OCR_ERROR' ? 'Erreur OCR' :
                         'Erreur inconnue') :
                        (record.identifiant || <span className="text-gray-400 italic">—</span>)
                      }
                    </span>
                    {record.status === 'pending' && (
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap">
                        En attente
                      </span>
                    )}
                    {record.status === 'processing' && (
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
                        En cours
                      </span>
                    )}
                    {record.status === 'done' && (
                      <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                        Terminé
                      </span>
                    )}
                    {record.status === 'error' && (
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                        Erreur
                      </span>
                    )}
                  </p>
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
              <div className="flex flex-col space-y-2 ml-2 sm:ml-4 shrink-0 w-14 sm:w-16 md:w-20">
                {record.status === 'error' ? (
                  <>
                    <button
                      onClick={() => handleRetryClick(record)}
                      className="px-3 py-1 bg-orange-200 hover:bg-orange-300 text-orange-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      title="Réessayer le traitement"
                    >🔄</button>
                    <button
                      onClick={() => handleDeleteClick(record)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      title="Supprimer"
                    >🗑️</button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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