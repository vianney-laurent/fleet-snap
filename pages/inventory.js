import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Inventory() {
  const [photo, setPhoto] = useState(null);
  const [comment, setComment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zone, setZone] = useState('');
  const [zones, setZones] = useState([]);
  const [showZoneInput, setShowZoneInput] = useState(false);
  const [newZone, setNewZone] = useState('');
  const router = useRouter();

  // Fonction de compression d'image simple et safe
  const compressImage = (file, maxSizeMB = 2, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions en gardant le ratio
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en blob avec compression
        canvas.toBlob(resolve, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Gestion de la sélection de photo avec compression automatique
  const handlePhotoChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    
    // Si le fichier fait plus de 2MB, on le compresse
    if (fileSizeMB > 2) {
      logger.info('Compression image nécessaire', { 
        userId: user?.id,
        originalSize: fileSizeMB.toFixed(2) + 'MB',
        fileName: selectedFile.name
      });
      
      const compressedBlob = await compressImage(selectedFile);
      const compressedFile = new File([compressedBlob], selectedFile.name, {
        type: selectedFile.type,
        lastModified: Date.now()
      });
      
      const newSizeMB = compressedFile.size / (1024 * 1024);
      logger.info('Image compressée', { 
        userId: user?.id,
        originalSize: fileSizeMB.toFixed(2) + 'MB',
        newSize: newSizeMB.toFixed(2) + 'MB',
        fileName: selectedFile.name
      });
      
      setPhoto(compressedFile);
    } else {
      setPhoto(selectedFile);
    }
  };

  // Récupère l'utilisateur + la concession
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        logger.info('Utilisateur connecté sur inventaire', { 
          userId: data.user.id,
          email: data.user.email,
          concession: data.user.user_metadata?.concession 
        });
      } else {
        router.push('/?reason=session-expired');
        logger.auth.sessionExpired('unknown', { page: 'inventory' });
      }
    }
    fetchUser();
  }, []);

  // Récupère la zone depuis le localStorage au chargement
  useEffect(() => {
    const storedZone = localStorage.getItem('fleet_zone');
    if (storedZone) setZone(storedZone);
  }, []);

  // Stocke la zone dans le localStorage à chaque changement
  useEffect(() => {
    if (zone) localStorage.setItem('fleet_zone', zone);
    if (zone && !zones.includes(zone)) {
    setZone('');
    localStorage.removeItem('fleet_zone');
  }
  }, [zone]);

  // Charge les zones de la concession (si user chargé)
  useEffect(() => {
    if (!user) return;
    const concession = user.user_metadata?.concession || '';
    if (!concession) return;

    async function fetchZones() {
      const { data, error } = await supabase
        .from('zones')
        .select('nom_zone')
        .eq('concession', concession)
        .order('nom_zone', { ascending: true });
        console.log('Résultat fetchZones => data:', data, 'error:', error);
        
      if (!error && data) {
        setZones(data.map(z => z.nom_zone));
      }
    }
    fetchZones();
  }, [user]);

  // Ajout d'une nouvelle zone dans Supabase
  const handleAddZone = async () => {
    const trimmedZone = newZone.trim();
    logger.info('Tentative ajout nouvelle zone', { 
      userId: user?.id,
      newZone: trimmedZone,
      concession: user?.user_metadata?.concession 
    });

    if (
      !trimmedZone ||
      zones.map(z => z.toLowerCase()).includes(trimmedZone.toLowerCase())
    ) {
      logger.warn('Zone invalide ou déjà existante', { 
        userId: user?.id,
        newZone: trimmedZone,
        existingZones: zones.length 
      });
      alert("Cette zone existe déjà ou le nom est vide.");
      return;
    }
    if (!user?.user_metadata?.concession) {
      logger.error('Concession manquante pour création zone', { userId: user?.id });
      alert("Impossible de trouver la concession de l'utilisateur.");
      return;
    }

    const { error } = await supabase.from('zones').insert([
      {
        nom_zone: trimmedZone,
        concession: user.user_metadata.concession,
      },
    ]);
    if (!error) {
      setZones(prev => [...prev, trimmedZone]);
      setZone(trimmedZone);
      setNewZone('');
      setShowZoneInput(false);
      logger.info('Zone créée avec succès', { 
        userId: user.id,
        newZone: trimmedZone,
        concession: user.user_metadata.concession 
      });
    } else {
      logger.error('Erreur création zone Supabase', error, { 
        userId: user.id,
        newZone: trimmedZone 
      });
      alert("Erreur lors de la création de la zone.");
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (action) => {
    setSubmittingAction(action);
    
    logger.info('Début soumission inventaire', { 
      userId: user?.id,
      action,
      zone,
      hasPhoto: !!photo,
      hasComment: !!comment 
    });

    if (!photo) {
      logger.warn('Soumission sans photo', { userId: user?.id, action });
      alert('Veuillez ajouter une photo.');
      return;
    }
    if (!user) {
      logger.warn('Soumission sans utilisateur', { action });
      alert('Utilisateur non chargé, veuillez vous reconnecter.');
      return;
    }
    if (!zone) {
      logger.warn('Soumission sans zone', { userId: user.id, action });
      alert('Merci de sélectionner une zone avant de poursuivre.');
      return;
    }
    setLoading(true);
    // Récupération du token Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      logger.error('Session invalide pour soumission', sessionError, { 
        userId: user.id, 
        action 
      });
      setLoading(false);
      alert('Session invalide, veuillez vous reconnecter.');
      return;
    }
    const token = session.access_token;
    const formData = new FormData();
    formData.append('photos', photo);
    if (comment) {
      formData.append('comment', comment);
    }
    formData.append('zone', zone);
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    setLoading(false);
    setShowModal(false);
    setSubmittingAction(null);
    if (response.ok) {
      logger.info('Inventaire envoyé avec succès', { 
        userId: user.id,
        action,
        zone,
        status: response.status,
        hasComment: !!comment
      });
      alert('Photo envoyée avec succès !');
      setPhoto(null);
      setComment('');
    } else {
      logger.error('Erreur envoi inventaire', null, { 
        userId: user.id,
        action,
        zone,
        status: response.status
      });
      alert("Erreur lors de l’envoi.");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center min-h-screen bg-gray-100 py-4">
        <div className="w-full max-w-md mt-4">
          <img src="/logo.png" alt="Logo" className="w-full max-h-40 object-contain" />
        </div>

        {user && user.user_metadata?.concession && (
          <div className="mt-2 mb-4 w-full max-w-md text-center">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium shadow">
              Concession actuelle : <strong>{user.user_metadata.concession}</strong>
            </span>
          </div>
        )}

        <div className="bg-white shadow-md rounded-md p-6 mt-4 w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Inventaire voitures</h1>
          <p className="text-gray-600 text-sm">
            Merci de prendre en photo la plaque d'immatriculation ou le VIN du véhicule.
          </p>
          <p className="text-gray-600 text-sm">
            Attention à limiter les reflets pour le traitement automatique de la photo.
          </p>

          {/* Sélection de la zone */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Zone <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                value={zone}
                onChange={e => setZone(e.target.value)}
              >
                <option value="">Sélectionner une zone</option>
                {zones.map((z, i) => (
                  <option value={z} key={i}>{z}</option>
                ))}
              </select>
              <button
                onClick={() => setShowZoneInput(true)}
                className="bg-blue-500 text-white rounded-lg px-3 py-1"
                type="button"
              >+</button>
            </div>
            {showZoneInput && (
              <div className="flex gap-2 mt-2">
                <input
                  className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                  placeholder="Nouvelle zone"
                  value={newZone}
                  onChange={e => setNewZone(e.target.value)}
                />
                <button
                  className="bg-green-500 text-white rounded-lg px-3 py-1"
                  type="button"
                  onClick={handleAddZone}
                >✅</button>
                <button
                  className="bg-gray-300 text-gray-700 rounded-lg px-3 py-1"
                  type="button"
                  onClick={() => setShowZoneInput(false)}
                >❌</button>
              </div>
            )}
            {zone && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Zone en cours : <strong>{zone}</strong>
              </span>
            )}
          </div>

          {/* Upload Photo */}
          <label className="block text-sm font-medium">Photo *</label>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="photoInput"
              onChange={handlePhotoChange}
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
              onClick={() => handleSubmit('noComment')}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-full flex items-center justify-center gap-2 font-medium text-sm shadow-md transition-shadow transform hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading && submittingAction === 'noComment' ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Envoi...
                </>
              ) : (
                'Envoyer sans commentaire'
              )}
            </button>
            <button
              onClick={() => setShowModal(true)}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-full flex items-center justify-center gap-2 font-medium text-sm shadow-md transition-shadow transform hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading && submittingAction === 'withComment' ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Envoi...
                </>
              ) : (
                'Envoyer avec commentaire'
              )}
            </button>
          </div>
        </div>

        {/* Modal pour le commentaire */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200 ease-in-out">
            <div className="bg-white rounded-md shadow-md p-6 w-full max-w-md space-y-4 transition-transform duration-200 ease-in-out transform">
              <h2 className="text-lg font-semibold">Ajouter un commentaire</h2>
              <textarea
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                placeholder="Entrez votre commentaire ici..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Fermer
                </button>
                <button
                  onClick={() => handleSubmit('withComment')}
                  disabled={loading && submittingAction === 'withComment'}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
                >
                  {loading && submittingAction === 'withComment' ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Envoi...
                    </>
                  ) : (
                    'Valider et envoyer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}