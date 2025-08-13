import { withApiLogging, logger } from '../../../lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Vérification Supabase Database
    const dbStart = Date.now();
    try {
      const { data, error } = await supabase
        .from('inventaire')
        .select('id')
        .limit(1);
      
      healthChecks.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStart,
        error: error?.message || null
      };
    } catch (dbError) {
      healthChecks.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: dbError.message
      };
    }

    // Vérification Supabase Storage
    const storageStart = Date.now();
    try {
      const { data, error } = await supabase.storage
        .from('photos')
        .list('', { limit: 1 });
      
      healthChecks.checks.storage = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - storageStart,
        error: error?.message || null
      };
    } catch (storageError) {
      healthChecks.checks.storage = {
        status: 'unhealthy',
        responseTime: Date.now() - storageStart,
        error: storageError.message
      };
    }

    // Vérification des variables d'environnement critiques
    const envVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GEMINI_API_KEY',
      'BREVO_API_KEY',
      'NEXT_PUBLIC_AXIOM_TOKEN'
    ];

    const missingEnvVars = envVars.filter(varName => !process.env[varName]);
    
    healthChecks.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      missingVariables: missingEnvVars,
      totalVariables: envVars.length
    };

    // Vérification de la mémoire (Node.js)
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    healthChecks.checks.memory = {
      status: memUsageMB.heapUsed < 500 ? 'healthy' : 'warning', // 500MB threshold
      usage: memUsageMB,
      uptime: Math.round(process.uptime())
    };

    // Déterminer le statut global
    const allStatuses = Object.values(healthChecks.checks).map(check => check.status);
    if (allStatuses.includes('unhealthy')) {
      healthChecks.status = 'unhealthy';
    } else if (allStatuses.includes('warning')) {
      healthChecks.status = 'warning';
    }

    // Logger le résultat
    logger.info('Health check effectué', {
      status: healthChecks.status,
      checks: Object.keys(healthChecks.checks).length,
      unhealthyChecks: allStatuses.filter(s => s === 'unhealthy').length
    });

    // Retourner le code de statut approprié
    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'warning' ? 200 : 503;

    return res.status(statusCode).json(healthChecks);

  } catch (error) {
    logger.error('Erreur health check', error);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message,
      checks: healthChecks.checks
    });
  }
}

export default withApiLogging(handler);