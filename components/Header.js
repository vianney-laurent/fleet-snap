
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Header({ userInitials = 'VL' }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const handleNavigation = (path) => {
        setMenuOpen(false);
        router.push(path);
    };

    return (
        <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm relative z-50">
            {/* Logo qui redirige vers /inventory */}
            <div className="flex items-center cursor-pointer" onClick={() => handleNavigation('/inventory')}>
                <img src="/logo.png" alt="Logo" className="h-8 mr-2" />
                <span className="font-bold text-lg text-gray-800"></span>
            </div>

            {/* Bouton profil (menu burger-like) */}
            <div className="relative">
                <button
                    className="w-10 h-10 bg-gray-200 text-gray-700 flex items-center justify-center rounded-full font-bold"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {userInitials}
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg">
                        <ul className="py-2 text-sm text-gray-700">
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => handleNavigation('/profile')}>
                                👤 Mon profil
                            </li>
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => handleNavigation('/history')}>
                                🔍 Mon inventaire
                            </li>
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                onClick={() => handleNavigation('/')}>
                                ⏻ Déconnexion
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
