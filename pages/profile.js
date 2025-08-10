import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { log } from 'next-axiom';

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
    const [concessionList, setConcessionList] = useState([]);

    useEffect(() => {
        async function fetchConcessions() {
            log.info('fetchConcessions Profile démarré');
            try {
                const response = await fetch('/api/getConcessions');
                const result = await response.json();
                if (response.ok) {
                    setConcessionList(result.concessions); // concessions = [{id, name}]
                    log.info('Concessions chargées', { count: result.concessions.length });
                } else {
                    log.error('fetchConcessions Profile error', { error: result.error });
                }
            } catch (err) {
                log.error('fetchConcessions Profile exception', { message: err.message, stack: err.stack });
            }
        }
        fetchConcessions();
    }, []);

    const emailTooltipRef = useRef(null);
    const nameTooltipRef = useRef(null);

    useEffect(() => {
        async function fetchUser() {
            const { data: userData, error } = await supabase.auth.getUser();
            log.info('Utilisateur récupéré dans Profile', { user: userData.user });

            if (error || !userData?.user) {
                log.warn('Utilisateur non authentifié Profile, redirection');
                router.push('/?reason=session-expired');
                return;
            }

            setUser(userData.user);
            setEmail(userData.user.email);
            setName(userData.user.user_metadata?.name || '');
            setConcession(userData.user.user_metadata?.concession || '');
            log.debug('Profile initialisé', {
              email: userData.user.email,
              name: userData.user.user_metadata?.name,
              concession: userData.user.user_metadata?.concession
            });
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
    log.info('updateProfile démarré', { userId: user?.id, name, concession });
    if (!user?.id) {
        log.warn('updateProfile: utilisateur non identifié');
        alert("Utilisateur non identifié.");
        return;
    }
    const response = await fetch('/api/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name, concession })
    });

    if (response.ok) {
        alert("Profil mis à jour ! Pour que la modification soit prise en compte, vous allez être déconnecté(e) et devrez vous reconnecter.");
        log.info('Profil mis à jour avec succès', { status: response.status });
        await supabase.auth.signOut();
        router.push('/?reason=refresh-required');
    } else {
        const errorData = await response.json();
        log.error('Erreur mise à jour profil', { error: errorData.error });
        alert(`Erreur : ${errorData.error || 'Impossible de mettre à jour le profil'}`);
    }
}

    async function updatePassword() {
        log.info('updatePassword démarré');
        if (!newPassword) {
            log.warn('updatePassword: mot de passe vide');
            alert('Veuillez renseigner un nouveau mot de passe.');
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) {
            log.error('Erreur mise à jour mot de passe', { message: error.message });
        } else {
            log.info('Mot de passe mis à jour avec succès', { userId: user?.id });
        }
        if (error) {
            alert(`Erreur lors de la mise à jour du mot de passe : ${error.message}`);
        } else {
            alert('Mot de passe mis à jour avec succès !');
            setNewPassword('');
        }
    }

    const Tooltip = ({ text, show, onClose, tooltipRef }) => (
        show && (
            <div
                ref={tooltipRef}
                className="absolute left-6 top-6 mt-2 bg-gray-800 text-white text-xs rounded-md p-3 shadow-md z-50 max-w-xs"
                style={{ transform: 'translateX(-20px)' }} // Décalage pour ne pas recouvrir le "i"
            >
                <div className="flex justify-between items-center">
                    <span>{text}</span>
                    <button
                        onClick={onClose}
                        className="ml-2 text-white font-bold"
                    >
                        ✖
                    </button>
                </div>
            </div>
        )
    );

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-semibold">Profil utilisateur</h1>

                {/* Email en lecture seule avec tooltip */}
                <div className="relative">
                    <label className="block text-sm font-medium">Email</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="email"
                            value={email}
                            readOnly
                            className="border border-gray-300 rounded-md p-2 w-full bg-gray-100 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
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
                        onClose={() => setShowEmailTooltip(false)}
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
                            className="border border-gray-300 rounded-md p-2 w-full bg-gray-100 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
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
                        onClose={() => setShowNameTooltip(false)}
                        tooltipRef={nameTooltipRef}
                    />
                </div>

                {/* Dropdown Concession */}
                <div>
                    <label className="block text-sm font-medium">Concession</label>
                    <select
                        value={concession}
                        onChange={(e) => setConcession(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                    >
                        <option value="">Sélectionnez une concession</option>
                        {concessionList.map((c) => (
                            <option key={c.id} value={c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={updateProfile}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                        className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                    />
                </div>

                <button
                    onClick={updatePassword}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Changer le mot de passe
                </button>
            </div>
        </Layout>
    );
}