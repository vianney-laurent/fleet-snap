import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/monitoring';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Vérification du mot de passe admin
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersecret';
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  try {
    console.log('🧪 Test du système de logging FleetSnap...\n');

    // Test 1: Logs basiques
    console.log('1. Test des logs basiques...');
    logger.info('Test log info', { testId: 'basic-001', timestamp: new Date() });
    logger.warn('Test log warning', { testId: 'basic-002', level: 'warning' });
    logger.error('Test log error', new Error('Erreur de test'), { testId: 'basic-003' });
    console.log('✅ Logs basiques envoyés\n');

    // Test 2: Logs d'authentification
    console.log('2. Test des logs d\'authentification...');
    logger.auth.login('test@example.com', true, { 
      userId: 'test-user-123',
      concession: 'Test Concession',
      testMode: true
    });
    logger.auth.login('invalid@example.com', false, { 
      error: 'Invalid credentials',
      testMode: true
    });
    logger.auth.sessionExpired('expired@example.com', { 
      page: 'inventory',
      testMode: true
    });
    console.log('✅ Logs d\'authentification envoyés\n');

    // Test 3: Logs d'inventaire
    console.log('3. Test des logs d\'inventaire...');
    logger.inventory.upload('test-user-123', 2, 'Zone Test', 'Test Concession', {
      duration: 1500,
      recordCount: 2,
      success: true,
      testMode: true
    });
    logger.inventory.ocrResult('test-user-123', 'AB-123-CD', 0.95, {
      duration: 800,
      fileSize: 1024000,
      mimeType: 'image/jpeg',
      testMode: true
    });
    logger.inventory.error('test-user-123', new Error('Test OCR error'), {
      zone: 'Zone Test',
      fileCount: 1,
      testMode: true
    });
    console.log('✅ Logs d\'inventaire envoyés\n');

    // Test 4: Logs d'administration
    console.log('4. Test des logs d\'administration...');
    logger.admin.userCreated('admin@example.com', 'newuser@example.com', 'Test Concession', {
      userId: 'new-user-456',
      fullName: 'Test User',
      testMode: true
    });
    logger.admin.userUpdated('admin@example.com', 'user@example.com', {
      fullName: 'Updated Name',
      concession: 'New Concession'
    }, { testMode: true });
    logger.admin.concessionManaged('admin@example.com', 'created', 'Nouvelle Concession', {
      testMode: true
    });
    logger.admin.export('user@example.com', 'Test Concession', 
      { startDate: '2024-01-01', endDate: '2024-01-31' }, 150, {
      duration: 2000,
      csvSize: 50000,
      testMode: true
    });
    console.log('✅ Logs d\'administration envoyés\n');

    // Test 5: Logs de performance
    console.log('5. Test des logs de performance...');
    logger.performance.apiCall('/api/inventory', 'POST', 1200, 200, {
      userId: 'test-user-123',
      testMode: true
    });
    logger.performance.slowQuery('SELECT * FROM inventaire', 6000, {
      threshold: 5000,
      testMode: true
    });
    console.log('✅ Logs de performance envoyés\n');

    // Test 6: Métriques
    console.log('6. Test des métriques...');
    metricsCollector.recordApiCall('/api/test', 'GET', 500, 200, 'test-user-123');
    metricsCollector.recordApiCall('/api/test', 'GET', 1500, 200, 'test-user-456');
    metricsCollector.recordApiCall('/api/test', 'GET', 800, 500, 'test-user-789');
    
    metricsCollector.recordError('test_error', new Error('Test error'), {
      context: 'test-context',
      testMode: true
    });
    
    metricsCollector.recordUserActivity('test-user-123', 'test_action', {
      duration: 1000,
      success: true,
      testMode: true
    });
    console.log('✅ Métriques enregistrées\n');

    // Test 7: Masquage des données sensibles
    console.log('7. Test du masquage des données sensibles...');
    logger.info('Test données sensibles', {
      email: 'user@example.com',
      password: 'secret123',
      token: 'abc123token',
      api_key: 'key123',
      publicData: 'Cette donnée doit être visible',
      testMode: true
    });
    console.log('✅ Test de masquage effectué\n');

    // Test 8: Résumé des métriques
    console.log('8. Génération du résumé des métriques...');
    const summary = metricsCollector.getSummary();
    console.log('📊 Résumé des métriques:');
    console.log(`   - APIs testées: ${Object.keys(summary.apis).length}`);
    console.log(`   - Erreurs enregistrées: ${Object.keys(summary.errors).length}`);
    console.log(`   - Utilisateurs actifs: ${summary.users.active}`);
    console.log('✅ Résumé généré\n');

    // Test 9: Détection d'anomalies
    console.log('9. Test de détection d\'anomalies...');
    const anomalies = metricsCollector.detectAnomalies();
    console.log(`🔍 Anomalies détectées: ${anomalies.length}`);
    if (anomalies.length > 0) {
      anomalies.forEach((anomaly, index) => {
        console.log(`   ${index + 1}. ${anomaly.type} - ${anomaly.endpoint}`);
      });
    }
    console.log('✅ Détection d\'anomalies terminée\n');

    console.log('🎉 Tous les tests de logging sont terminés !');

    return res.status(200).json({
      success: true,
      message: 'Tests de logging terminés avec succès',
      summary: {
        apis: Object.keys(summary.apis).length,
        errors: Object.keys(summary.errors).length,
        activeUsers: summary.users.active,
        anomalies: anomalies.length
      },
      instructions: [
        'Vérifiez vos logs dans Axiom avec le dataset: ' + process.env.NEXT_PUBLIC_AXIOM_DATASET,
        'Filtrez par testMode:true pour voir uniquement les logs de test'
      ]
    });

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    logger.error('Erreur test logging', error, { testMode: true });
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}