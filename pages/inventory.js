import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { logger } from '../lib/logger';
import { memoryMonitor, usePerformanceCleanup } from '../lib/performanceOptimizer';
import { useErrorHandler } from '../lib/errorHandler';
import { useSessionManager } from '../lib/sessionManager';
import { useFormValidation } from '../lib/clientValidator';
import { useConnectivity } from '../lib/connectivityManager';
import { ConnectivityBanner } from '../components/ConnectivityIndicator';

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
  const [zone, setZone] = useState('');
  const [zones, setZones] = useState([]);
  const [showZoneInput, setShowZoneInput] = useState(false);
  const [newZone, setNewZone] = useState('');
  
  // Nouveaux états pour l'amélioration UX
  const [imagePreview, setImagePreview] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [showImageDetails, setShowImageDetails] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  
  const router = useRouter();

  // Hooks pour la gestion d'erreurs et performance
  const { handleError } = useErrorHandler();
  usePerformanceCleanup();
  
  // Hooks pour les nouvelles fonctionnalités
  const { session, isLoading: sessionLoading } = useSessionManager();
  const { validateField, validationResults } = useFormValidation();
  const { isOnline: networkOnline, addToQueue } = useConnectivity();

  // État pour la connectivité réseau (gardé pour compatibilité avec le code existant)
  const [networkError, setNetworkError] = useState(false);

  // Démarrer le monitoring mémoire
  useEffect(() => {
    if (typeof window !== 'undefined' && !memoryMonitor.monitoringInterval) {
      memoryMonitor.startMonitoring(60000); // Chaque minute
    }
  }, []);

  // Fonctions utilitaires pour les images
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isValidImageFile = (file) => {
    // Validation du type MIME
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return false;
    }
    
    // Validation de l'extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(extension)) {
      return false;
    }
    
    // Validation de la taille minimale (éviter les fichiers vides ou corrompus)
    if (file.size < 1024) { // Moins de 1KB
      return false;
    }
    
    // Validation de la taille maximale
    if (file.size > 50 * 1024 * 1024) { // Plus de 50MB
      return false;
    }
    
    return true;
  };

  const createImagePreview = (file) => {
    return new Promise((resolve, reject) => {
      if (!isValidImageFile(file)) {
        reject(new Error('Type de fichier non supporté'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(objectUrl); // Libérer la mémoire
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl); // Libérer même en cas d'erreur
        reject(new Error('Impossible de lire les dimensions'));
      };
      img.src = objectUrl;
    });
  };

  // Compression d'image simple
  const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions en gardant le ratio
        let { width, height } = { width: img.width, height: img.height };

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convertir en blob avec compression
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(img.src); // Libérer la mémoire après compression
            if (!blob) {
              reject(new Error('Erreur lors de la compression'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Libérer la mémoire en cas d'erreur
        reject(new Error('Erreur lors du chargement de l\'image'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Gestion de la sélection d'image avec prévisualisation et validation
  const handleImageSelect = async (file) => {
    if (!file) {
      setPhoto(null);
      setImagePreview(null);
      setImageInfo(null);
      setCompressionInfo(null);
      return;
    }

    try {
      // Validation côté client avec feedback immédiat
      const validation = await validateField('files', [file]);
      
      if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return;
      }

      // Afficher les avertissements s'il y en a
      if (validation.warnings.length > 0) {
        const proceed = confirm(
          validation.warnings.join('\n') + '\n\nContinuer quand même ?'
        );
        if (!proceed) return;
      }

      // Obtenir les dimensions et créer la prévisualisation
      const [dimensions, preview] = await Promise.all([
        getImageDimensions(file),
        createImagePreview(file)
      ]);

      setPhoto(file);
      setImagePreview(preview);
      setImageInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        dimensions,
        formattedSize: formatFileSize(file.size)
      });

      // Pré-compression pour estimer la taille finale
      if (file.size > 2 * 1024 * 1024) {
        try {
          const compressed = await compressImage(file, 1920, 1080, 0.8);
          setCompressionInfo({
            originalSize: file.size,
            compressedSize: compressed.size,
            compressionRatio: ((file.size - compressed.size) / file.size * 100).toFixed(1),
            formattedOriginal: formatFileSize(file.size),
            formattedCompressed: formatFileSize(compressed.size)
          });
        } catch (err) {
          logger.warn('Erreur pré-compression', { userId: user?.id, error: err.message });
        }
      }

      logger.info('Image sélectionnée', { 
        userId: user?.id,
        fileName: file.name,
        fileSize: file.size,
        dimensions 
      });

    } catch (err) {
      logger.error('Erreur sélection image', err, { userId: user?.id, fileName: file?.name });
      
      // Utiliser le gestionnaire d'erreurs centralisé
      const classified = handleError(err, { 
        action: 'imageSelection', 
        fileName: file?.name,
        fileSize: file?.size 
      });
      
      alert(classified.userMessage);
      
      // Reset des états en cas d'erreur
      setPhoto(null);
      setImagePreview(null);
      setImageInfo(null);
      setCompressionInfo(null);
    }
  };

  // Upload avec retry et compression progressive
  const uploadWithRetry = async (file, maxRetries = 3) => {
    let lastError = null;
    let compressedFile = file;

    // Vérification de connectivité avant de commencer
    if (!navigator.onLine) {
      throw new Error('NETWORK_OFFLINE');
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setCurrentAttempt(attempt + 1);
        setUploadProgress(20 + (attempt * 20));

        // Vérifier la connectivité avant chaque tentative
        if (!navigator.onLine) {
          throw new Error('NETWORK_OFFLINE');
        }

        // Compression progressive selon la tentative
        if (attempt > 0) {
          const compressionSettings = [
            { quality: 0.8, maxWidth: 1920, maxHeight: 1080 },
            { quality: 0.6, maxWidth: 1600, maxHeight: 900 },
            { quality: 0.4, maxWidth: 1280, maxHeight: 720 },
          ];
          
          const settings = compressionSettings[Math.min(attempt, compressionSettings.length - 1)];
          compressedFile = await compressImage(file, settings.maxWidth, settings.maxHeight, settings.quality);
          
          logger.info('Image compressée', { 
            userId: user?.id,
            attempt: attempt + 1,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(1) + '%'
          });
        }

        setUploadProgress(50 + (attempt * 20));

        // Récupération du token Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Session invalide');
        }

        const token = session.access_token;
        
        // Préparation des données
        const formData = new FormData();
        formData.append('photos', compressedFile);
        if (comment) {
          formData.append('comment', comment);
        }
        formData.append('zone', zone);

        setUploadProgress(70 + (attempt * 10));

        // Envoi de la requête
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (response.ok) {
          setUploadProgress(100);
          return await response.json();
        } else {
          const result = await response.json();
          const error = new Error(result.error || 'Erreur serveur');
          error.status = response.status;
          throw error;
        }

      } catch (err) {
        lastError = err;
        
        // Gestion spéciale des erreurs réseau
        if (err.message === 'NETWORK_OFFLINE' || !navigator.onLine) {
          logger.warn('Upload échoué - hors ligne', { userId: user?.id, attempt: attempt + 1 });
          break; // Pas de retry si hors ligne
        }

        // Gestion des erreurs de connectivité
        if (err.name === 'TypeError' || err.message.includes('fetch')) {
          logger.warn('Erreur réseau détectée', { userId: user?.id, attempt: attempt + 1, error: err.message });
          setNetworkError(true);
        }
        
        // Si ce n'est pas retryable ou dernière tentative
        const retryableCodes = [413, 500, 502, 503, 504, 408, 429];
        const isNetworkError = err.name === 'TypeError' || err.message.includes('fetch');
        
        if ((!retryableCodes.includes(err.status) && !isNetworkError) || attempt === maxRetries - 1) {
          break;
        }

        // Attendre avant la prochaine tentative (plus long pour erreurs réseau)
        const baseDelay = isNetworkError ? 2000 : 1000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        
        logger.info('Attente avant retry', { userId: user?.id, attempt: attempt + 1, delay, isNetworkError });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };

  // Récupère l'utilisateur + la concession avec gestion de session améliorée
  useEffect(() => {
    async function fetchUser() {
      try {
        // Vérifier d'abord la session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.warn('Erreur récupération session', { error: sessionError.message });
          router.push('/?reason=session-error');
          return;
        }

        if (!sessionData.session) {
          logger.info('Aucune session active');
          router.push('/?reason=no-session');
          return;
        }

        // Récupérer les données utilisateur
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
          logger.info('Utilisateur connecté sur inventaire', { 
            userId: data.user.id,
            email: data.user.email,
            concession: data.user.user_metadata?.concession,
            sessionExpiry: sessionData.session.expires_at
          });
        } else {
          logger.warn('Utilisateur non trouvé malgré session valide');
          router.push('/?reason=user-not-found');
        }
      } catch (error) {
        logger.error('Erreur critique récupération utilisateur', error);
        router.push('/?reason=critical-error');
      }
    }
    fetchUser();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('Changement état auth', { event, hasSession: !!session });
      
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/?reason=signed-out');
      } else if (event === 'TOKEN_REFRESHED') {
        logger.info('Token rafraîchi automatiquement');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

  // Charge les zones de la concession
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
        
      if (!error && data) {
        setZones(data.map(z => z.nom_zone));
      }
    }
    fetchZones();
  }, [user]);

  // Ajout d'une nouvelle zone avec protection renforcée
  const handleAddZone = async () => {
    const trimmedZone = newZone.trim();
    
    // Validations renforcées
    if (!trimmedZone) {
      alert("Le nom de la zone ne peut pas être vide.");
      return;
    }
    
    if (trimmedZone.length < 2) {
      alert("Le nom de la zone doit contenir au moins 2 caractères.");
      return;
    }
    
    if (trimmedZone.length > 50) {
      alert("Le nom de la zone ne peut pas dépasser 50 caractères.");
      return;
    }
    
    if (zones.map(z => z.toLowerCase()).includes(trimmedZone.toLowerCase())) {
      alert("Cette zone existe déjà.");
      return;
    }
    
    if (!user?.user_metadata?.concession) {
      alert("Impossible de trouver la concession de l'utilisateur.");
      return;
    }

    // Vérification de connectivité
    if (!navigator.onLine) {
      alert("Pas de connexion internet. Impossible de créer la zone.");
      return;
    }

    try {
      logger.info('Création nouvelle zone', { userId: user.id, zoneName: trimmedZone });
      
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
        logger.info('Zone créée avec succès', { userId: user.id, zoneName: trimmedZone });
      } else {
        logger.error('Erreur création zone', error, { userId: user.id, zoneName: trimmedZone });
        alert("Erreur lors de la création de la zone : " + (error.message || 'Erreur inconnue'));
      }
    } catch (err) {
      logger.error('Erreur réseau création zone', err, { userId: user.id, zoneName: trimmedZone });
      alert("Erreur de connexion. Vérifiez votre réseau et réessayez.");
    }
  };

  // Soumission du formulaire avec retry automatique et gestion hors ligne
  const handleSubmit = async (action) => {
    // Protection contre les soumissions multiples
    if (isUploading || submittingAction) {
      logger.warn('Tentative de soumission multiple bloquée', { userId: user?.id, action });
      return;
    }

    setSubmittingAction(action);
    setIsUploading(true);
    setUploadProgress(0);
    setCurrentAttempt(0);
    setNetworkError(false); // Reset l'erreur réseau
    
    // Validations côté client complètes
    const formValidation = await validateField('zone', zone);
    if (!formValidation.valid) {
      alert(formValidation.errors.join('\n'));
      setSubmittingAction(null);
      setIsUploading(false);
      return;
    }

    if (!photo) {
      alert('Veuillez ajouter une photo.');
      setSubmittingAction(null);
      setIsUploading(false);
      return;
    }
    
    if (!session) {
      alert('Session expirée. Veuillez vous reconnecter.');
      setSubmittingAction(null);
      setIsUploading(false);
      return;
    }

    try {
      // Si hors ligne, ajouter à la queue
      if (!networkOnline) {
        const formData = new FormData();
        formData.append('photos', photo);
        if (comment) formData.append('comment', comment);
        formData.append('zone', zone);

        await addToQueue({
          type: 'upload',
          data: {
            url: '/api/inventory',
            formData,
            options: {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            }
          }
        });

        alert('Hors ligne - Photo mise en queue. Elle sera envoyée dès la reconnexion.');
        
        // Reset du formulaire
        setPhoto(null);
        setComment('');
        setImagePreview(null);
        setImageInfo(null);
        setCompressionInfo(null);
        setShowModal(false);
        
        return;
      }

      const result = await uploadWithRetry(photo, 3);

      logger.info('Inventaire envoyé avec succès', { 
        userId: user.id,
        action,
        zone,
        hasComment: !!comment,
        attempts: currentAttempt
      });

      alert('Photo envoyée avec succès !');
      
      // Reset du formulaire
      setPhoto(null);
      setComment('');
      setImagePreview(null);
      setImageInfo(null);
      setCompressionInfo(null);
      setShowModal(false);

    } catch (err) {
      logger.error('Erreur envoi inventaire', err, { 
        userId: user.id,
        action,
        zone,
        status: err.status,
        attempts: currentAttempt
      });

      // Utiliser le gestionnaire d'erreurs centralisé
      const classified = handleError(err, { 
        action: 'inventoryUpload', 
        zone,
        attempts: currentAttempt,
        status: err.status
      });

      alert(classified.userMessage);
    } finally {
      setSubmittingAction(null);
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentAttempt(0);
    }
  };

  return (
    <Layout>
      <ConnectivityBanner />
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
          {/* Indicateur de connectivité */}
          {!networkOnline && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <span className="text-red-500">📶</span>
              <span className="text-sm font-medium">Hors ligne - Vérifiez votre connexion internet</span>
            </div>
          )}
          
          {networkError && networkOnline && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <span className="text-yellow-500">⚠️</span>
              <span className="text-sm font-medium">Problème de connexion détecté - Les uploads peuvent échouer</span>
            </div>
          )}

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

          {/* Upload Photo avec prévisualisation améliorée */}
          <label className="block text-sm font-medium">Photo *</label>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="photoInput"
                onChange={e => handleImageSelect(e.target.files[0])}
              />
              <label htmlFor="photoInput" className="flex flex-col items-center cursor-pointer">
                <span className="text-5xl mb-2">📸</span>
                {photo ? (
                  <div className="text-center">
                    <span className="text-sm font-medium text-green-600">✅ {imageInfo?.name}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {imageInfo?.formattedSize} • {imageInfo?.dimensions?.width}x{imageInfo?.dimensions?.height}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm">Déposer une photo</span>
                )}
              </label>
            </div>

            {/* Prévisualisation de l'image */}
            {imagePreview && (
              <div className="space-y-2">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Prévisualisation" 
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <button
                    onClick={() => setShowImageDetails(!showImageDetails)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ℹ️
                  </button>
                </div>

                {/* Détails de l'image */}
                {showImageDetails && imageInfo && (
                  <div className="bg-gray-50 p-3 rounded-md text-xs space-y-1">
                    <div><strong>Nom:</strong> {imageInfo.name}</div>
                    <div><strong>Taille:</strong> {imageInfo.formattedSize}</div>
                    <div><strong>Dimensions:</strong> {imageInfo.dimensions.width}x{imageInfo.dimensions.height}</div>
                    <div><strong>Type:</strong> {imageInfo.type}</div>
                    
                    {compressionInfo && (
                      <div className="border-t pt-2 mt-2">
                        <div className="text-blue-600 font-medium">Compression estimée:</div>
                        <div>{compressionInfo.formattedOriginal} → {compressionInfo.formattedCompressed}</div>
                        <div>Réduction: {compressionInfo.compressionRatio}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicateur de progression d'upload */}
          {isUploading && (
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  Envoi en cours... (Tentative {currentAttempt}/3)
                </span>
                <span className="text-sm text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              {currentAttempt > 1 && (
                <div className="text-xs text-blue-600 mt-1">
                  Compression en cours pour réduire la taille...
                </div>
              )}
            </div>
          )}

          {/* Boutons d'envoi */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleSubmit('noComment')}
              disabled={isUploading || !photo}
              className={`flex-1 py-2 rounded-full flex items-center justify-center gap-2 font-medium text-sm shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isUploading || !photo
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
              }`}
            >
              {isUploading && submittingAction === 'noComment' ? (
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
              disabled={isUploading || !photo}
              className={`flex-1 py-2 rounded-full flex items-center justify-center gap-2 font-medium text-sm shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isUploading || !photo
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
              }`}
            >
              Envoyer avec commentaire
            </button>
          </div>
        </div>

        {/* Modal pour le commentaire */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200 ease-in-out z-50">
            <div className="bg-white rounded-md shadow-md p-6 w-full max-w-md space-y-4 transition-transform duration-200 ease-in-out transform mx-4">
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
                  disabled={isUploading}
                  className={`px-4 py-2 font-medium text-sm rounded-full shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 ${
                    isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
                  }`}
                >
                  {isUploading && submittingAction === 'withComment' ? (
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