import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Header({ onSupportClick }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [userInitials, setUserInitials] = useState('??');

    const router = useRouter();

    useEffect(() => {
        const fullName = localStorage.getItem('userName') || '';
        if (fullName) {
            const initials = getInitials(fullName);
            setUserInitials(initials);
        } else {
            setUserInitials('??');
        }
    }, []);

    const getInitials = (name) => {
        const parts = name.split(' ');
        if (parts.length === 1) {
            return parts[0][0]?.toUpperCase() || '?';
        }
        return (parts[0][0] + parts[1][0])?.toUpperCase();
    };

    const handleNavigation = (path) => {
        setMenuOpen(false);
        router.push(path);
    };

    return (
        <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm relative z-50">
            <div className="flex items-center cursor-pointer" onClick={() => handleNavigation('/inventory')}>
                <img src="/logo.png" alt="Logo" className="h-8 mr-2" />
            </div>

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
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleNavigation('/profile')}>
                                👤 Mon profil
                            </li>
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleNavigation('/history')}>
                                🔍 Mon inventaire
                            </li>
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={onSupportClick}>
                                🛠️ Support
                            </li>
                            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleNavigation('/')}>
                                ⏻ Déconnexion
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}