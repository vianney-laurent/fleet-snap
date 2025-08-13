export { reportWebVitals } from 'next-axiom';
import { AxiomWebVitals } from 'next-axiom';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { logger } from '../lib/logger';
import { initializeMonitoring } from '../lib/init-monitoring';
import '../styles/globals.css';

// Initialiser le monitoring au chargement du module
if (typeof window === 'undefined') {
  initializeMonitoring();
}

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        // Log des changements de route
        const handleRouteChange = (url) => {
            logger.info('Navigation', { 
                route: url,
                timestamp: new Date().toISOString()
            });
        };

        const handleRouteError = (err, url) => {
            logger.error('Erreur de navigation', err, { 
                route: url,
                timestamp: new Date().toISOString()
            });
        };

        router.events.on('routeChangeComplete', handleRouteChange);
        router.events.on('routeChangeError', handleRouteError);

        // Log du chargement initial de l'app
        logger.info('Application initialisée', {
            route: router.pathname,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
        });

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
            router.events.off('routeChangeError', handleRouteError);
        };
    }, [router]);

    return (
        <>
            <Component {...pageProps} />
            <AxiomWebVitals />
        </>
    );
}