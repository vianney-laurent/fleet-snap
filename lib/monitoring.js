import { logger } from './logger';

// Configuration de monitoring pour FleetSnap
export const MONITORING_CONFIG = {
  // Seuils d'alerte
  SLOW_API_THRESHOLD: 5000, // 5 secondes
  SLOW_OCR_THRESHOLD: 10000, // 10 secondes
  ERROR_RATE_THRESHOLD: 0.1, // 10% d'erreurs
  
  // Métriques à surveiller
  CRITICAL_APIS: [
    '/api/inventory',
    '/api/createUser',
    '/api/exportInventory'
  ],
  
  // Événements critiques
  CRITICAL_EVENTS: [
    'auth_failure',
    'ocr_error',
    'storage_error',
    'database_error'
  ]
};

// Classe pour collecter et analyser les métriques
export class MetricsCollector {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      errors: new Map(),
      performance: new Map(),
      users: new Map()
    };
  }

  // Enregistrer un appel API
  recordApiCall(endpoint, method, duration, statusCode, userId = null) {
    const key = `${method} ${endpoint}`;
    
    if (!this.metrics.apiCalls.has(key)) {
      this.metrics.apiCalls.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastCall: null
      });
    }
    
    const metric = this.metrics.apiCalls.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.lastCall = new Date();
    
    if (statusCode >= 400) {
      metric.errors++;
    }
    
    // Log si l'API est lente
    if (duration > MONITORING_CONFIG.SLOW_API_THRESHOLD) {
      logger.performance.slowQuery(key, duration, { 
        statusCode, 
        userId,
        threshold: MONITORING_CONFIG.SLOW_API_THRESHOLD
      });
    }
    
    // Log si c'est une API critique
    if (MONITORING_CONFIG.CRITICAL_APIS.includes(endpoint)) {
      logger.performance.apiCall(endpoint, method, duration, statusCode, { 
        userId,
        critical: true
      });
    }
  }

  // Enregistrer une erreur
  recordError(type, error, context = {}) {
    const key = `${type}_${error.name || 'Unknown'}`;
    
    if (!this.metrics.errors.has(key)) {
      this.metrics.errors.set(key, {
        count: 0,
        lastOccurrence: null,
        contexts: []
      });
    }
    
    const metric = this.metrics.errors.get(key);
    metric.count++;
    metric.lastOccurrence = new Date();
    metric.contexts.push({
      ...context,
      timestamp: new Date(),
      message: error.message
    });
    
    // Garder seulement les 10 derniers contextes
    if (metric.contexts.length > 10) {
      metric.contexts = metric.contexts.slice(-10);
    }
    
    // Log si c'est un événement critique
    if (MONITORING_CONFIG.CRITICAL_EVENTS.includes(type)) {
      logger.error(`Événement critique: ${type}`, error, {
        ...context,
        critical: true,
        occurrenceCount: metric.count
      });
    }
  }

  // Enregistrer l'activité utilisateur
  recordUserActivity(userId, action, metadata = {}) {
    if (!this.metrics.users.has(userId)) {
      this.metrics.users.set(userId, {
        actions: new Map(),
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }
    
    const userMetric = this.metrics.users.get(userId);
    userMetric.lastSeen = new Date();
    
    if (!userMetric.actions.has(action)) {
      userMetric.actions.set(action, {
        count: 0,
        lastPerformed: null
      });
    }
    
    const actionMetric = userMetric.actions.get(action);
    actionMetric.count++;
    actionMetric.lastPerformed = new Date();
    
    logger.info('Activité utilisateur', {
      userId,
      action,
      count: actionMetric.count,
      ...metadata
    });
  }

  // Obtenir un résumé des métriques
  getSummary() {
    const summary = {
      timestamp: new Date(),
      apis: {},
      errors: {},
      users: {
        total: this.metrics.users.size,
        active: 0
      }
    };
    
    // Résumé des APIs
    for (const [endpoint, metric] of this.metrics.apiCalls) {
      summary.apis[endpoint] = {
        calls: metric.count,
        avgDuration: metric.totalDuration / metric.count,
        errorRate: metric.errors / metric.count,
        lastCall: metric.lastCall
      };
    }
    
    // Résumé des erreurs
    for (const [errorType, metric] of this.metrics.errors) {
      summary.errors[errorType] = {
        count: metric.count,
        lastOccurrence: metric.lastOccurrence
      };
    }
    
    // Utilisateurs actifs (dernière heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [userId, userMetric] of this.metrics.users) {
      if (userMetric.lastSeen > oneHourAgo) {
        summary.users.active++;
      }
    }
    
    return summary;
  }

  // Détecter les anomalies
  detectAnomalies() {
    const anomalies = [];
    
    // Vérifier les taux d'erreur élevés
    for (const [endpoint, metric] of this.metrics.apiCalls) {
      const errorRate = metric.errors / metric.count;
      if (errorRate > MONITORING_CONFIG.ERROR_RATE_THRESHOLD) {
        anomalies.push({
          type: 'high_error_rate',
          endpoint,
          errorRate,
          threshold: MONITORING_CONFIG.ERROR_RATE_THRESHOLD
        });
      }
    }
    
    // Vérifier les performances dégradées
    for (const [endpoint, metric] of this.metrics.apiCalls) {
      const avgDuration = metric.totalDuration / metric.count;
      if (avgDuration > MONITORING_CONFIG.SLOW_API_THRESHOLD) {
        anomalies.push({
          type: 'slow_performance',
          endpoint,
          avgDuration,
          threshold: MONITORING_CONFIG.SLOW_API_THRESHOLD
        });
      }
    }
    
    if (anomalies.length > 0) {
      logger.warn('Anomalies détectées', { anomalies });
    }
    
    return anomalies;
  }
}

// Instance globale du collecteur de métriques
export const metricsCollector = new MetricsCollector();

// Fonction utilitaire pour envoyer des métriques périodiques
export function startMetricsReporting(intervalMs = 300000) { // 5 minutes par défaut
  if (typeof window === 'undefined') { // Seulement côté serveur
    setInterval(() => {
      const summary = metricsCollector.getSummary();
      const anomalies = metricsCollector.detectAnomalies();
      
      logger.info('Rapport métriques périodique', {
        summary,
        anomaliesCount: anomalies.length
      });
      
      if (anomalies.length > 0) {
        logger.warn('Anomalies système détectées', { anomalies });
      }
    }, intervalMs);
  }
}

// Middleware pour intégrer automatiquement les métriques
export function withMetrics(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const { method, url } = req;
    
    try {
      const result = await handler(req, res);
      const duration = Date.now() - startTime;
      
      metricsCollector.recordApiCall(url, method, duration, res.statusCode);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordApiCall(url, method, duration, res.statusCode || 500);
      metricsCollector.recordError('api_error', error, { method, url });
      
      throw error;
    }
  };
}

export default metricsCollector;