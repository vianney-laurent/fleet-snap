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
  const [showEditModal, setShowEditModal] = useState(false);

  // États pour la pagination et recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // États pour la gestion des concessions
  const [concessionList, setConcessionList] = useState([]);
  const [addConcessionSuccess, setAddConcessionSuccess] = useState('');
  const [addConcessionError, setAddConcessionError] = useState('');
  const [editingConcessionIndex, setEditingConcessionIndex] = useState(null);
  const [editingConcessionValue, setEditingConcessionValue] = useState('');
  const [newConcession, setNewConcession] = useState('');
  const [updateConcessionSuccess, setUpdateConcessionSuccess] = useState('');
  const [updateConcessionError, setUpdateConcessionError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [concessionToDelete, setConcessionToDelete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

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

  // Filtrer les utilisateurs selon le terme de recherche
  const filteredUsers = users.filter(user => {
    const name = user.user_metadata?.name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    const concession = user.user_metadata?.concession?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return name.includes(search) || email.includes(search) || concession.includes(search);
  });

  // Calculer la pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Réinitialiser la page quand on change le terme de recherche
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Calculer les statistiques d'utilisation des concessions
  const getConcessionStats = () => {
    const stats = {};
    users.forEach(user => {
      const concession = user.user_metadata?.concession || 'Non assigné';
      stats[concession] = (stats[concession] || 0) + 1;
    });
    return stats;
  };

  // Validation du formulaire de création
  const isFormValid = () => {
    return createEmail.trim() &&
      createFullName.trim() &&
      createPassword.trim() &&
      createConcession.trim() &&
      createEmail.includes('@');
  };

  // Évaluer la force du mot de passe
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { score: 0, label: 'Très faible', color: 'bg-red-500' },
      { score: 1, label: 'Faible', color: 'bg-red-400' },
      { score: 2, label: 'Moyen', color: 'bg-yellow-500' },
      { score: 3, label: 'Bon', color: 'bg-blue-500' },
      { score: 4, label: 'Fort', color: 'bg-green-500' },
      { score: 5, label: 'Très fort', color: 'bg-green-600' }
    ];

    return levels[score] || levels[0];
  };

  // Générer un mot de passe sécurisé
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(password);
  };

  const handleCreateUser = async () => {
    if (!isFormValid()) {
      setCreateErrorMessage('Veuillez remplir tous les champs correctement');
      return;
    }

    setCreateErrorMessage('');
    setCreateSuccessMessage('');
    setIsCreatingUser(true);

    try {
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword,
          fullName: createFullName.trim(),
          concession: createConcession
        })
      });

      const result = await response.json();

      if (response.ok) {
        setCreateSuccessMessage(`✅ Utilisateur ${createEmail} créé avec succès !`);
        setCreateEmail('');
        setCreatePassword('');
        setCreateFullName('');
        setCreateConcession('');
        fetchUsers();

        // Masquer le message de succès après 5 secondes
        setTimeout(() => {
          setCreateSuccessMessage('');
        }, 5000);
      } else {
        setCreateErrorMessage(result.error || 'Erreur inconnue lors de la création');
      }
    } catch (error) {
      setCreateErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Partie "Modifier un utilisateur" (editUser) – version modernisée
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEditFullName(user.user_metadata?.name || '');
    setEditConcession(user.user_metadata?.concession || '');
    setEditSuccessMessage('');
    setEditErrorMessage('');
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
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
      // Fermer le modal après 1.5 secondes
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
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
  const handleDeleteConcession = async () => {
    if (!concessionToDelete) return;

    try {
      const response = await fetch('/api/deleteConcession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: concessionToDelete.id })
      });
      const result = await response.json();
      if (response.ok) {
        setConcessionList(result.concessions);
        setShowDeleteModal(false);
        setConcessionToDelete(null);
      } else {
        alert(result.error || "Erreur lors de la suppression.");
      }
    } catch (error) {
      alert("Erreur lors de la suppression.");
    }
  };

  const confirmDeleteConcession = (concession, index) => {
    setConcessionToDelete({ ...concession, index });
    setShowDeleteModal(true);
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
                  } else if (tab === 'editUser') {
                    setSearchTerm('');
                    setCurrentPage(1);
                    setSelectedUser(null);
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
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Créer un nouvel utilisateur</h2>
                <p className="text-gray-600 mt-1">Ajoutez un nouveau membre à votre équipe</p>
              </div>

              {/* Statistiques rapides */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  👥 Aperçu de l'équipe
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{users.length}</div>
                    <div className="text-sm text-gray-600">Utilisateurs totaux</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{concessionList.length}</div>
                    <div className="text-sm text-gray-600">Concessions disponibles</div>
                  </div>
                  <div className="text-center md:col-span-1 col-span-2">
                    <div className="text-2xl font-bold text-purple-600">
                      {users.filter(u => u.last_sign_in_at).length}
                    </div>
                    <div className="text-sm text-gray-600">Utilisateurs actifs</div>
                  </div>
                </div>
              </div>

              {/* Formulaire de création */}
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  ➕ Informations du nouvel utilisateur
                </h3>

                <div className="space-y-6"></div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📧 Adresse email *
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="exemple@entreprise.com"
                  />
                  {createEmail && !createEmail.includes('@') && (
                    <p className="text-red-500 text-sm mt-1">⚠️ Format d'email invalide</p>
                  )}
                </div>
                {/* Nom complet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👤 Nom complet *
                  </label>
                  <input
                    type="text"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Prénom Nom"
                  />
                </div>
                {/* Mot de passe */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      🔐 Mot de passe *
                    </label>
                    <button
                      type="button"
                      onClick={generateSecurePassword}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      🎲 Générer un mot de passe
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordStrength ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Mot de passe sécurisé"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordStrength(!showPasswordStrength)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswordStrength ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Indicateur de force du mot de passe */}
                  {createPassword && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength(createPassword).color}`}
                            style={{ width: `${(getPasswordStrength(createPassword).score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {getPasswordStrength(createPassword).label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Recommandations : 8+ caractères, majuscules, minuscules, chiffres, symboles
                      </div>
                    </div>
                  )}
                </div>
                {/* Concession */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏢 Concession *
                  </label>
                  <select
                    value={createConcession}
                    onChange={(e) => setCreateConcession(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Sélectionnez une concession</option>
                    {concessionList.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({getConcessionStats()[c.name] || 0} utilisateur{(getConcessionStats()[c.name] || 0) !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  {concessionList.length === 0 && (
                    <p className="text-orange-500 text-sm mt-1">
                      ⚠️ Aucune concession disponible. Créez-en une dans l'onglet Réglages.
                    </p>
                  )}
                </div>
                
                {/* Messages d'erreur/succès */}
                {createSuccessMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                    <span>{createSuccessMessage}</span>
                  </div>
                )}
                {createErrorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                    <span>{createErrorMessage}</span>
                  </div>
                )}

                {/* Bouton de création */}
                <div className="pt-4">
                  <button
                    onClick={handleCreateUser}
                    disabled={!isFormValid() || isCreatingUser}
                    className={`w-full font-medium py-4 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isFormValid() && !isCreatingUser
                      ? 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 transform hover:scale-[1.02]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {isCreatingUser ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Création en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>👤</span>
                        <span>Créer l'utilisateur</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Aide contextuelle */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Conseils</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Un mot de passe fort est recommandé pour la sécurité</li>
                    <li>• La concession peut être modifiée ultérieurement</li>
                    <li>• L'utilisateur pourra se connecter immédiatement après création</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editUser' && (
            <>
              <h2 className="text-xl font-semibold">Modifier un utilisateur</h2>

              {/* Barre de recherche */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou concession..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                />
              </div>

              {/* Informations sur les résultats */}
              <div className="mb-4 text-sm text-gray-600">
                {filteredUsers.length > 0 ? (
                  <>
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredUsers.length)} sur {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
                    {searchTerm && ` (filtré${filteredUsers.length > 1 ? 's' : ''} sur ${users.length} total)`}
                  </>
                ) : (
                  searchTerm ? 'Aucun utilisateur trouvé pour cette recherche' : 'Aucun utilisateur'
                )}
              </div>

              {loadingUsers ? <p>Chargement...</p> : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {currentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-white p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {(user.user_metadata?.name || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.user_metadata?.name || 'Nom non défini'}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.user_metadata?.concession && (
                                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                                  {user.user_metadata.concession}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSelectUser(user)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            title="Modifier l'utilisateur"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedUser(user);
                              const response = await fetch('/api/resetPassword', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: user.email })
                              });
                              const result = await response.json();
                              if (response.ok) {
                                alert(`Email de réinitialisation envoyé à ${user.email}`);
                              } else {
                                alert(result.error || 'Erreur lors de l\'envoi de l\'email');
                              }
                            }}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            title="Réinitialiser le mot de passe"
                          >
                            🔑 Reset
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-md ${currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                      >
                        ← Précédent
                      </button>

                      <div className="flex items-center space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-md ${currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-md ${currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                      >
                        Suivant →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Réglages du site</h2>
                <p className="text-gray-600 mt-1">Gérez les concessions et leurs paramètres</p>
              </div>

              {/* Statistiques des concessions */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📊 Statistiques des concessions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{concessionList.length}</div>
                    <div className="text-sm text-gray-600">Concessions totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{users.length}</div>
                    <div className="text-sm text-gray-600">Utilisateurs totaux</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(getConcessionStats()).length}
                    </div>
                    <div className="text-sm text-gray-600">Concessions utilisées</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {getConcessionStats()['Non assigné'] || 0}
                    </div>
                    <div className="text-sm text-gray-600">Sans concession</div>
                  </div>
                </div>
              </div>

              {/* Header avec bouton d'ajout */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Gestion des concessions</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span>{showAddForm ? '❌' : '➕'}</span>
                  <span>{showAddForm ? 'Annuler' : 'Ajouter une concession'}</span>
                </button>
              </div>

              {/* Formulaire d'ajout */}
              {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Nouvelle concession</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom de la concession
                      </label>
                      <input
                        type="text"
                        value={newConcession}
                        onChange={(e) => setNewConcession(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Concession Paris Nord"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddConcession()}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddConcession}
                        disabled={!newConcession.trim()}
                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        ✅ Créer la concession
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewConcession('');
                          setAddConcessionError('');
                          setAddConcessionSuccess('');
                        }}
                        className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                      >
                        Annuler
                      </button>
                    </div>
                    {addConcessionSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                        {addConcessionSuccess}
                      </div>
                    )}
                    {addConcessionError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {addConcessionError}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Liste des concessions */}
              <div className="space-y-3">
                {concessionList.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-gray-400 text-6xl mb-4">🏢</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune concession</h3>
                    <p className="text-gray-600 mb-4">Commencez par ajouter votre première concession</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      ➕ Ajouter une concession
                    </button>
                  </div>
                ) : (
                  concessionList.map((concession, index) => {
                    const userCount = getConcessionStats()[concession.name] || 0;
                    return (
                      <div key={concession.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        {editingConcessionIndex === index ? (
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={editingConcessionValue}
                                onChange={(e) => setEditingConcessionValue(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateConcession()}
                                autoFocus
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleUpdateConcession}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                title="Sauvegarder"
                              >
                                ✅ Sauvegarder
                              </button>
                              <button
                                onClick={handleCancelEditConcession}
                                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                                title="Annuler"
                              >
                                ❌ Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-lg">🏢</span>
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{concession.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {userCount} utilisateur{userCount !== 1 ? 's' : ''} assigné{userCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditConcession(index, concession)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                title="Modifier"
                              >
                                ✏️ Modifier
                              </button>
                              <button
                                onClick={() => confirmDeleteConcession(concession, index)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                title="Supprimer"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Messages de succès/erreur pour les modifications */}
              {updateConcessionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {updateConcessionSuccess}
                </div>
              )}
              {updateConcessionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {updateConcessionError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal d'édition d'utilisateur */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header du modal */}
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Modifier l'utilisateur
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenu du modal */}
              <div className="p-6 space-y-4">
                {/* Informations utilisateur */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {(selectedUser.user_metadata?.name || selectedUser.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedUser.email}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          Créé le {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        <p>
                          {selectedUser.last_sign_in_at ? (
                            <>
                              Dernière connexion : {new Date(selectedUser.last_sign_in_at).toLocaleDateString('fr-FR')} à {new Date(selectedUser.last_sign_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </>
                          ) : (
                            <span className="text-orange-600">Aucune connexion enregistrée</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulaire d'édition */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Entrez le nom complet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Concession
                    </label>
                    <select
                      value={editConcession}
                      onChange={(e) => setEditConcession(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une concession</option>
                      {concessionList.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Messages d'erreur/succès */}
                {editSuccessMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {editSuccessMessage}
                  </div>
                )}
                {editErrorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {editErrorMessage}
                  </div>
                )}
              </div>

              {/* Footer du modal */}
              <div className="flex flex-col sm:flex-row gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  💾 Sauvegarder les modifications
                </button>
                <button
                  onClick={handleSendPasswordReset}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  🔑 Réinitialiser mot de passe
                </button>
                <button
                  onClick={handleCloseModal}
                  className="sm:w-auto bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
        }

        {/* Modal de confirmation de suppression */}
        {
          showDeleteModal && concessionToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header du modal */}
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmer la suppression
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConcessionToDelete(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenu du modal */}
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Supprimer la concession</h4>
                      <p className="text-gray-600">Cette action est irréversible</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-700">
                      Vous êtes sur le point de supprimer la concession :
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">"{concessionToDelete.name}"</p>
                    {(() => {
                      const userCount = getConcessionStats()[concessionToDelete.name] || 0;
                      return userCount > 0 ? (
                        <p className="text-orange-600 text-sm mt-2">
                          ⚠️ {userCount} utilisateur{userCount !== 1 ? 's sont' : ' est'} actuellement assigné{userCount !== 1 ? 's' : ''} à cette concession
                        </p>
                      ) : (
                        <p className="text-green-600 text-sm mt-2">
                          ✅ Aucun utilisateur n'est assigné à cette concession
                        </p>
                      );
                    })()}
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    Les utilisateurs assignés à cette concession ne seront pas supprimés, mais leur concession sera réinitialisée.
                  </p>
                </div>

                {/* Footer du modal */}
                <div className="flex space-x-3 p-6 border-t bg-gray-50">
                  <button
                    onClick={handleDeleteConcession}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    🗑️ Supprimer définitivement
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConcessionToDelete(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
  

    </Layout>
  );
}