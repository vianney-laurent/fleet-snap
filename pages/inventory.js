import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

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
  const [zone, setZone] = useState('');
  const [zones, setZones] = useState([]);
  const [showZoneInput, setShowZoneInput] = useState(false);
  const [newZone, setNewZone] = useState('');
  const router = useRouter();

  // Récupère l'utilisateur + la concession
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
    if (
      !trimmedZone ||
      zones.map(z => z.toLowerCase()).includes(trimmedZone.toLowerCase())
    ) {
      alert("Cette zone existe déjà ou le nom est vide.");
      return;
    }
    if (!user?.user_metadata?.concession) {
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
    } else {
      alert("Erreur lors de la création de la zone.");
    }
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!photo) {
      alert('Veuillez ajouter une photo.');
      return;
    }
    if (!user) {
      alert('Utilisateur non chargé, veuillez vous reconnecter.');
      return;
    }
    if (!zone) {
      alert('Merci de sélectionner une zone avant de poursuivre.');
      return;
    }
    setLoading(true);
    // Récupération du token Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setLoading(false);
      alert('Session invalide, veuillez vous reconnecter.');
      return;
    }
    const token = session.access_token;
    const formData = new FormData();
    formData.append('photos', photo);
    formData.append('comment', comment);
    formData.append('zone', zone);
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    setLoading(false);
    setShowModal(false);
    if (response.ok) {
      alert('Photo envoyée avec succès !');
      setPhoto(null);
      setComment('');
    } else {
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

        <div className="bg-white shadow-lg rounded-lg p-6 mt-4 w-full max-w-md">
          <h1 className="text-xl font-bold mb-2">Inventaire voitures</h1>
          <p className="text-gray-600 text-sm mb-2">
            Merci de prendre en photo la plaque d'immatriculation ou le VIN du véhicule.
          </p>
          <p className="text-gray-500 text-xs mb-4">
            Attention à limiter les reflets pour le traitement automatique de la photo.
          </p>

          {/* Sélection de la zone */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Zone <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg p-2"
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
                  className="flex-1 border rounded-lg p-2"
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
          <label className="block text-sm font-medium mb-2">Photo *</label>
          <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="photoInput"
              onChange={e => setPhoto(e.target.files[0])}
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
                onChange={e => setComment(e.target.value)}
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