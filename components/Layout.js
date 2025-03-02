import Head from 'next/head';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <>
            <Head>
                <title>Fleet Snap</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="min-h-screen bg-gray-100">
                <Header />
                <main className="p-4">
                    {children}
                </main>
            </div>
        </>
    );
}