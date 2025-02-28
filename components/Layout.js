import Header from './Header';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <main className="p-4">{children}</main>
        </div>
    );
}