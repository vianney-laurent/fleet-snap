import { withApiLogging, logger } from '../../../lib/logger';
import { metricsCollector } from '../../../lib/monitoring';

const MONITORING_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersecret';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Vérification du mot de passe admin via header
  const authHeader = req.headers.authorization;
  const providedPassword = authHeader?.replace('Bearer ', '');
  
  if (!providedPassword || providedPassword !== MONITORING_PASSWORD) {
    logger.warn('Tentative accès métriques avec authentification invalide', {
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      hasAuth: !!authHeader
    });
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const summary = metricsCollector.getSummary();
    const anomalies = metricsCollector.detectAnomalies();
    
    logger.info('Consultation métriques', {
      requestedBy: 'monitoring_dashboard',
      metricsCount: Object.keys(summary.apis).length,
      anomaliesCount: anomalies.length
    });

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      summary,
      anomalies,
      health: anomalies.length === 0 ? 'healthy' : 'warning'
    });
  } catch (error) {
    logger.error('Erreur récupération métriques', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withApiLogging(handler);