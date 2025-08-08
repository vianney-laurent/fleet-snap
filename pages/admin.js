import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersecret';

export default function Admin() {
  // Pour éviter les erreurs de SSR/hydratation, on attend que le composant soit monté
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Tous les hooks sont appelés inconditionnellement
  // États pour l'accès admin
  const [accessGranted, setAccessGranted] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('createUser');

  // États pour la création d'utilisateur
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createConcession, setCreateConcession] = useState('');
  const [createErrorMessage, setCreateErrorMessage] = useState('');
  const [createSuccessMessage, setCreateSuccessMessage] = useState('');

  // États pour la modification d'utilisateur
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editConcession, setEditConcession] = useState('');
  const [editErrorMessage, setEditErrorMessage] = useState('');
  const [editSuccessMessage, setEditSuccessMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // États pour la gestion des concessions
  const [concessionList, setConcessionList] = useState([]);
  const [addConcessionSuccess, setAddConcessionSuccess] = useState('');
  const [addConcessionError, setAddConcessionError] = useState('');
  const [editingConcessionIndex, setEditingConcessionIndex] = useState(null);
  const [editingConcessionValue, setEditingConcessionValue] = useState('');
  const [newConcession, setNewConcession] = useState('');
  const [updateConcessionSuccess, setUpdateConcessionSuccess] = useState('');
  const [updateConcessionError, setUpdateConcessionError] = useState('');

  const fetchConcessions = async () => {
  try {
    const response = await fetch('/api/getConcessions');
    const result = await response.json();
    if (response.ok) {
      setConcessionList(result.concessions);
    }
  } catch (error) {
    // Optionnel : gestion d'erreur
  }
};
useEffect(() => {
  if (accessGranted) {
    fetchConcessions();
  }
}, [accessGranted]);

useEffect(() => {
  if (accessGranted && activeTab === 'settings') {
    fetchConcessions();
  }
}, [accessGranted, activeTab]);

  // Attendre le montage du composant pour éviter les erreurs d'hydratation
  if (!mounted) return <div className="p-6 text-center">Chargement...</div>;

  const handlePasswordSubmit = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setAccessGranted(true);
      fetchUsers();
    } else {
      alert('Mot de passe administrateur incorrect');
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/adminUsers');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de récupérer les utilisateurs');
      }
      // Trier les utilisateurs par ordre alphabétique de nom
      const sortedUsers = data.users.slice().sort((a, b) => {
        const nameA = a.user_metadata?.name?.toLowerCase() || a.email.toLowerCase();
        const nameB = b.user_metadata?.name?.toLowerCase() || b.email.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setUsers(sortedUsers);
    } catch (err) {
      setEditErrorMessage(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    setCreateErrorMessage('');
    setCreateSuccessMessage('');

    const response = await fetch('/api/createUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createEmail,
        password: createPassword,
        fullName: createFullName,
        concession: createConcession
      })
    });

    const result = await response.json();

    if (response.ok) {
      setCreateSuccessMessage(`Utilisateur ${createEmail} créé avec succès !`);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreateConcession('');
      fetchUsers();
    } else {
      setCreateErrorMessage(result.error || 'Erreur inconnue');
    }
  };

  // Partie "Modifier un utilisateur" (editUser) – version modernisée
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEditFullName(user.user_metadata?.name || '');
    setEditConcession(user.user_metadata?.concession || '');
    setEditSuccessMessage('');
    setEditErrorMessage('');
  };

  const handleUpdateUser = async () => {
    const response = await fetch('/api/updateUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedUser.id,
        fullName: editFullName,
        concession: editConcession,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      setEditSuccessMessage('Utilisateur mis à jour avec succès !');
      fetchUsers();
    } else {
      setEditErrorMessage(result.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleSendPasswordReset = async () => {
    const response = await fetch('/api/resetPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: selectedUser.email })
    });

    const result = await response.json();

    if (response.ok) {
      setEditSuccessMessage(`Email de réinitialisation envoyé à ${selectedUser.email}`);
    } else {
      setEditErrorMessage(result.error || 'Erreur lors de l’envoi de l’email');
    }
  };

// --- Gestion des concessions (Réglages) ---

// Ajout d'une concession
const handleAddConcession = async () => {
  setAddConcessionSuccess('');
  setAddConcessionError('');
  if (!newConcession.trim()) {
    setAddConcessionError("Le nom de la concession ne peut être vide.");
    return;
  }
  try {
    const response = await fetch('/api/addConcession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newConcession.trim() })
    });
    const result = await response.json();
    if (response.ok) {
      setAddConcessionSuccess(`Concession "${newConcession}" ajoutée avec succès !`);
      setNewConcession('');
      setConcessionList(result.concessions); // concessions = [{id, name}]
    } else {
      setAddConcessionError(result.error || "Erreur lors de l'ajout.");
    }
  } catch (error) {
    setAddConcessionError("Erreur lors de l'ajout.");
  }
};

// Mise en édition d'une concession
const handleEditConcession = (index, concession) => {
  setEditingConcessionIndex(index);
  setEditingConcessionValue(concession.name); // concession est maintenant un objet {id, name}
  setUpdateConcessionSuccess('');
  setUpdateConcessionError('');
};

// Annulation de l'édition
const handleCancelEditConcession = () => {
  setEditingConcessionIndex(null);
  setEditingConcessionValue('');
  setUpdateConcessionSuccess('');
  setUpdateConcessionError('');
};

// Modification d'une concession
const handleUpdateConcession = async () => {
  const concessionToUpdate = concessionList[editingConcessionIndex];
    console.log('API updateConcession payload:', {
    id: concessionToUpdate?.id,
    newName: editingConcessionValue.trim(),
  });
  try {
    const response = await fetch('/api/updateConcession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: concessionToUpdate.id,
        newName: editingConcessionValue.trim(),
      }),
    });
    const result = await response.json();
    if (response.ok) {
      setUpdateConcessionSuccess('Concession mise à jour avec succès !');
      setConcessionList(result.concessions);
      setEditingConcessionIndex(null);
      setEditingConcessionValue('');
    } else {
      setUpdateConcessionError(result.error || "Erreur lors de la mise à jour.");
    }
  } catch (error) {
    setUpdateConcessionError("Erreur lors de la mise à jour.");
  }
};

// Suppression d'une concession
const handleDeleteConcession = async (index) => {
  const concessionToDelete = concessionList[index];
  try {
    const response = await fetch('/api/deleteConcession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: concessionToDelete.id })
    });
    const result = await response.json();
    if (response.ok) {
      setConcessionList(result.concessions);
    } else {
      alert(result.error || "Erreur lors de la suppression.");
    }
  } catch (error) {
    alert("Erreur lors de la suppression.");
  }
};

  if (!accessGranted) {
    return (
      <Layout>
        <div className="p-6 max-w-md mx-auto bg-white rounded-md shadow-md mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Accès administrateur</h2>
          <input
            type="password"
            className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
            value={adminPasswordInput}
            onChange={(e) => setAdminPasswordInput(e.target.value)}
          />
          <button
            onClick={handlePasswordSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Valider
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Administration</h1>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-4">
            {['createUser', 'editUser', 'settings'].map(tab => (
              <button
                key={tab}
                className={`py-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'createUser') {
                    setCreateEmail('');
                    setCreatePassword('');
                    setCreateFullName('');
                    setCreateConcession('');
                  }
                }}
              >
                {tab === 'createUser' ? '👤 Créer un utilisateur' :
                  tab === 'editUser' ? '🛠 Modifier un utilisateur' :
                    '⚙️ Réglages'}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6 space-y-6">
          {activeTab === 'createUser' && (
            <>
              <h2 className="text-xl font-semibold">Créer un utilisateur</h2>
              <input
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                placeholder="Email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
              <input
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                placeholder="Nom complet"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
              />
              <input
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                placeholder="Mot de passe"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              <select
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                value={createConcession}
                onChange={(e) => setCreateConcession(e.target.value)}
              >
                <option value="">Sélectionnez une concession</option>
                {concessionList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button
                onClick={handleCreateUser}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Créer l’utilisateur
              </button>
            </>
          )}

          {activeTab === 'editUser' && (
            <>
              <h2 className="text-xl font-semibold">Modifier un utilisateur</h2>
              {loadingUsers ? <p>Chargement...</p> : (
                <div className="grid grid-cols-1 gap-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between bg-white p-4 border rounded-md shadow-md cursor-pointer hover:bg-gray-50 ${selectedUser?.id === user.id ? 'border-blue-600' : ''}`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <div>
                        <p className="font-bold">{user.user_metadata?.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user);
                        }}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedUser && (
                <>
                  <div className="mt-4 space-y-2">
                    <input
                      className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nom complet"
                    />
                    <select
                      className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                      value={editConcession}
                      onChange={(e) => setEditConcession(e.target.value)}
                    >
                      <option value="">Sélectionnez une concession</option>
                      {concessionList.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleUpdateUser}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Mettre à jour
                  </button>
                  <button
                    onClick={handleSendPasswordReset}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Réinitialiser mot de passe
                  </button>
                </>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Réglages du site</h2>
              <h3 className="text-lg font-semibold">Gestion des concessions</h3>
              <div className="grid grid-cols-1 gap-4">
                {concessionList.map((concession, index) => (
                  <div key={concession.id} className="flex items-center justify-between bg-white p-4 border rounded-md shadow-md">
                    {editingConcessionIndex === index ? (
                      <>
                        <input
                          type="text"
                          value={editingConcessionValue}
                          onChange={(e) => setEditingConcessionValue(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                        />
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={handleUpdateConcession}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            title="Enregistrer"
                          >
                            ✔️
                          </button>
                          <button
                            onClick={handleCancelEditConcession}
                            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                            title="Annuler"
                          >
                            ❌
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{concession.name}</span>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => handleEditConcession(index, concession)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteConcession(index)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Ajouter une nouvelle concession</label>
                <input
                  type="text"
                  value={newConcession}
                  onChange={(e) => setNewConcession(e.target.value)}
                  className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                  placeholder="Nom de la concession"
                />
                <button
                  onClick={handleAddConcession}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ajouter
                </button>
                {addConcessionSuccess && <p className="text-green-600 mt-2">{addConcessionSuccess}</p>}
                {addConcessionError && <p className="text-red-600 mt-2">{addConcessionError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}