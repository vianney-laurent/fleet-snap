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
        <header className="w-full bg-white shadow-md">
            {/* Logo qui prend la largeur max avec hauteur adaptée */}


            {/* Menu navigation */}
            <div className="flex justify-between items-center p-4">

                {/* Menu burger pour mobile */}
                <div className="md:hidden">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-700">
                        ☰
                    </button>
                </div>

                {/* Menu Desktop */}
                <nav className="hidden md:flex space-x-6">
                    <button onClick={() => router.push('/history')} className="text-gray-700 hover:text-blue-600">
                        Historique
                    </button>
                    <button onClick={() => router.push('/profile')} className="text-gray-700 hover:text-blue-600">
                        Profil
                    </button>
                    <button onClick={handleLogout} className="text-red-600 hover:text-red-800">
                        Déconnexion
                    </button>
                </nav>
            </div>

            {/* Menu déroulant mobile */}
            {menuOpen && (
                <div className="md:hidden bg-white shadow-md absolute top-[80px] right-0 w-48 z-50">
                    <button onClick={() => router.push('/history')} className="block w-full text-left p-2 hover:bg-gray-100">
                        Historique
                    </button>
                    <button onClick={() => router.push('/profile')} className="block w-full text-left p-2 hover:bg-gray-100">
                        Profil
                    </button>
                    <button onClick={handleLogout} className="block w-full text-left p-2 text-red-600 hover:bg-gray-100">
                        Déconnexion
                    </button>
                </div>
            )}
        </header>
    );
}