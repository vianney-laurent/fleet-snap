import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

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

        const response = await fetch('https://hook.eu2.make.com/dyor7yt9fohp42sj4iec3awxokujivs8', {
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-200 ease-in-out">
                        <div className="bg-white rounded-md shadow-md p-6 w-full max-w-md relative space-y-4 transition-transform duration-200 ease-in-out transform">
                            <h2 className="text-xl font-semibold">Contacter le support</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="border border-gray-300 rounded-md p-2 w-full bg-gray-100 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Nom complet</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        readOnly
                                        className="border border-gray-300 rounded-md p-2 w-full bg-gray-100 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Votre message</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="border border-gray-300 rounded-md p-2 w-full h-32 resize-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setSupportModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                        Annuler
                                    </button>
                                    <button onClick={handleSendSupportRequest} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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