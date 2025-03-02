import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import concessions from '../data/concessions.json';  // Import du JSON

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Profile() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState(''); // Champ email en lecture seule
    const [name, setName] = useState('');
    const [concession, setConcession] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const { data: userData, error } = await supabase.auth.getUser();

            if (error || !userData?.user) {
                router.push('/?reason=session-expired');  // Redirige avec message
                return;
            }

            setUser(userData.user);
            setEmail(userData.user.email);  // Récupère l'email
            setName(userData.user.user_metadata?.name || '');
            setConcession(userData.user.user_metadata?.concession || '');
        }

        fetchUser();

        // Écoute les changements d'état d'auth (ex : déconnexion ou expiration de session)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.push('/?reason=session-expired');
            }
        });

        // Nettoyage de l'écouteur lors du démontage
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    async function updateProfile() {
        const { error } = await supabase.auth.updateUser({
            data: { name, concession }
        });

        if (error) {
            alert(`Erreur lors de la mise à jour du profil : ${error.message}`);
        } else {
            alert('Profil mis à jour !');
        }
    }

    async function updatePassword() {
        if (!newPassword) {
            alert('Veuillez renseigner un nouveau mot de passe.');
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert(`Erreur lors de la mise à jour du mot de passe : ${error.message}`);
        } else {
            alert('Mot de passe mis à jour avec succès !');
            setNewPassword('');
        }
    }

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <h1 className="text-xl font-bold">Profil utilisateur</h1>

                {/* Email en lecture seule */}
                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        readOnly
                        className="border p-2 w-full rounded bg-gray-100 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Nom</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border p-2 w-full rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Concession</label>
                    <select
                        value={concession}
                        onChange={(e) => setConcession(e.target.value)}
                        className="border p-2 w-full rounded"
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
                    onClick={updateProfile}
                    className="bg-blue-500 text-white p-2 w-full rounded"
                >
                    Mettre à jour le profil
                </button>

                <div>
                    <label className="block text-sm font-medium">Nouveau mot de passe</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border p-2 w-full rounded"
                    />
                </div>

                <button
                    onClick={updatePassword}
                    className="bg-blue-500 text-white p-2 w-full rounded"
                >
                    Changer le mot de passe
                </button>
            </div>
        </Layout>
    );
}