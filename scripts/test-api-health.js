#!/usr/bin/env node
// scripts/test-api-health.js
// Test rapide de l'API de santé

const http = require('http');

console.log('🔍 Test de l\'API de santé...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\n📊 Réponse de santé:');
      console.log(`  Santé générale: ${parsed.healthy ? '✅ Sain' : '❌ Problème'}`);
      console.log(`  Uptime: ${Math.round(parsed.uptime / 1000)}s`);
      
      if (parsed.checks) {
        console.log('\n🔧 Checks détaillés:');
        for (const [name, check] of Object.entries(parsed.checks)) {
          const status = check.status === 'healthy' ? '✅' : '❌';
          console.log(`  ${name}: ${status} ${check.status}`);
          if (check.error) {
            console.log(`    Erreur: ${check.error}`);
          }
        }
      }
      
      if (parsed.metrics) {
        console.log('\n📈 Métriques:');
        if (parsed.metrics.requests) {
          console.log(`  Requêtes totales: ${parsed.metrics.requests.total}`);
          console.log(`  Succès: ${parsed.metrics.requests.success}`);
          console.log(`  Erreurs: ${parsed.metrics.requests.errors}`);
        }
        if (parsed.metrics.performance) {
          console.log(`  Temps moyen: ${Math.round(parsed.metrics.performance.avgResponseTime)}ms`);
        }
      }
      
    } catch (err) {
      console.log('\n📄 Réponse brute:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Erreur de connexion:', err.message);
  console.log('\n💡 Assurez-vous que le serveur Next.js est démarré avec: npm run dev');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('⏰ Timeout de la requête');
  req.destroy();
  process.exit(1);
});

req.end();