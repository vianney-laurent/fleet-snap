// lib/performanceOptimizer.js
// Utilitaires d'optimisation des performances et gestion mémoire

import { logger } from './logger';

/**
 * Gestionnaire de cache avec TTL et limite de taille
 */
class MemoryCache {
  constructor(maxSize = 100, defaultTTL = 300000) { // 5 minutes par défaut
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Nettoyer si cache plein
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Nettoyer l'ancien timer si existant
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Stocker la valeur avec timestamp
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0
    });

    // Programmer l'expiration
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }

    // Mettre à jour les statistiques d'accès
    item.accessCount++;
    this.hits++;
    
    return item.value;
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear() {
    // Nettoyer tous les timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  evictOldest() {
    // Éviction basée sur l'âge et la fréquence d'accès
    let oldestKey = null;
    let oldestScore = Infinity;

    for (const [key, item] of this.cache.entries()) {
      const age = Date.now() - item.timestamp;
      const score = age / (item.accessCount + 1); // Plus utilisé = score plus bas
      
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  getStats() {
    const hitRate = this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      maxSize: this.maxSize
    };
  }
}

/**
 * Debouncer pour limiter les appels fréquents
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  let lastCallTime = 0;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        lastCallTime = Date.now();
        func.apply(this, args);
      }
    };

    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      lastCallTime = Date.now();
      func.apply(this, args);
    }
  };
}

/**
 * Throttler pour limiter la fréquence d'exécution
 */
export function throttle(func, limit) {
  let inThrottle;
  let lastCallTime = 0;
  
  return function(...args) {
    if (!inThrottle) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      
      if (timeSinceLastCall >= limit) {
        lastCallTime = now;
        func.apply(this, args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    }
  };
}

/**
 * Gestionnaire de requêtes avec retry et circuit breaker
 */
class RequestManager {
  constructor() {
    this.activeRequests = new Map();
    this.failureCount = new Map();
    this.circuitBreakers = new Map();
    this.maxRetries = 3;
    this.baseDelay = 1000;
    this.maxDelay = 10000;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerTimeout = 30000;
  }

  async executeWithRetry(key, requestFn, options = {}) {
    const {
      maxRetries = this.maxRetries,
      baseDelay = this.baseDelay,
      maxDelay = this.maxDelay,
      retryCondition = (error) => error.status >= 500 || error.name === 'TypeError'
    } = options;

    // Vérifier le circuit breaker
    if (this.isCircuitOpen(key)) {
      throw new Error(`Circuit breaker ouvert pour ${key}`);
    }

    // Déduplication des requêtes identiques
    if (this.activeRequests.has(key)) {
      logger.info('Requête dédupliquée', { key });
      return this.activeRequests.get(key);
    }

    const requestPromise = this.executeRequest(key, requestFn, maxRetries, baseDelay, maxDelay, retryCondition);
    this.activeRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key, error);
      throw error;
    } finally {
      this.activeRequests.delete(key);
    }
  }

  async executeRequest(key, requestFn, maxRetries, baseDelay, maxDelay, retryCondition) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        logger.warn('Retry requête', { key, attempt: attempt + 1, delay, error: error.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  onSuccess(key) {
    this.failureCount.delete(key);
    if (this.circuitBreakers.has(key)) {
      logger.info('Circuit breaker fermé', { key });
      this.circuitBreakers.delete(key);
    }
  }

  onFailure(key, error) {
    const failures = (this.failureCount.get(key) || 0) + 1;
    this.failureCount.set(key, failures);

    if (failures >= this.circuitBreakerThreshold) {
      logger.warn('Circuit breaker ouvert', { key, failures });
      this.circuitBreakers.set(key, Date.now() + this.circuitBreakerTimeout);
    }
  }

  isCircuitOpen(key) {
    const breakerTime = this.circuitBreakers.get(key);
    if (!breakerTime) return false;

    if (Date.now() > breakerTime) {
      this.circuitBreakers.delete(key);
      this.failureCount.delete(key);
      return false;
    }

    return true;
  }

  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      circuitBreakers: Array.from(this.circuitBreakers.keys()),
      failureCounts: Object.fromEntries(this.failureCount)
    };
  }
}

/**
 * Moniteur de performance mémoire
 */
class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.maxMeasurements = 100;
    this.warningThreshold = 100 * 1024 * 1024; // 100MB
    this.criticalThreshold = 200 * 1024 * 1024; // 200MB
  }

  measure() {
    if (typeof window === 'undefined') return null;

    const measurement = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
      totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0
    };

    this.measurements.push(measurement);
    
    // Garder seulement les dernières mesures
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // Vérifier les seuils
    this.checkThresholds(measurement);

    return measurement;
  }

  checkThresholds(measurement) {
    const used = measurement.usedJSHeapSize;
    
    if (used > this.criticalThreshold) {
      logger.error('Utilisation mémoire critique', { 
        usedMB: Math.round(used / 1024 / 1024),
        totalMB: Math.round(measurement.totalJSHeapSize / 1024 / 1024)
      });
    } else if (used > this.warningThreshold) {
      logger.warn('Utilisation mémoire élevée', { 
        usedMB: Math.round(used / 1024 / 1024),
        totalMB: Math.round(measurement.totalJSHeapSize / 1024 / 1024)
      });
    }
  }

  getStats() {
    if (this.measurements.length === 0) return null;

    const latest = this.measurements[this.measurements.length - 1];
    const oldest = this.measurements[0];
    const growth = latest.usedJSHeapSize - oldest.usedJSHeapSize;

    return {
      current: {
        usedMB: Math.round(latest.usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(latest.totalJSHeapSize / 1024 / 1024),
        limitMB: Math.round(latest.jsHeapSizeLimit / 1024 / 1024)
      },
      growth: {
        bytes: growth,
        mb: Math.round(growth / 1024 / 1024),
        timespan: latest.timestamp - oldest.timestamp
      },
      measurements: this.measurements.length
    };
  }

  startMonitoring(interval = 30000) { // 30 secondes
    if (typeof window === 'undefined') return;

    this.monitoringInterval = setInterval(() => {
      this.measure();
    }, interval);

    logger.info('Monitoring mémoire démarré', { interval });
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Monitoring mémoire arrêté');
    }
  }
}

// Instances globales
export const memoryCache = new MemoryCache();
export const requestManager = new RequestManager();
export const memoryMonitor = new MemoryMonitor();

/**
 * Hook de nettoyage automatique pour React
 */
export function usePerformanceCleanup() {
  if (typeof window === 'undefined') return;

  // Nettoyage au démontage de l'application
  window.addEventListener('beforeunload', () => {
    memoryCache.clear();
    memoryMonitor.stopMonitoring();
    logger.info('Nettoyage performance effectué');
  });
}

/**
 * Utilitaire de validation avec cache
 */
export function createCachedValidator(validatorFn, cacheKey) {
  return (value) => {
    const key = `${cacheKey}_${JSON.stringify(value)}`;
    const cached = memoryCache.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const result = validatorFn(value);
    memoryCache.set(key, result, 60000); // Cache 1 minute
    return result;
  };
}

/**
 * Gestionnaire d'images optimisé
 */
export class ImageOptimizer {
  static async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const cleanup = () => {
        canvas.remove();
        URL.revokeObjectURL(img.src);
      };

      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          // Dessiner avec optimisations
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                reject(new Error('Erreur compression'));
                return;
              }
              
              const compressedFile = new File([blob], file.name, {
                type: format,
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            format,
            quality
          );
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Erreur chargement image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const minSize = 1024; // 1KB

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Type de fichier non supporté' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Fichier trop volumineux (max 50MB)' };
    }

    if (file.size < minSize) {
      return { valid: false, error: 'Fichier trop petit ou corrompu' };
    }

    return { valid: true };
  }
}

export default {
  MemoryCache,
  debounce,
  throttle,
  RequestManager,
  MemoryMonitor,
  memoryCache,
  requestManager,
  memoryMonitor,
  usePerformanceCleanup,
  createCachedValidator,
  ImageOptimizer
};