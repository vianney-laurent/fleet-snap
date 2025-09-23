// components/SystemMonitor.js
// Composant de monitoring système pour l'interface admin

import { useState, useEffect } from 'react';
import { healthMonitor } from '../lib/healthMonitor';
import { errorHandler } from '../lib/errorHandler';
import { memoryMonitor } from '../lib/performanceOptimizer';

export default function SystemMonitor({ isVisible = false }) {
  const [metrics, setMetrics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [errorStats, setErrorStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Récupérer les données de monitoring
  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer les métriques locales
      const localMetrics = healthMonitor.getMetrics();
      const localErrors = errorHandler.getStats();
      
      // Récupérer le statut de santé via API
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      
      setMetrics(localMetrics);
      setHealthStatus(healthData);
      setErrorStats(localErrors);
      
    } catch (error) {
      console.error('Erreur récupération monitoring:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour le refresh automatique
  useEffect(() => {
    if (!isVisible) return;
    
    fetchMonitoringData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // 30 secondes
      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh]);

  // Formater la durée
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  // Formater la taille mémoire
  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Obtenir la couleur selon le statut
  const getStatusColor = (healthy) => {
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  // Obtenir la couleur selon la sévérité
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Monitoring Système</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={fetchMonitoringData}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '⟳' : '🔄'}
          </button>
        </div>
      </div>

      {isLoading && !metrics ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Chargement des métriques...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Statut général */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Statut Général</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Santé:</span>
                <span className={getStatusColor(healthStatus?.healthy)}>
                  {healthStatus?.healthy ? '✅ Sain' : '❌ Problème'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span>{formatDuration(metrics?.uptime || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dernière vérification:</span>
                <span>
                  {healthStatus?.timestamp 
                    ? new Date(healthStatus.timestamp).toLocaleTimeString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Métriques de requêtes */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Requêtes</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total:</span>
                <span>{metrics?.requests?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Succès:</span>
                <span className="text-green-600">{metrics?.requests?.success || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Erreurs:</span>
                <span className="text-red-600">{metrics?.requests?.errors || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Taux succès:</span>
                <span>
                  {metrics?.requests?.total > 0 
                    ? `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Temps moyen:</span>
                <span>{formatDuration(metrics?.performance?.avgResponseTime || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Temps max:</span>
                <span>{formatDuration(metrics?.performance?.maxResponseTime || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Temps min:</span>
                <span>
                  {metrics?.performance?.minResponseTime !== Infinity 
                    ? formatDuration(metrics.performance.minResponseTime)
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Mémoire */}
          {metrics?.memory && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Mémoire</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Utilisée:</span>
                  <span>{metrics.memory.current?.usedMB || 'N/A'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Totale:</span>
                  <span>{metrics.memory.current?.totalMB || 'N/A'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Limite:</span>
                  <span>{metrics.memory.current?.limitMB || 'N/A'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Croissance:</span>
                  <span className={metrics.memory.growth?.mb > 0 ? 'text-orange-600' : 'text-green-600'}>
                    {metrics.memory.growth?.mb > 0 ? '+' : ''}{metrics.memory.growth?.mb || 0} MB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limiting */}
          {metrics?.rateLimiter && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Rate Limiting</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Utilisateurs actifs:</span>
                  <span>{metrics.rateLimiter.activeUsers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requêtes totales:</span>
                  <span>{metrics.rateLimiter.totalRequests || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Erreurs récentes */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Erreurs (24h)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total:</span>
                <span>{errorStats?.last24h || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Dernière heure:</span>
                <span>{errorStats?.lastHour || 0}</span>
              </div>
              {errorStats?.byType && Object.entries(errorStats.byType).length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">Par type:</div>
                  {Object.entries(errorStats.byType).slice(0, 3).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span>{type}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checks de santé détaillés */}
      {healthStatus?.checks && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Checks de Santé</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(healthStatus.checks).map(([name, check]) => (
              <div key={name} className="bg-gray-50 p-3 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{name}</span>
                  <span className={getStatusColor(check.status === 'healthy')}>
                    {check.status === 'healthy' ? '✅' : '❌'}
                  </span>
                </div>
                {check.duration && (
                  <div className="text-xs text-gray-600">
                    Durée: {formatDuration(check.duration)}
                  </div>
                )}
                {check.error && (
                  <div className="text-xs text-red-600 mt-1">
                    {check.error}
                  </div>
                )}
                {check.failures > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Échecs: {check.failures}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erreurs récentes détaillées */}
      {errorStats?.recentErrors && errorStats.recentErrors.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Erreurs Récentes</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errorStats.recentErrors.map((error, index) => (
              <div key={error.id || index} className="bg-gray-50 p-3 rounded text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{error.type}</span>
                  <span className={getSeverityColor(error.severity)}>
                    {error.severity}
                  </span>
                </div>
                <div className="text-gray-600 text-xs">
                  {error.userMessage}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(error.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}