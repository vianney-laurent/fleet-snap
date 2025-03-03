import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setEmail(localStorage.getItem('userEmail') || '');
        setFullName(localStorage.getItem('userName') || '');
    }, []);

    const handleSendSupportRequest = async () => {
        if (!message.trim()) {
            alert('Veuillez décrire votre problème.');
            return;
        }

        const payload = {
            email,
            fullName,
            message,
        };

        const response = await fetch('https://hook.eu2.make.com/ton_webhook_make', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            alert('Votre demande a bien été envoyée.');
            setMessage('');
            setSupportModalOpen(false);
        } else {
            alert('Erreur lors de l’envoi de votre demande.');
        }
    };

    return (
        <>
            <Head>
                <title>Fleet Snap</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="min-h-screen bg-gray-100 flex flex-col">
                <Header onSupportClick={() => setSupportModalOpen(true)} />
                <main className="p-4 flex-1">
                    {children}
                </main>
                <Footer onSupportClick={() => setSupportModalOpen(true)} />

                {supportModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
                            <h2 className="text-xl font-bold mb-4">Contacter le support</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="border p-2 w-full bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Nom complet</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        readOnly
                                        className="border p-2 w-full bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Votre message</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="border p-2 w-full h-32 resize-none"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setSupportModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded">
                                        Annuler
                                    </button>
                                    <button onClick={handleSendSupportRequest} className="px-4 py-2 bg-blue-600 text-white rounded">
                                        Envoyer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}