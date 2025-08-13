// Configuration du logging selon l'environnement

export const LOGGING_CONFIG = {
  // Configuration par environnement
  development: {
    logLevel: 'debug',
    enableConsoleOutput: true,
    enableMetrics: true,
    enablePerformanceTracking: true,
    sensitiveDataMasking: true,
    maxLogSize: 1000, // Nombre maximum de logs en mémoire
  },
  
  production: {
    logLevel: 'info',
    enableConsoleOutput: false,
    enableMetrics: true,
    enablePerformanceTracking: true,
    sensitiveDataMasking: true,
    maxLogSize: 500,
  },
  
  test: {
    logLevel: 'warn',
    enableConsoleOutput: false,
    enableMetrics: false,
    enablePerformanceTracking: false,
    sensitiveDataMasking: true,
    maxLogSize: 100,
  }
};

// Configuration spécifique à FleetSnap
export const FLEETSNAP_CONFIG = {
  // Événements critiques à surveiller
  criticalEvents: [
    'auth_failure_rate_high',
    'ocr_error_rate_high',
    'storage_quota_exceeded',
    'database_connection_lost',
    'api_response_time_critical'
  ],
  
  // Seuils d'alerte personnalisés
  alertThresholds: {
    // Authentification
    maxFailedLogins: 5, // par utilisateur par heure
    maxFailedLoginsGlobal: 50, // global par heure
    
    // Performance
    maxApiResponseTime: 5000, // 5 secondes
    maxOcrProcessingTime: 15000, // 15 secondes
    maxFileUploadTime: 30000, // 30 secondes
    
    // Erreurs
    maxErrorRate: 0.05, // 5% d'erreurs
    maxConsecutiveErrors: 10,
    
    // Ressources
    maxMemoryUsage: 512, // MB
    maxDiskUsage: 0.9, // 90%
    
    // Business
    maxInventoryProcessingTime: 60000, // 1 minute
    maxExportGenerationTime: 120000, // 2 minutes
  },
  
  // Métriques business spécifiques
  businessMetrics: {
    // Inventaire
    trackInventoryUploads: true,
    trackOcrAccuracy: true,
    trackZoneUsage: true,
    trackConcessionActivity: true,
    
    // Utilisateurs
    trackUserSessions: true,
    trackUserActions: true,
    trackFeatureUsage: true,
    
    // Administration
    trackAdminActions: true,
    trackUserManagement: true,
    trackSystemChanges: true,
  },
  
  // Rétention des logs
  retention: {
    errorLogs: 90, // jours
    performanceLogs: 30, // jours
    businessLogs: 365, // jours
    debugLogs: 7, // jours
  },
  
  // Intégrations externes
  integrations: {
    axiom: {
      enabled: true,
      dataset: process.env.NEXT_PUBLIC_AXIOM_DATASET,
      batchSize: 100,
      flushInterval: 5000, // 5 secondes
    },
    
    // Prêt pour d'autres intégrations
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channels: {
        errors: '#alerts',
        performance: '#monitoring',
        business: '#analytics'
      }
    },
    
    email: {
      enabled: false,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      recipients: {
        errors: ['admin@fleetsnap.com'],
        critical: ['admin@fleetsnap.com', 'dev@fleetsnap.com']
      }
    }
  }
};

// Fonction pour obtenir la configuration actuelle
export function getCurrentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return {
    ...LOGGING_CONFIG[env],
    ...FLEETSNAP_CONFIG
  };
}

// Fonction pour vérifier si un événement est critique
export function isCriticalEvent(eventType) {
  const config = getCurrentConfig();
  return config.criticalEvents.includes(eventType);
}

// Fonction pour vérifier si un seuil est dépassé
export function isThresholdExceeded(metric, value) {
  const config = getCurrentConfig();
  const threshold = config.alertThresholds[metric];
  return threshold && value > threshold;
}

// Fonction pour formater les logs selon l'environnement
export function formatLogForEnvironment(logData) {
  const config = getCurrentConfig();
  
  // En développement, ajouter plus de contexte
  if (process.env.NODE_ENV === 'development') {
    return {
      ...logData,
      environment: 'development',
      timestamp: new Date().toISOString(),
      stack: logData.error?.stack,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage()
    };
  }
  
  // En production, optimiser pour la performance
  return {
    ...logData,
    environment: 'production',
    timestamp: new Date().toISOString()
  };
}

export default getCurrentConfig;