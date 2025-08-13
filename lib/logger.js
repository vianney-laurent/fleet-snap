import { log } from 'next-axiom';

// Utilitaire de logging centralisé pour FleetSnap
// Masque automatiquement les données sensibles

const SENSITIVE_FIELDS = [
  'password', 'token', 'access_token', 'refresh_token', 'api_key', 'secret',
  'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'BREVO_API_KEY',
  'authorization', 'cookie', 'session'
];

// Fonction pour masquer les données sensibles
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Logger principal avec niveaux
export const logger = {
  info: (message, data = {}) => {
    log.info(message, sanitizeData(data));
  },
  
  warn: (message, data = {}) => {
    log.warn(message, sanitizeData(data));
  },
  
  error: (message, error = null, data = {}) => {
    const errorData = {
      ...sanitizeData(data),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };
    log.error(message, errorData);
  },
  
  // Logs spécialisés pour l'authentification
  auth: {
    login: (email, success, metadata = {}) => {
      log.info('Tentative de connexion', sanitizeData({
        email,
        success,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    logout: (email, metadata = {}) => {
      log.info('Déconnexion utilisateur', sanitizeData({
        email,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    sessionExpired: (email, metadata = {}) => {
      log.warn('Session expirée', sanitizeData({
        email,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    }
  },
  
  // Logs spécialisés pour l'inventaire
  inventory: {
    upload: (userId, fileCount, zone, concession, metadata = {}) => {
      log.info('Upload inventaire', sanitizeData({
        userId,
        fileCount,
        zone,
        concession,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    ocrResult: (userId, identifiant, confidence, metadata = {}) => {
      log.info('Résultat OCR', sanitizeData({
        userId,
        identifiant,
        confidence,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    error: (userId, error, metadata = {}) => {
      log.error('Erreur inventaire', error, sanitizeData({
        userId,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    }
  },
  
  // Logs spécialisés pour l'administration
  admin: {
    userCreated: (adminEmail, newUserEmail, concession, metadata = {}) => {
      log.info('Utilisateur créé', sanitizeData({
        adminEmail,
        newUserEmail,
        concession,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    userUpdated: (adminEmail, targetUserEmail, changes, metadata = {}) => {
      log.info('Utilisateur modifié', sanitizeData({
        adminEmail,
        targetUserEmail,
        changes,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    concessionManaged: (adminEmail, action, concessionName, metadata = {}) => {
      log.info('Gestion concession', sanitizeData({
        adminEmail,
        action, // 'created', 'updated', 'deleted'
        concessionName,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    export: (userEmail, concession, dateRange, recordCount, metadata = {}) => {
      log.info('Export données', sanitizeData({
        userEmail,
        concession,
        dateRange,
        recordCount,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    }
  },
  
  // Logs spécialisés pour les performances
  performance: {
    apiCall: (endpoint, method, duration, statusCode, metadata = {}) => {
      log.info('Performance API', sanitizeData({
        endpoint,
        method,
        duration,
        statusCode,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    },
    
    slowQuery: (query, duration, metadata = {}) => {
      log.warn('Requête lente détectée', sanitizeData({
        query,
        duration,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    }
  }
};

// Middleware pour logger automatiquement les requêtes API
export function withApiLogging(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const { method, url } = req;
    
    try {
      logger.info('Requête API reçue', {
        method,
        url,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      
      const result = await handler(req, res);
      
      const duration = Date.now() - startTime;
      logger.performance.apiCall(url, method, duration, res.statusCode);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erreur API', error, {
        method,
        url,
        duration,
        statusCode: res.statusCode || 500
      });
      throw error;
    }
  };
}

export default logger;