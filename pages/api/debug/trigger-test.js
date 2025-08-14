import { withApiLogging, logger } from '../../../lib/logger';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Collecter toutes les informations d'environnement
    const debugInfo = {
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'user-agent': req.headers['user-agent'],
        referer: req.headers.referer
      },
      url: req.url,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
        NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL
      }
    };

    // Construire les différentes URLs possibles
    const baseUrls = {
      fromOrigin: req.headers.origin,
      fromHost: req.headers.host ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}` : null,
      fromForwardedHost: req.headers['x-forwarded-host'] ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}` : null,
      fromVercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      fromVercelBranchUrl: process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
      fallback: 'http://localhost:3000'
    };

    // Tester chaque URL
    const testResults = {};
    
    for (const [key, baseUrl] of Object.entries(baseUrls)) {
      if (!baseUrl) {
        testResults[key] = { status: 'skipped', reason: 'URL not available' };
        continue;
      }

      try {
        const testUrl = `${baseUrl}/api/inventory/triggerOcr`;
        logger.info(`Test URL: ${testUrl}`);
        
        const startTime = Date.now();
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'FleetSnap-Debug-Test',
            'X-Triggered-By': 'debug-test',
            'X-User-Id': 'debug-user'
          },
          // Timeout de 10 secondes
          signal: AbortSignal.timeout(10000)
        });
        
        const duration = Date.now() - startTime;
        const responseText = await response.text();
        
        testResults[key] = {
          status: response.ok ? 'success' : 'error',
          httpStatus: response.status,
          duration,
          responseSize: responseText.length,
          responsePreview: responseText.substring(0, 200),
          url: testUrl
        };
        
      } catch (error) {
        testResults[key] = {
          status: 'failed',
          error: error.message,
          url: `${baseUrl}/api/inventory/triggerOcr`
        };
      }
    }

    logger.info('Test de déclenchement OCR terminé', {
      debugInfo,
      testResults
    });

    return res.status(200).json({
      message: 'Test de déclenchement OCR terminé',
      debugInfo,
      baseUrls,
      testResults,
      recommendation: getRecommendation(testResults)
    });

  } catch (err) {
    logger.error('Erreur test déclenchement OCR', err);
    return res.status(500).json({ error: err.message });
  }
}

function getRecommendation(testResults) {
  const successful = Object.entries(testResults).filter(([key, result]) => result.status === 'success');
  
  if (successful.length === 0) {
    return {
      status: 'critical',
      message: 'Aucune URL ne fonctionne - problème de configuration réseau',
      action: 'Vérifier la configuration Vercel et les variables d\'environnement'
    };
  }
  
  const fastest = successful.reduce((prev, curr) => 
    (curr[1].duration < prev[1].duration) ? curr : prev
  );
  
  return {
    status: 'success',
    message: `URL recommandée: ${fastest[0]}`,
    fastestUrl: fastest[1].url,
    duration: fastest[1].duration,
    action: `Utiliser la stratégie "${fastest[0]}" pour construire l'URL de base`
  };
}

export default withApiLogging(handler);