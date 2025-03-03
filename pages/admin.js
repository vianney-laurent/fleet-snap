import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import concessions from '../data/concessions.json';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersecret';

export default function Admin() {
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
            setUsers(data.users);
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

    if (!accessGranted) {
        return (
            <Layout>
                <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md mt-12">
                    <h2 className="text-xl font-bold mb-4">Accès administrateur</h2>
                    <input
                        type="password"
                        className="w-full p-2 border rounded mb-4"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                    />
                    <button onClick={handlePasswordSubmit} className="bg-blue-600 text-white py-2 px-4 rounded w-full">
                        Valider
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Administration</h1>

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

                <div className="mt-6 space-y-4">
                    {activeTab === 'createUser' && (
                        <>
                            <h2 className="text-xl font-bold">Créer un utilisateur</h2>
                            <input className="w-full p-2 border rounded" placeholder="Email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
                            <input className="w-full p-2 border rounded" placeholder="Nom complet" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} />
                            <input className="w-full p-2 border rounded" placeholder="Mot de passe" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                            <select className="w-full p-2 border rounded" value={createConcession} onChange={(e) => setCreateConcession(e.target.value)}>
                                <option value="">Sélectionnez une concession</option>
                                {concessions.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <button onClick={handleCreateUser} className="bg-blue-600 text-white px-4 py-2 rounded">Créer l’utilisateur</button>
                        </>
                    )}

                    {activeTab === 'editUser' && (
                        <>
                            <h2 className="text-xl font-bold">Modifier un utilisateur</h2>
                            {loadingUsers ? <p>Chargement...</p> : (
                                <ul className="max-h-60 overflow-y-auto space-y-2 bg-white p-2 border rounded">
                                    {users.map((user) => (
                                        <li key={user.id} className={`cursor-pointer p-2 ${selectedUser?.id === user.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`} onClick={() => handleSelectUser(user)}>
                                            {user.user_metadata?.name} - {user.email}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {selectedUser && (
                                <>
                                    <input className="w-full p-2 border rounded" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                                    <select className="w-full p-2 border rounded" value={editConcession} onChange={(e) => setEditConcession(e.target.value)}>
                                        {concessions.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <button onClick={handleUpdateUser} className="bg-blue-600 text-white py-2 px-4 rounded w-full">Mettre à jour</button>
                                    <button onClick={handleSendPasswordReset} className="bg-blue-600 text-white py-2 px-4 rounded w-full">Réinitialiser mot de passe</button>
                                </>
                            )}
                        </>
                    )}
                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Réglages du site</h2>
                            <p>Ici vous pourrez gérer les paramètres généraux du site, comme la liste des concessions ou d’autres configurations futures.</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}