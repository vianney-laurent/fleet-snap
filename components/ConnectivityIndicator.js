// components/ConnectivityIndicator.js
// Indicateur visuel de connectivité réseau

import { useState, useEffect } from 'react';
import { useConnectivity } from '../lib/connectivityManager';

export default function ConnectivityIndicator({ showDetails = false }) {
  const { 
    isOnline, 
    connectionQuality, 
    offlineQueueSize, 
    offlineDuration,
    notifications,
    clearNotifications 
  } = useConnectivity();

  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);

  // Afficher les notifications importantes
  useEffect(() => {
    const lastNotification = notifications[notifications.length - 1];
    
    if (lastNotification && ['offline', 'online'].includes(lastNotification.event)) {
      setCurrentNotification(lastNotification);
      setShowNotification(true);
      
      // Auto-masquer après 5 secondes
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Obtenir l'icône selon le statut
  const getStatusIcon = () => {
    if (!isOnline) return '📶❌';
    
    switch (connectionQuality) {
      case 'good': return '📶✅';
      case 'fair': return '📶⚠️';
      case 'poor': return '📶🔴';
      case 'very_poor': return '📶💀';
      default: return '📶';
    }
  };

  // Obtenir la couleur selon le statut
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600 bg-red-50 border-red-200';
    
    switch (connectionQuality) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'very_poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Obtenir le message de statut
  const getStatusMessage = () => {
    if (!isOnline) {
      const minutes = Math.floor(offlineDuration / 60000);
      return `Hors ligne${minutes > 0 ? ` depuis ${minutes}min` : ''}`;
    }
    
    switch (connectionQuality) {
      case 'good': return 'Connexion excellente';
      case 'fair': return 'Connexion correcte';
      case 'poor': return 'Connexion lente';
      case 'very_poor': return 'Connexion très lente';
      default: return 'Connexion';
    }
  };

  // Formater la durée
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <>
      {/* Indicateur principal */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
        <span>{getStatusIcon()}</span>
        <span>{getStatusMessage()}</span>
        
        {offlineQueueSize > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {offlineQueueSize}
          </span>
        )}
      </div>

      {/* Détails étendus */}
      {showDetails && (
        <div className={`mt-2 p-3 rounded-lg border ${getStatusColor()}`}>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Statut:</span>
              <span className="font-medium">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
            
            {isOnline && (
              <div className="flex justify-between">
                <span>Qualité:</span>
                <span className="font-medium">{connectionQuality}</span>
              </div>
            )}
            
            {offlineQueueSize > 0 && (
              <div className="flex justify-between">
                <span>En attente:</span>
                <span className="font-medium">{offlineQueueSize} action{offlineQueueSize > 1 ? 's' : ''}</span>
              </div>
            )}
            
            {!isOnline && offlineDuration > 0 && (
              <div className="flex justify-between">
                <span>Hors ligne depuis:</span>
                <span className="font-medium">{formatDuration(offlineDuration)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification toast */}
      {showNotification && currentNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-lg shadow-lg border ${
            currentNotification.event === 'online' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {currentNotification.event === 'online' ? '✅' : '❌'}
                </span>
                <div>
                  <div className="font-medium">
                    {currentNotification.event === 'online' 
                      ? 'Connexion rétablie' 
                      : 'Connexion perdue'
                    }
                  </div>
                  {currentNotification.event === 'online' && offlineQueueSize > 0 && (
                    <div className="text-sm">
                      {offlineQueueSize} action{offlineQueueSize > 1 ? 's' : ''} en cours de traitement
                    </div>
                  )}
                  {currentNotification.event === 'offline' && (
                    <div className="text-sm">
                      Les actions seront mises en queue
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowNotification(false)}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Composant de bannière de connectivité (pour affichage permanent)
 */
export function ConnectivityBanner() {
  const { isOnline, offlineQueueSize } = useConnectivity();

  // Ne rien afficher si en ligne et pas de queue
  if (isOnline && offlineQueueSize === 0) {
    return null;
  }

  return (
    <div className={`w-full px-4 py-2 text-center text-sm font-medium ${
      isOnline 
        ? 'bg-blue-50 text-blue-800 border-b border-blue-200'
        : 'bg-red-50 text-red-800 border-b border-red-200'
    }`}>
      {!isOnline ? (
        <div className="flex items-center justify-center space-x-2">
          <span>📶❌</span>
          <span>Hors ligne - Les actions seront mises en queue</span>
        </div>
      ) : offlineQueueSize > 0 ? (
        <div className="flex items-center justify-center space-x-2">
          <span>⏳</span>
          <span>Traitement de {offlineQueueSize} action{offlineQueueSize > 1 ? 's' : ''} en attente</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Composant d'indicateur compact pour la barre de navigation
 */
export function ConnectivityDot() {
  const { isOnline, connectionQuality } = useConnectivity();

  const getDotColor = () => {
    if (!isOnline) return 'bg-red-500';
    
    switch (connectionQuality) {
      case 'good': return 'bg-green-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'very_poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full ${getDotColor()} ${!isOnline ? 'animate-pulse' : ''}`}
      title={isOnline ? `Connexion: ${connectionQuality}` : 'Hors ligne'}
    />
  );
}