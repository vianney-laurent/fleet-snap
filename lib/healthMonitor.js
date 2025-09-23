// lib/healthMonitor.js
// Système de monitoring de santé et performance de l'application

import { logger } from './logger';
import { memoryMonitor, requestManager } from './performanceOptimizer';
import { rateLimiter } from './securityValidator';

/**
 * Moniteur de santé de l'application
 */
class HealthMonitor {
  constructor() {
    this.checks = new Map();
    this.metrics = {
      uptime: Date.now(),
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        lastError: null
      },
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      resources: {
        memory: null,
        cpu: null
      }
    };
    
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
  }

  /**
   * Enregistrer un check de santé
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      lastResult: null,
      lastRun: null,
      failures: 0,
      maxFailures: options.maxFailures || 3
    });
  }

  /**
   * Exécuter tous les checks de santé
   */
  async runHealthChecks() {
    const results = {};
    let overallHealth = true;
    
    for (const [name, check] of this.checks.entries()) {
      try {
        const startTime = Date.now();
        
        // Exécuter le check avec timeout
        const result = await Promise.race([
          check.fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), check.timeout)
          )
        ]);
        
        const duration = Date.now() - startTime;
        
        check.lastResult = {
          status: 'healthy',
          duration,
          timestamp: Date.now(),
          details: result
        };
        check.lastRun = Date.now();
        check.failures = 0;
        
        results[name] = check.lastResult;
        
      } catch (error) {
        check.failures++;
        check.lastResult = {
          status: 'unhealthy',
          error: error.message,
          timestamp: Date.now(),
          failures: check.failures
        };
        check.lastRun = Date.now();
        
        results[name] = check.lastResult;
        
        // Si c'est un check critique et qu'il a échoué trop de fois
        if (check.critical && check.failures >= check.maxFailures) {
          overallHealth = false;
        }
        
        logger.warn('Health check échoué', { 
          check: name, 
          error: error.message,
          failures: check.failures,
          critical: check.critical
        });
      }
    }
    
    this.isHealthy = overallHealth;
    this.lastHealthCheck = Date.now();
    
    return {
      healthy: overallHealth,
      timestamp: this.lastHealthCheck,
      checks: results,
      uptime: Date.now() - this.metrics.uptime
    };
  }

  /**
   * Enregistrer une requête
   */
  recordRequest(success, responseTime, error = null) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
      this.metrics.requests.lastError = {
        message: error?.message,
        timestamp: Date.now()
      };
    }
    
    // Mettre à jour les métriques de performance
    if (responseTime) {
      const total = this.metrics.requests.total;
      this.metrics.performance.avgResponseTime = 
        (this.metrics.performance.avgResponseTime * (total - 1) + responseTime) / total;
      
      this.metrics.performance.maxResponseTime = 
        Math.max(this.metrics.performance.maxResponseTime, responseTime);
      
      this.metrics.performance.minResponseTime = 
        Math.min(this.metrics.performance.minResponseTime, responseTime);
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      healthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      memory: memoryMonitor.getStats(),
      requestManager: requestManager.getStats(),
      rateLimiter: rateLimiter.getStats()
    };
  }

  /**
   * Démarrer le monitoring automatique
   */
  startMonitoring(interval = 30000) { // 30 secondes
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
        
        // Log périodique des métriques
        if (this.metrics.requests.total % 100 === 0) {
          logger.info('Métriques système', this.getMetrics());
        }
        
      } catch (error) {
        logger.error('Erreur monitoring santé', error);
      }
    }, interval);
    
    logger.info('Monitoring santé démarré', { interval });
  }

  /**
   * Arrêter le monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Monitoring santé arrêté');
    }
  }

  /**
   * Réinitialiser les métriques
   */
  resetMetrics() {
    this.metrics = {
      uptime: Date.now(),
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        lastError: null
      },
      performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      resources: {
        memory: null,
        cpu: null
      }
    };
    
    logger.info('Métriques réinitialisées');
  }
}

// Instance globale
export const healthMonitor = new HealthMonitor();

/**
 * Checks de santé prédéfinis
 */

// Check de base de données Supabase
export function createSupabaseHealthCheck(supabase) {
  return async () => {
    const { data, error } = await supabase
      .from('inventaire')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return { status: 'connected', timestamp: Date.now() };
  };
}

// Check de l'API Gemini
export function createGeminiHealthCheck(ai) {
  return async () => {
    try {
      // Test simple avec une petite requête
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ text: 'Test' }] },
        config: { maxOutputTokens: 5 }
      });
      
      if (!response.text) {
        throw new Error('Pas de réponse de Gemini');
      }
      
      return { status: 'connected', timestamp: Date.now() };
    } catch (error) {
      throw new Error(`Gemini error: ${error.message}`);
    }
  };
}

// Check de mémoire
export function createMemoryHealthCheck() {
  return async () => {
    if (typeof window === 'undefined') {
      return { status: 'server-side', timestamp: Date.now() };
    }
    
    const memory = performance.memory;
    if (!memory) {
      return { status: 'not-available', timestamp: Date.now() };
    }
    
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    
    const usage = (usedMB / limitMB) * 100;
    
    if (usage > 90) {
      throw new Error(`Utilisation mémoire critique: ${usage.toFixed(1)}%`);
    }
    
    if (usage > 75) {
      logger.warn('Utilisation mémoire élevée', { usage: usage.toFixed(1) + '%' });
    }
    
    return {
      usedMB,
      totalMB,
      limitMB,
      usage: usage.toFixed(1) + '%',
      timestamp: Date.now()
    };
  };
}

// Check de connectivité réseau
export function createNetworkHealthCheck() {
  return async () => {
    if (typeof window === 'undefined') {
      return { status: 'server-side', timestamp: Date.now() };
    }
    
    if (!navigator.onLine) {
      throw new Error('Pas de connexion réseau');
    }
    
    // Test de connectivité avec un endpoint rapide
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return {
        online: true,
        latency,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Connectivité: ${error.message}`);
    }
  };
}

/**
 * Middleware pour enregistrer les métriques de requête
 */
export function withHealthMonitoring(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    let success = false;
    let error = null;
    
    try {
      const result = await handler(req, res);
      success = true;
      return result;
    } catch (err) {
      error = err;
      success = false;
      throw err;
    } finally {
      const responseTime = Date.now() - startTime;
      healthMonitor.recordRequest(success, responseTime, error);
    }
  };
}

/**
 * Endpoint de santé pour les checks externes
 */
export async function createHealthEndpoint() {
  return async (req, res) => {
    try {
      const health = await healthMonitor.runHealthChecks();
      const metrics = healthMonitor.getMetrics();
      
      const status = health.healthy ? 200 : 503;
      
      res.status(status).json({
        ...health,
        metrics: {
          uptime: metrics.uptime,
          requests: metrics.requests,
          performance: metrics.performance,
          memory: metrics.memory
        }
      });
    } catch (error) {
      logger.error('Erreur endpoint santé', error);
      res.status(500).json({
        healthy: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  };
}

/**
 * Initialisation du monitoring avec checks par défaut
 */
export function initializeHealthMonitoring(supabase, ai) {
  // Enregistrer les checks de base
  healthMonitor.registerCheck('memory', createMemoryHealthCheck(), {
    critical: true,
    maxFailures: 3
  });
  
  healthMonitor.registerCheck('network', createNetworkHealthCheck(), {
    critical: false,
    maxFailures: 5
  });
  
  if (supabase) {
    healthMonitor.registerCheck('supabase', createSupabaseHealthCheck(supabase), {
      critical: true,
      maxFailures: 3,
      timeout: 10000
    });
  }
  
  if (ai) {
    healthMonitor.registerCheck('gemini', createGeminiHealthCheck(ai), {
      critical: false,
      maxFailures: 5,
      timeout: 15000
    });
  }
  
  // Démarrer le monitoring
  healthMonitor.startMonitoring(30000); // 30 secondes
  
  // Démarrer le monitoring mémoire
  memoryMonitor.startMonitoring(30000);
  
  logger.info('Monitoring santé initialisé');
  
  return healthMonitor;
}

export default {
  HealthMonitor,
  healthMonitor,
  createSupabaseHealthCheck,
  createGeminiHealthCheck,
  createMemoryHealthCheck,
  createNetworkHealthCheck,
  withHealthMonitoring,
  createHealthEndpoint,
  initializeHealthMonitoring
};