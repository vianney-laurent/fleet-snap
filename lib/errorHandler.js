// lib/errorHandler.js
// Gestionnaire d'erreurs centralisé avec classification et récupération

import { logger } from './logger';
import { healthMonitor } from './healthMonitor';

/**
 * Types d'erreurs classifiées
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION', 
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  TIMEOUT: 'TIMEOUT',
  STORAGE: 'STORAGE',
  OCR: 'OCR',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Niveaux de sévérité
 */
export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Classification automatique des erreurs
 */
export function classifyError(error, context = {}) {
  const message = error.message?.toLowerCase() || '';
  const status = error.status || context.status;
  const code = error.code || context.code;

  let type = ErrorTypes.UNKNOWN;
  let severity = ErrorSeverity.MEDIUM;
  let recoverable = true;
  let userMessage = 'Une erreur inattendue s\'est produite';
  let retryable = false;

  // Classification par code de statut HTTP
  if (status) {
    if (status === 401 || status === 403) {
      type = ErrorTypes.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      userMessage = 'Session expirée. Veuillez vous reconnecter.';
      recoverable = true;
    } else if (status === 400) {
      type = ErrorTypes.VALIDATION;
      severity = ErrorSeverity.LOW;
      userMessage = 'Données invalides. Vérifiez votre saisie.';
      recoverable = true;
    } else if (status === 413) {
      type = ErrorTypes.VALIDATION;
      severity = ErrorSeverity.MEDIUM;
      userMessage = 'Fichier trop volumineux. Réduisez la taille.';
      recoverable = true;
    } else if (status === 429) {
      type = ErrorTypes.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      userMessage = 'Trop de requêtes. Attendez avant de réessayer.';
      recoverable = true;
      retryable = true;
    } else if (status >= 500) {
      type = ErrorTypes.SERVER;
      severity = ErrorSeverity.HIGH;
      userMessage = 'Erreur serveur temporaire. Réessayez plus tard.';
      recoverable = true;
      retryable = true;
    }
  }

  // Classification par message d'erreur
  if (message.includes('network') || message.includes('fetch')) {
    type = ErrorTypes.NETWORK;
    severity = ErrorSeverity.MEDIUM;
    userMessage = 'Problème de connexion. Vérifiez votre réseau.';
    retryable = true;
  } else if (message.includes('timeout')) {
    type = ErrorTypes.TIMEOUT;
    severity = ErrorSeverity.MEDIUM;
    userMessage = 'Délai d\'attente dépassé. Réessayez.';
    retryable = true;
  } else if (message.includes('storage') || message.includes('upload')) {
    type = ErrorTypes.STORAGE;
    severity = ErrorSeverity.HIGH;
    userMessage = 'Erreur de stockage. Réessayez avec un fichier plus petit.';
    retryable = true;
  } else if (message.includes('ocr') || message.includes('gemini')) {
    type = ErrorTypes.OCR;
    severity = ErrorSeverity.LOW;
    userMessage = 'Erreur de traitement d\'image. Le fichier sera sauvegardé.';
    recoverable = true;
  } else if (message.includes('token') || message.includes('auth')) {
    type = ErrorTypes.AUTHENTICATION;
    severity = ErrorSeverity.HIGH;
    userMessage = 'Problème d\'authentification. Reconnectez-vous.';
    recoverable = true;
  }

  // Classification par code d'erreur
  if (code) {
    if (code === 'LIMIT_FILE_SIZE') {
      type = ErrorTypes.VALIDATION;
      severity = ErrorSeverity.MEDIUM;
      userMessage = 'Fichier trop volumineux. Taille maximale: 10MB.';
    } else if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
      type = ErrorTypes.NETWORK;
      severity = ErrorSeverity.HIGH;
      userMessage = 'Service indisponible. Réessayez plus tard.';
      retryable = true;
    }
  }

  return {
    type,
    severity,
    recoverable,
    retryable,
    userMessage,
    originalError: error,
    context,
    timestamp: Date.now()
  };
}

/**
 * Gestionnaire d'erreurs principal
 */
export class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.recentErrors = [];
    this.maxRecentErrors = 100;
    this.errorPatterns = new Map();
  }

  /**
   * Traiter une erreur
   */
  handle(error, context = {}) {
    const classified = classifyError(error, context);
    
    // Enregistrer l'erreur
    this.recordError(classified);
    
    // Logger selon la sévérité
    const logData = {
      type: classified.type,
      severity: classified.severity,
      message: error.message,
      stack: error.stack,
      context,
      recoverable: classified.recoverable,
      retryable: classified.retryable
    };

    switch (classified.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Erreur critique', error, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('Erreur importante', error, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Erreur modérée', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Erreur mineure', logData);
        break;
    }

    // Enregistrer dans les métriques de santé
    if (healthMonitor) {
      healthMonitor.recordRequest(false, context.duration, error);
    }

    // Détecter les patterns d'erreurs
    this.detectErrorPatterns(classified);

    return classified;
  }

  /**
   * Enregistrer une erreur dans les statistiques
   */
  recordError(classifiedError) {
    const key = `${classifiedError.type}_${classifiedError.severity}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Ajouter aux erreurs récentes
    this.recentErrors.push({
      ...classifiedError,
      id: Date.now() + Math.random()
    });

    // Limiter la taille du tableau
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }
  }

  /**
   * Détecter des patterns d'erreurs récurrentes
   */
  detectErrorPatterns(classifiedError) {
    const pattern = classifiedError.type;
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    if (!this.errorPatterns.has(pattern)) {
      this.errorPatterns.set(pattern, []);
    }

    const patternErrors = this.errorPatterns.get(pattern);
    patternErrors.push(now);

    // Nettoyer les erreurs anciennes
    const recentPatternErrors = patternErrors.filter(time => now - time < timeWindow);
    this.errorPatterns.set(pattern, recentPatternErrors);

    // Alerter si trop d'erreurs du même type
    if (recentPatternErrors.length >= 10) {
      logger.error('Pattern d\'erreurs détecté', {
        pattern,
        count: recentPatternErrors.length,
        timeWindow: '5 minutes'
      });
    }
  }

  /**
   * Obtenir les statistiques d'erreurs
   */
  getStats() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const recent24h = this.recentErrors.filter(e => e.timestamp > last24h);
    const recentHour = this.recentErrors.filter(e => e.timestamp > lastHour);

    return {
      total: this.recentErrors.length,
      last24h: recent24h.length,
      lastHour: recentHour.length,
      byType: Object.fromEntries(this.errorCounts),
      patterns: Object.fromEntries(
        Array.from(this.errorPatterns.entries()).map(([pattern, times]) => [
          pattern,
          times.filter(time => now - time < 5 * 60 * 1000).length
        ])
      ),
      recentErrors: this.recentErrors.slice(-10) // 10 dernières erreurs
    };
  }

  /**
   * Nettoyer les anciennes erreurs
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000; // 24 heures

    this.recentErrors = this.recentErrors.filter(e => e.timestamp > cutoff);

    // Nettoyer les patterns
    for (const [pattern, times] of this.errorPatterns.entries()) {
      const recentTimes = times.filter(time => now - time < 24 * 60 * 60 * 1000);
      if (recentTimes.length === 0) {
        this.errorPatterns.delete(pattern);
      } else {
        this.errorPatterns.set(pattern, recentTimes);
      }
    }
  }
}

// Instance globale
export const errorHandler = new ErrorHandler();

/**
 * Middleware pour la gestion d'erreurs API
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    
    try {
      return await handler(req, res);
    } catch (error) {
      const duration = Date.now() - startTime;
      const context = {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        duration
      };

      const classified = errorHandler.handle(error, context);

      // Réponse appropriée selon le type d'erreur
      let statusCode = 500;
      if (error.status) {
        statusCode = error.status;
      } else if (classified.type === ErrorTypes.VALIDATION) {
        statusCode = 400;
      } else if (classified.type === ErrorTypes.AUTHENTICATION) {
        statusCode = 401;
      } else if (classified.type === ErrorTypes.RATE_LIMIT) {
        statusCode = 429;
      }

      return res.status(statusCode).json({
        error: classified.userMessage,
        type: classified.type,
        recoverable: classified.recoverable,
        retryable: classified.retryable,
        timestamp: classified.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          stack: error.stack
        })
      });
    }
  };
}

/**
 * Hook React pour la gestion d'erreurs côté client
 */
export function useErrorHandler() {
  const handleError = (error, context = {}) => {
    const classified = errorHandler.handle(error, context);
    
    // Afficher un message à l'utilisateur selon le contexte
    if (typeof window !== 'undefined' && classified.userMessage) {
      // Ici on pourrait intégrer avec un système de notifications
      console.error('Erreur classifiée:', classified);
    }
    
    return classified;
  };

  const getErrorStats = () => errorHandler.getStats();

  return { handleError, getErrorStats };
}

/**
 * Utilitaires de récupération d'erreurs
 */
export const ErrorRecovery = {
  /**
   * Retry avec backoff exponentiel
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const classified = classifyError(error);
        
        if (!classified.retryable || attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },

  /**
   * Fallback avec fonction alternative
   */
  async withFallback(primaryFn, fallbackFn) {
    try {
      return await primaryFn();
    } catch (error) {
      const classified = classifyError(error);
      
      if (classified.recoverable && fallbackFn) {
        logger.info('Utilisation du fallback', { error: error.message });
        return await fallbackFn();
      }
      
      throw error;
    }
  },

  /**
   * Circuit breaker simple
   */
  createCircuitBreaker(fn, threshold = 5, timeout = 30000) {
    let failures = 0;
    let lastFailureTime = 0;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      const now = Date.now();

      if (state === 'OPEN') {
        if (now - lastFailureTime > timeout) {
          state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit breaker ouvert');
        }
      }

      try {
        const result = await fn(...args);
        
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        if (failures >= threshold) {
          state = 'OPEN';
        }
        
        throw error;
      }
    };
  }
};

// Nettoyage périodique
setInterval(() => {
  errorHandler.cleanup();
}, 60 * 60 * 1000); // Chaque heure

export default {
  ErrorTypes,
  ErrorSeverity,
  classifyError,
  ErrorHandler,
  errorHandler,
  withErrorHandling,
  useErrorHandler,
  ErrorRecovery
};