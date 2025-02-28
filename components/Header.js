import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <header className="flex justify-between items-center p-4 bg-blue-500 text-white">
            <img
                src="/logo.png"
                alt="Fleet Snap"
                className="h-10 cursor-pointer"
                onClick={() => router.push('/inventory')}
            />
            <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
                    ☰
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md text-black">
                        <button
                            onClick={() => router.push('/history')}
                            className="block w-full text-left p-2 hover:bg-gray-200"
                        >
                            Historique
                        </button>
                        <button
                            onClick={() => router.push('/profile')}
                            className="block w-full text-left p-2 hover:bg-gray-200"
                        >
                            Profil
                        </button>
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left p-2 text-red-600 hover:bg-gray-200"
                        >
                            Déconnexion
                        </button>
                    </div>
                )}
            </div>
            <nav className="hidden md:flex space-x-4">
                <button onClick={() => router.push('/history')} className="hover:underline">Historique</button>
                <button onClick={() => router.push('/profile')} className="hover:underline">Profil</button>
                <button onClick={handleLogout} className="text-red-600 hover:underline">Déconnexion</button>
            </nav>
        </header>
    );
}