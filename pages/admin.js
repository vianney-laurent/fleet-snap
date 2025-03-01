import { useState } from 'react';
import Layout from '../components/Layout';
import concessions from '../data/concessions.json';  // Import du JSON

export default function Admin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [concession, setConcession] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleCreateUser = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        const response = await fetch('/api/createUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, concession })
        });

        const result = await response.json();

        if (response.ok) {
            setSuccessMessage(`Utilisateur ${email} créé avec succès !`);
            setEmail('');
            setPassword('');
            setConcession('');
        } else {
            setErrorMessage(result.error || 'Erreur inconnue');
        }
    };

    return (
        <Layout>
            <div className="p-6 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-4">Créer un utilisateur</h1>

                {errorMessage && (
                    <div className="bg-red-100 text-red-600 p-2 mb-4 rounded">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-100 text-green-600 p-2 mb-4 rounded">
                        {successMessage}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div>
                        <label className="block font-medium">Concession</label>
                        <select
                            value={concession}
                            onChange={(e) => setConcession(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Sélectionnez une concession</option>
                            {concessions.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleCreateUser}
                        className="bg-blue-600 text-white py-2 px-4 rounded"
                    >
                        Créer l’utilisateur
                    </button>
                </div>
            </div>
        </Layout>
    );
}