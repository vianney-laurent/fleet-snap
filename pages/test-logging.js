import { useState } from 'react';
import Layout from '../components/Layout';
import { logger } from '../lib/logger';

export default function TestLoggingPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runTests = async () => {
    if (!password.trim()) {
      setError('Veuillez entrer le mot de passe administrateur');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      logger.info('Lancement des tests de logging', { 
        timestamp: new Date().toISOString(),
        testMode: true 
      });

      const response = await fetch('/api/test-logging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        logger.info('Tests de logging terminés avec succès', { 
          summary: data.summary,
          testMode: true 
        });
      } else {
        setError(data.error || 'Erreur lors des tests');
        logger.error('Erreur tests de logging', new Error(data.error), { testMode: true });
      }
    } catch (err) {
      setError('Erreur de connexion: ' + err.message);
      logger.error('Erreur connexion tests logging', err, { testMode: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test du système de logging</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Lancer les tests</h2>
          <p className="text-gray-600 mb-4">
            Cette page permet de tester le système de logging FleetSnap. 
            Les logs de test seront envoyés vers Axiom avec le flag <code>testMode:true</code>.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez le mot de passe admin"
                onKeyPress={(e) => e.key === 'Enter' && !loading && runTests()}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <button
              onClick={runTests}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Tests en cours...
                </span>
              ) : (
                'Lancer les tests de logging'
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              ✅ Tests terminés avec succès !
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.apis}</div>
                <div className="text-sm text-gray-600">APIs testées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.errors}</div>
                <div className="text-sm text-gray-600">Erreurs enregistrées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.activeUsers}</div>
                <div className="text-sm text-gray-600">Utilisateurs actifs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.anomalies}</div>
                <div className="text-sm text-gray-600">Anomalies détectées</div>
              </div>
            </div>
            
            <div className="bg-white rounded-md p-4">
              <h4 className="font-semibold mb-2">Instructions :</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {result.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {instruction}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📋 Types de tests effectués
          </h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• Logs basiques (info, warn, error)</li>
            <li>• Logs d'authentification (login, logout, session)</li>
            <li>• Logs d'inventaire (upload, OCR, erreurs)</li>
            <li>• Logs d'administration (création utilisateur, export)</li>
            <li>• Logs de performance (API calls, requêtes lentes)</li>
            <li>• Métriques et collecte de données</li>
            <li>• Masquage des données sensibles</li>
            <li>• Détection d'anomalies</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/monitoring" 
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Accéder au dashboard de monitoring
          </a>
        </div>
      </div>
    </Layout>
  );
}