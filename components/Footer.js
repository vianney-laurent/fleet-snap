export default function Footer({ onSupportClick }) {
    return (
        <footer className="w-full bg-white border-t border-gray-200 py-3 mt-4 flex justify-center items-center text-sm text-gray-600">
            <div className="flex space-x-6 items-center">
                <span>© {new Date().getFullYear()} Fleet Snap</span>
                <button
                    onClick={onSupportClick}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                >
                    <span className="text-base">🛠️</span>
                    <span>Support</span>
                </button>
            </div>
        </footer>
    );
}