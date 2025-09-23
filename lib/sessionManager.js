// lib/sessionManager.js
// Gestionnaire de session robuste avec auto-refresh et détection d'expiration

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Gestionnaire de session avec auto-refresh et monitoring
 */
class SessionManager {
  constructor() {
    this.refreshTimer = null;
    this.warningTimer = null;
    this.listeners = new Set();
    this.isRefreshing = false;
    this.lastActivity = Date.now();
    
    // Configuration
    this.REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes avant expiration
    this.WARNING_MARGIN = 10 * 60 * 1000; // 10 minutes avant expiration
    this.ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes d'inactivité
    
    this.setupActivityTracking();
  }

  /**
   * Initialiser le gestionnaire de session
   */
  async initialize() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.warn('Erreur récupération session initiale', { error: error.message });
        return null;
      }

      if (session) {
        this.scheduleRefresh(session);
        this.notifyListeners('session_restored', session);
        logger.info('Session initialisée', { 
          userId: session.user.id,
          expiresAt: session.expires_at 
        });
      }

      // Écouter les changements d'état d'authentification
      supabase.auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      return session;
    } catch (error) {
      logger.error('Erreur initialisation session manager', error);
      return null;
    }
  }

  /**
   * Gérer les changements d'état d'authentification
   */
  handleAuthStateChange(event, session) {
    logger.info('Changement état auth', { event, hasSession: !!session });

    switch (event) {
      case 'SIGNED_IN':
        this.scheduleRefresh(session);
        this.notifyListeners('session_started', session);
        break;
        
      case 'SIGNED_OUT':
        this.clearTimers();
        this.notifyListeners('session_ended', null);
        break;
        
      case 'TOKEN_REFRESHED':
        this.scheduleRefresh(session);
        this.notifyListeners('session_refreshed', session);
        logger.info('Token rafraîchi automatiquement');
        break;
        
      case 'USER_UPDATED':
        this.notifyListeners('user_updated', session);
        break;
    }
  }

  /**
   * Programmer le refresh automatique du token
   */
  scheduleRefresh(session) {
    if (!session?.expires_at) return;

    this.clearTimers();

    const expiresAt = session.expires_at * 1000; // Convertir en millisecondes
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Programmer l'avertissement
    const warningTime = timeUntilExpiry - this.WARNING_MARGIN;
    if (warningTime > 0) {
      this.warningTimer = setTimeout(() => {
        this.notifyListeners('session_warning', session);
      }, warningTime);
    }

    // Programmer le refresh
    const refreshTime = timeUntilExpiry - this.REFRESH_MARGIN;
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
      
      logger.info('Refresh programmé', { 
        refreshInMs: refreshTime,
        refreshInMin: Math.round(refreshTime / 60000)
      });
    } else {
      // Session déjà expirée ou sur le point d'expirer
      logger.warn('Session expirée ou sur le point d\'expirer', { timeUntilExpiry });
      this.refreshSession();
    }
  }

  /**
   * Rafraîchir la session
   */
  async refreshSession() {
    if (this.isRefreshing) {
      logger.info('Refresh déjà en cours, ignoré');
      return;
    }

    this.isRefreshing = true;
    
    try {
      logger.info('Tentative de refresh de session');
      
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Erreur refresh session', error);
        this.notifyListeners('session_refresh_failed', error);
        return false;
      }

      if (session) {
        this.scheduleRefresh(session);
        this.notifyListeners('session_refreshed', session);
        logger.info('Session rafraîchie avec succès');
        return true;
      } else {
        logger.warn('Pas de session après refresh');
        this.notifyListeners('session_expired', null);
        return false;
      }
    } catch (error) {
      logger.error('Erreur critique refresh session', error);
      this.notifyListeners('session_refresh_failed', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Vérifier si la session est valide
   */
  async isSessionValid() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      const now = Date.now();
      const expiresAt = session.expires_at * 1000;
      
      // Vérifier si la session expire dans moins de 1 minute
      return (expiresAt - now) > 60000;
    } catch (error) {
      logger.error('Erreur vérification session', error);
      return false;
    }
  }

  /**
   * Obtenir la session actuelle
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.warn('Erreur récupération session', { error: error.message });
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Erreur critique récupération session', error);
      return null;
    }
  }

  /**
   * Configurer le suivi d'activité
   */
  setupActivityTracking() {
    if (typeof window === 'undefined') return;

    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    // Écouter les événements d'activité
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Vérifier l'inactivité toutes les minutes
    setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      
      if (inactiveTime > this.ACTIVITY_TIMEOUT) {
        this.notifyListeners('session_inactive', { inactiveTime });
      }
    }, 60000);
  }

  /**
   * Ajouter un listener pour les événements de session
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifier tous les listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('Erreur dans listener session', error);
      }
    });
  }

  /**
   * Nettoyer les timers
   */
  clearTimers() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Nettoyer le gestionnaire
   */
  cleanup() {
    this.clearTimers();
    this.listeners.clear();
  }

  /**
   * Obtenir les statistiques de session
   */
  getStats() {
    return {
      isRefreshing: this.isRefreshing,
      lastActivity: this.lastActivity,
      inactiveTime: Date.now() - this.lastActivity,
      listenersCount: this.listeners.size,
      hasRefreshTimer: !!this.refreshTimer,
      hasWarningTimer: !!this.warningTimer
    };
  }
}

// Instance globale
export const sessionManager = new SessionManager();

/**
 * Hook React pour utiliser le gestionnaire de session
 */
export function useSessionManager() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const currentSession = await sessionManager.initialize();
        if (mounted) {
          setSession(currentSession);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    // Écouter les événements de session
    const unsubscribe = sessionManager.addListener((event, data) => {
      if (!mounted) return;

      switch (event) {
        case 'session_started':
        case 'session_restored':
        case 'session_refreshed':
          setSession(data);
          setError(null);
          break;
          
        case 'session_ended':
        case 'session_expired':
          setSession(null);
          break;
          
        case 'session_refresh_failed':
          setError(data);
          break;
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    session,
    isLoading,
    error,
    isValid: sessionManager.isSessionValid,
    refresh: sessionManager.refreshSession.bind(sessionManager),
    stats: sessionManager.getStats()
  };
}

export default sessionManager;