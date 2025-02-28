import { useState } from 'react';
import Link from 'next/link';

export default function MobileMenu() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="p-2">
                ☰
            </button>
            {open && (
                <div className="absolute right-0 top-12 bg-white shadow-md rounded-md z-50 w-48">
                    <Link href="/inventory" className="block px-4 py-2 hover:bg-gray-100">Accueil</Link>
                    <Link href="/history" className="block px-4 py-2 hover:bg-gray-100">Historique</Link>
                    <Link href="/profile" className="block px-4 py-2 hover:bg-gray-100">Profil</Link>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => supabase.auth.signOut().then(() => location.href = '/')}>Déconnexion</button>
                </div>
            )}
        </div>
    );
}