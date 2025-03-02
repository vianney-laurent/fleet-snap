import { useState, useEffect, useRef } from 'react';
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
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [concession, setConcession] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showEmailTooltip, setShowEmailTooltip] = useState(false);
    const [showNameTooltip, setShowNameTooltip] = useState(false);
    const router = useRouter();

    const emailTooltipRef = useRef(null);
    const nameTooltipRef = useRef(null);

    useEffect(() => {
        async function fetchUser() {
            const { data: userData, error } = await supabase.auth.getUser();

            if (error || !userData?.user) {
                router.push('/?reason=session-expired');
                return;
            }

            setUser(userData.user);
            setEmail(userData.user.email);
            setName(userData.user.user_metadata?.name || '');
            setConcession(userData.user.user_metadata?.concession || '');
        }

        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (!session) {
                router.push('/?reason=session-expired');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    // Fermer les tooltips si on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                emailTooltipRef.current && !emailTooltipRef.current.contains(event.target) &&
                nameTooltipRef.current && !nameTooltipRef.current.contains(event.target)
            ) {
                setShowEmailTooltip(false);
                setShowNameTooltip(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function updateProfile() {
        const response = await fetch('/api/updateProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, concession })
        });

        if (response.ok) {
            alert('Profil mis à jour !');
            localStorage.setItem('userName', name);
            localStorage.setItem('userConcession', concession);
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert(`Erreur : ${errorData.error || 'Impossible de mettre à jour le profil'}`);
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

    const Tooltip = ({ text, show, tooltipRef }) => (
        show && (
            <div ref={tooltipRef} className="absolute left-6 top-6 mt-1 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-50 max-w-xs">
                {text}
            </div>
        )
    );

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <h1 className="text-xl font-bold">Profil utilisateur</h1>

                {/* Email en lecture seule avec tooltip */}
                <div className="relative">
                    <label className="block text-sm font-medium">Email</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="email"
                            value={email}
                            readOnly
                            className="border p-2 w-full rounded bg-gray-100 cursor-not-allowed"
                        />
                        <div
                            className="cursor-pointer text-gray-500"
                            onClick={() => setShowEmailTooltip(!showEmailTooltip)}
                        >
                            ⓘ
                        </div>
                    </div>
                    <Tooltip
                        text="L'email ne peut pas être modifié. Contactez le support pour toute demande."
                        show={showEmailTooltip}
                        tooltipRef={emailTooltipRef}
                    />
                </div>

                {/* Nom complet en lecture seule avec tooltip */}
                <div className="relative">
                    <label className="block text-sm font-medium">Nom complet</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={name}
                            readOnly
                            className="border p-2 w-full rounded bg-gray-100 cursor-not-allowed"
                        />
                        <div
                            className="cursor-pointer text-gray-500"
                            onClick={() => setShowNameTooltip(!showNameTooltip)}
                        >
                            ⓘ
                        </div>
                    </div>
                    <Tooltip
                        text="Le nom complet ne peut pas être modifié. Contactez le support pour toute demande."
                        show={showNameTooltip}
                        tooltipRef={nameTooltipRef}
                    />
                </div>

                {/* Dropdown Concession */}
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

                {/* Nouveau mot de passe */}
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