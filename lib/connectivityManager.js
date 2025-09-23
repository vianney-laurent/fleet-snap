// lib/connectivityManager.js
// Gestionnaire de connectivité avec indicateurs visuels et queue hors ligne

import { useState, useEffect } from 'react';
import { logger } from './logger';

/**
 * Gestionnaire de connectivité réseau
 */
class ConnectivityManager {
  constructor() {
    this.isOnline = true;
    this.listeners = new Set();
    this.offlineQueue = [];
    this.lastOnlineTime = Date.now();
    this.connectionQuality = 'good';
    this.pingInterval = null;
    
    // Configuration
    this.PING_INTERVAL = 30000; // 30 secondes
    this.PING_TIMEOUT = 5000; // 5 secondes
    this.QUALITY_THRESHOLDS = {
      good: 200,    // < 200ms
      fair: 1000,   // 200-1000ms
      poor: 3000    // 1000-3000ms
    };
    
    this.initialize();
  }

  /**
   * Initialiser le gestionnaire
   */
  initialize() {
    if (typeof window === 'undefined') return;

    // État initial
    this.isOnline = navigator.onLine;
    
    // Écouter les événements natifs
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Démarrer le monitoring actif
    this.startPingMonitoring();
    
    logger.info('Gestionnaire de connectivité initialisé', { 
      isOnline: this.isOnline 
    });
  }

  /**
   * Gérer le retour en ligne
   */
  handleOnline() {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    this.lastOnlineTime = Date.now();
    
    logger.info('Connexion réseau rétablie');
    
    if (wasOffline) {
      this.notifyListeners('online', { 
        wasOffline: true,
        offlineQueueSize: this.offlineQueue.length 
      });
      
      // Traiter la queue hors ligne
      this.processOfflineQueue();
    }
  }

  /**
   * Gérer la perte de connexion
   */
  handleOffline() {
    this.isOnline = false;
    this.connectionQuality = 'offline';
    
    logger.warn('Connexion réseau perdue');
    
    this.notifyListeners('offline', {
      lastOnlineTime: this.lastOnlineTime,
      offlineQueueSize: this.offlineQueue.length
    });
  }

  /**
   * Démarrer le monitoring par ping
   */
  startPingMonitoring() {
    if (this.pingInterval) return;
    
    this.pingInterval = setInterval(() => {
      this.checkConnectionQuality();
    }, this.PING_INTERVAL);
  }

  /**
   * Arrêter le monitoring par ping
   */
  stopPingMonitoring() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Vérifier la qualité de connexion
   */
  async checkConnectionQuality() {
    if (!this.isOnline) return;

    try {
      const startTime = Date.now();
      
      // Ping vers l'API de santé
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.PING_TIMEOUT);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const pingTime = Date.now() - startTime;
      const previousQuality = this.connectionQuality;
      
      // Déterminer la qualité
      if (response.ok) {
        if (pingTime < this.QUALITY_THRESHOLDS.good) {
          this.connectionQuality = 'good';
        } else if (pingTime < this.QUALITY_THRESHOLDS.fair) {
          this.connectionQuality = 'fair';
        } else if (pingTime < this.QUALITY_THRESHOLDS.poor) {
          this.connectionQuality = 'poor';
        } else {
          this.connectionQuality = 'very_poor';
        }
        
        // Notifier si changement de qualité
        if (previousQuality !== this.connectionQuality) {
          this.notifyListeners('quality_changed', {
            previous: previousQuality,
            current: this.connectionQuality,
            pingTime
          });
        }
        
        logger.debug('Ping réussi', { pingTime, quality: this.connectionQuality });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      // Erreur de ping - possiblement hors ligne
      if (error.name === 'AbortError') {
        logger.warn('Ping timeout - connexion lente');
        this.connectionQuality = 'very_poor';
      } else {
        logger.warn('Ping échoué', { error: error.message });
        
        // Vérifier si vraiment hors ligne
        if (navigator.onLine) {
          this.connectionQuality = 'poor';
        } else {
          this.handleOffline();
        }
      }
      
      this.notifyListeners('ping_failed', { error: error.message });
    }
  }

  /**
   * Ajouter une action à la queue hors ligne
   */
  addToOfflineQueue(action) {
    if (this.isOnline) {
      // Si en ligne, exécuter directement
      return this.executeAction(action);
    }
    
    // Ajouter à la queue
    this.offlineQueue.push({
      ...action,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    });
    
    logger.info('Action ajoutée à la queue hors ligne', { 
      queueSize: this.offlineQueue.length,
      actionType: action.type 
    });
    
    this.notifyListeners('queue_updated', {
      queueSize: this.offlineQueue.length
    });
    
    return Promise.resolve({ queued: true });
  }

  /**
   * Traiter la queue hors ligne
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    logger.info('Traitement de la queue hors ligne', { 
      queueSize: this.offlineQueue.length 
    });
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    let processed = 0;
    let failed = 0;
    
    for (const action of queue) {
      try {
        await this.executeAction(action);
        processed++;
        
        this.notifyListeners('queue_item_processed', {
          action,
          processed,
          remaining: queue.length - processed - failed
        });
        
      } catch (error) {
        failed++;
        logger.error('Erreur traitement action queue', error, { 
          actionId: action.id,
          actionType: action.type 
        });
        
        // Remettre en queue si erreur temporaire
        if (this.isRetryableError(error)) {
          this.offlineQueue.push(action);
        }
      }
    }
    
    logger.info('Queue hors ligne traitée', { processed, failed });
    
    this.notifyListeners('queue_processed', {
      processed,
      failed,
      remaining: this.offlineQueue.length
    });
  }

  /**
   * Exécuter une action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'upload':
        return this.executeUpload(action);
      case 'api_call':
        return this.executeApiCall(action);
      default:
        throw new Error(`Type d'action non supporté: ${action.type}`);
    }
  }

  /**
   * Exécuter un upload
   */
  async executeUpload(action) {
    const { url, formData, options = {} } = action.data;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Exécuter un appel API
   */
  async executeApiCall(action) {
    const { url, options = {} } = action.data;
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Vérifier si une erreur est retryable
   */
  isRetryableError(error) {
    // Erreurs réseau temporaires
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true;
    }
    
    // Codes HTTP retryables
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    if (error.status && retryableCodes.includes(error.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Ajouter un listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifier les listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('Erreur dans listener connectivité', error);
      }
    });
  }

  /**
   * Obtenir le statut actuel
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      connectionQuality: this.connectionQuality,
      offlineQueueSize: this.offlineQueue.length,
      lastOnlineTime: this.lastOnlineTime,
      offlineDuration: this.isOnline ? 0 : Date.now() - this.lastOnlineTime
    };
  }

  /**
   * Nettoyer le gestionnaire
   */
  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    
    this.stopPingMonitoring();
    this.listeners.clear();
    this.offlineQueue = [];
  }
}

// Instance globale
export const connectivityManager = new ConnectivityManager();

/**
 * Hook React pour la connectivité
 */
export function useConnectivity() {
  const [status, setStatus] = useState(connectivityManager.getStatus());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Mettre à jour le statut initial
    setStatus(connectivityManager.getStatus());

    // Écouter les changements
    const unsubscribe = connectivityManager.addListener((event, data) => {
      setStatus(connectivityManager.getStatus());
      
      // Ajouter des notifications pour certains événements
      if (['offline', 'online', 'quality_changed'].includes(event)) {
        const notification = {
          id: Date.now(),
          event,
          data,
          timestamp: Date.now()
        };
        
        setNotifications(prev => [...prev.slice(-4), notification]); // Garder 5 dernières
      }
    });

    return unsubscribe;
  }, []);

  const addToQueue = (action) => {
    return connectivityManager.addToOfflineQueue(action);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    ...status,
    notifications,
    addToQueue,
    clearNotifications,
    manager: connectivityManager
  };
}

export default connectivityManager;