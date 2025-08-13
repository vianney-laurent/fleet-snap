import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MONITORING_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersecret';

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push('/');
        return;
      }
      setUser(data.user);

      logger.info('Accès page monitoring demandé', {
        userId: data.user.id,
        email: data.user.email
      });
    }

    if (mounted) {
      checkAuth();
    }
  }, [mounted]);

  const handlePasswordSubmit = () => {
    if (passwordInput === MONITORING_PASSWORD) {
      setAccessGranted(true);
      logger.info('Accès monitoring accordé', {
        userId: user?.id,
        email: user?.email
      });
      fetchData();
    } else {
      logger.warn('Tentative accès monitoring avec mot de passe incorrect', {
        userId: user?.id,
        email: user?.email
      });
      alert('Mot de passe incorrect');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les métriques avec le mot de passe admin
      const metricsResponse = await fetch('/api/monitoring/metrics', {
        headers: { Authorization: `Bearer ${MONITORING_PASSWORD}` }
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      } else {
        setError('Erreur lors du chargement des métriques');
        return;
      }

      // Récupérer l'état de santé (pas besoin d'auth pour health)
      const healthResponse = await fetch('/api/monitoring/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData);
      }

      logger.info('Consultation dashboard monitoring', {
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      setError('Erreur lors du chargement des données');
      logger.error('Erreur chargement monitoring dashboard', err, {
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Attendre le montage du composant pour éviter les erreurs d'hydratation
  if (!mounted) {
    return (
      <Layout>
        <div className="p-6 text-center">Chargement...</div>
      </Layout>
    );
  }

  // Écran de saisie du mot de passe
  if (!accessGranted) {
    return (
      <Layout>
        <div className="p-6 max-w-md mx-auto bg-white rounded-md shadow-md mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Accès au monitoring</h2>
          <p className="text-gray-600">Entrez le mot de passe administrateur pour accéder au dashboard de monitoring.</p>
          <input
            type="password"
            placeholder="Mot de passe"
            className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />
          <button
            onClick={handlePasswordSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm p-2 w-full rounded-full shadow-md transition-shadow transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Accéder au monitoring
          </button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Chargement des métriques...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Réessayer
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Monitoring FleetSnap</h1>
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Actualiser
          </button>
        </div>

        {/* État de santé global */}
        {health && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">État de santé du système</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${getStatusColor(health.status)}`}>
                <h3 className="font-semibold">Statut global</h3>
                <p className="text-2xl font-bold capitalize">{health.status}</p>
              </div>

              {Object.entries(health.checks).map(([key, check]) => (
                <div key={key} className={`p-4 rounded-lg ${getStatusColor(check.status)}`}>
                  <h3 className="font-semibold capitalize">{key.replace('_', ' ')}</h3>
                  <p className="text-lg font-bold capitalize">{check.status}</p>
                  {check.responseTime && (
                    <p className="text-sm">{check.responseTime}ms</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métriques des APIs */}
        {metrics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Métriques des APIs</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appels</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée moy.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux d'erreur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernier appel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(metrics.summary.apis).map(([endpoint, data]) => (
                    <tr key={endpoint}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.calls}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round(data.avgDuration)}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${data.errorRate > 0.1 ? 'bg-red-100 text-red-800' :
                            data.errorRate > 0.05 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                          }`}>
                          {(data.errorRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.lastCall ? new Date(data.lastCall).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Anomalies */}
        {metrics && metrics.anomalies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Anomalies détectées</h2>
            <div className="space-y-4">
              {metrics.anomalies.map((anomaly, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 capitalize">
                    {anomaly.type.replace('_', ' ')}
                  </h3>
                  <p className="text-red-700">
                    Endpoint: {anomaly.endpoint}
                  </p>
                  {anomaly.errorRate && (
                    <p className="text-red-700">
                      Taux d'erreur: {(anomaly.errorRate * 100).toFixed(1)}%
                      (seuil: {(anomaly.threshold * 100).toFixed(1)}%)
                    </p>
                  )}
                  {anomaly.avgDuration && (
                    <p className="text-red-700">
                      Durée moyenne: {Math.round(anomaly.avgDuration)}ms
                      (seuil: {anomaly.threshold}ms)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques utilisateurs */}
        {metrics && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Activité utilisateurs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-700">Utilisateurs totaux</h3>
                <p className="text-3xl font-bold text-blue-600">{metrics.summary.users.total}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-700">Utilisateurs actifs (1h)</h3>
                <p className="text-3xl font-bold text-green-600">{metrics.summary.users.active}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}