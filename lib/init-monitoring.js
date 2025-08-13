import { logger } from './logger';
import { startMetricsReporting } from './monitoring';

// Initialisation du système de monitoring
export function initializeMonitoring() {
  if (typeof window === 'undefined') { // Côté serveur uniquement
    logger.info('Initialisation du système de monitoring FleetSnap');
    
    // Démarrer le rapport de métriques périodique (toutes les 5 minutes)
    startMetricsReporting(5 * 60 * 1000);
    
    // Log de démarrage de l'application
    logger.info('Application FleetSnap démarrée', {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      env: process.env.NODE_ENV
    });

    // Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error('Erreur non capturée', error, {
        critical: true,
        type: 'uncaughtException'
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promise rejetée non gérée', reason, {
        critical: true,
        type: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    // Log de fermeture propre
    process.on('SIGTERM', () => {
      logger.info('Application FleetSnap en cours d\'arrêt (SIGTERM)');
    });

    process.on('SIGINT', () => {
      logger.info('Application FleetSnap en cours d\'arrêt (SIGINT)');
    });
  }
}

export default initializeMonitoring;