import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TestOcrTrigger() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      // Compter les records pending
      const { data: pendingRecords } = await supabase
        .from('inventaire')
        .select('id')
        .eq('status', 'pending');
      
      setPendingCount(pendingRecords?.length || 0);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const runDiagnosticTest = async () => {
    setTestLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch('/api/debug/trigger-test');
      const result = await response.json();
      setTestResults(result);
    } catch (error) {
      setTestResults({
        error: error.message,
        message: 'Erreur lors du test de diagnostic'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const testManualTrigger = async () => {
    setTestLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/inventory/manual-trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      alert(`Résultat: ${result.message}`);
      
      // Recompter les pending
      const { data: pendingRecords } = await supabase
        .from('inventaire')
        .select('id')
        .eq('status', 'pending');
      
      setPendingCount(pendingRecords?.length || 0);
      
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setTestLoading(true);
    
    try {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-ocr`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'direct-test',
          userId: user?.id || 'test-user'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ Edge Function OK: ${result.message}`);
      } else {
        alert(`❌ Edge Function Error: ${result.error || 'Erreur inconnue'}`);
      }
      
      // Recompter les pending
      const { data: pendingRecords } = await supabase
        .from('inventaire')
        .select('id')
        .eq('status', 'pending');
      
      setPendingCount(pendingRecords?.length || 0);
      
    } catch (error) {
      alert(`❌ Erreur Edge Function: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-center">🔧 Test Déclenchement OCR</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Statut Actuel</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
              <div className="text-sm text-blue-800">Photos en attente</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-800">Environnement</div>
              <div className="font-semibold">{process.env.NODE_ENV || 'development'}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-800">Utilisateur</div>
              <div className="font-semibold text-xs">{user?.email}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Tests Disponibles</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Test de Diagnostic Complet</h3>
                <p className="text-sm text-gray-600">
                  Teste toutes les URLs possibles pour le déclenchement OCR
                </p>
              </div>
              <button
                onClick={runDiagnosticTest}
                disabled={testLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
              >
                {testLoading ? '⏳ Test...' : '🔍 Diagnostiquer'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Test Déclenchement Manuel</h3>
                <p className="text-sm text-gray-600">
                  Déclenche manuellement le traitement OCR (API hybride)
                </p>
              </div>
              <button
                onClick={testManualTrigger}
                disabled={testLoading || pendingCount === 0}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:bg-gray-400"
              >
                {testLoading ? '⏳ OCR...' : '🚀 Déclencher'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Test Edge Function Directe</h3>
                <p className="text-sm text-gray-600">
                  Teste directement l'Edge Function Supabase
                </p>
              </div>
              <button
                onClick={testEdgeFunction}
                disabled={testLoading || pendingCount === 0}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
              >
                {testLoading ? '⏳ Test...' : '⚡ Edge Function'}
              </button>
            </div>
          </div>
        </div>

        {testResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Résultats du Test</h2>
            
            {testResults.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800">Erreur</h3>
                <p className="text-red-700">{testResults.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Recommandation */}
                {testResults.recommendation && (
                  <div className={`border rounded-lg p-4 ${
                    testResults.recommendation.status === 'success' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="font-semibold mb-2">💡 Recommandation</h3>
                    <p className="mb-2">{testResults.recommendation.message}</p>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {testResults.recommendation.action}
                    </p>
                    {testResults.recommendation.fastestUrl && (
                      <p className="text-sm mt-2">
                        <strong>URL la plus rapide:</strong> {testResults.recommendation.fastestUrl} 
                        ({testResults.recommendation.duration}ms)
                      </p>
                    )}
                  </div>
                )}

                {/* Résultats des tests */}
                <div>
                  <h3 className="font-semibold mb-3">🔗 Test des URLs</h3>
                  <div className="space-y-2">
                    {Object.entries(testResults.testResults).map(([key, result]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{key}</span>
                          {result.url && (
                            <div className="text-xs text-gray-500 font-mono">{result.url}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            result.status === 'success' ? 'bg-green-100 text-green-800' :
                            result.status === 'error' ? 'bg-red-100 text-red-800' :
                            result.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status}
                          </span>
                          {result.duration && (
                            <div className="text-xs text-gray-500">{result.duration}ms</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Informations d'environnement */}
                <div>
                  <h3 className="font-semibold mb-3">🌍 Environnement</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(testResults.debugInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}