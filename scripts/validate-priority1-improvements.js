#!/usr/bin/env node
// scripts/validate-priority1-improvements.js
// Script de validation des améliorations priorité 1

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation des améliorations priorité 1...\n');

const checks = [
  {
    name: 'Optimiseur de performance',
    file: 'lib/performanceOptimizer.js',
    required: ['MemoryCache', 'RequestManager', 'MemoryMonitor', 'debounce', 'throttle']
  },
  {
    name: 'Validateur de sécurité',
    file: 'lib/securityValidator.js',
    required: ['validateEmail', 'validatePassword', 'validateImageFile', 'RateLimiter']
  },
  {
    name: 'Gestionnaire d\'erreurs',
    file: 'lib/errorHandler.js',
    required: ['ErrorHandler', 'classifyError', 'withErrorHandling', 'ErrorRecovery']
  },
  {
    name: 'Moniteur de santé',
    file: 'lib/healthMonitor.js',
    required: ['HealthMonitor', 'createSupabaseHealthCheck', 'createMemoryHealthCheck']
  },
  {
    name: 'API inventory optimisée',
    file: 'pages/api/inventory-optimized.js',
    required: ['validateApiRequest', 'rateLimiter', 'requestManager']
  },
  {
    name: 'Endpoint de santé',
    file: 'pages/api/health.js',
    required: ['healthMonitor', 'createHealthEndpoint']
  },
  {
    name: 'Composant de monitoring',
    file: 'components/SystemMonitor.js',
    required: ['SystemMonitor', 'healthMonitor', 'errorHandler']
  }
];

let allPassed = true;
let totalChecks = 0;
let passedChecks = 0;

for (const check of checks) {
  console.log(`📋 Vérification: ${check.name}`);
  
  const filePath = path.join(process.cwd(), check.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ Fichier manquant: ${check.file}`);
    allPassed = false;
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  for (const required of check.required) {
    totalChecks++;
    if (content.includes(required)) {
      console.log(`  ✅ ${required} trouvé`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${required} manquant`);
      allPassed = false;
    }
  }
  
  console.log('');
}

// Vérifications spécifiques
console.log('🔧 Vérifications spécifiques...\n');

// Vérifier l'intégration dans admin.js
const adminPath = path.join(process.cwd(), 'pages/admin.js');
if (fs.existsSync(adminPath)) {
  const adminContent = fs.readFileSync(adminPath, 'utf8');
  
  totalChecks += 3;
  
  if (adminContent.includes('SystemMonitor')) {
    console.log('  ✅ SystemMonitor intégré dans admin.js');
    passedChecks++;
  } else {
    console.log('  ❌ SystemMonitor non intégré dans admin.js');
    allPassed = false;
  }
  
  if (adminContent.includes('useErrorHandler')) {
    console.log('  ✅ useErrorHandler utilisé dans admin.js');
    passedChecks++;
  } else {
    console.log('  ❌ useErrorHandler non utilisé dans admin.js');
    allPassed = false;
  }
  
  if (adminContent.includes('monitoring')) {
    console.log('  ✅ Onglet monitoring ajouté');
    passedChecks++;
  } else {
    console.log('  ❌ Onglet monitoring manquant');
    allPassed = false;
  }
} else {
  console.log('  ❌ pages/admin.js non trouvé');
  allPassed = false;
  totalChecks += 3;
}

// Vérifier l'intégration dans inventory.js
const inventoryPath = path.join(process.cwd(), 'pages/inventory.js');
if (fs.existsSync(inventoryPath)) {
  const inventoryContent = fs.readFileSync(inventoryPath, 'utf8');
  
  totalChecks += 2;
  
  if (inventoryContent.includes('memoryMonitor') || inventoryContent.includes('performanceOptimizer')) {
    console.log('  ✅ Optimisations performance intégrées dans inventory.js');
    passedChecks++;
  } else {
    console.log('  ❌ Optimisations performance non intégrées dans inventory.js');
    allPassed = false;
  }
  
  if (inventoryContent.includes('networkError') || inventoryContent.includes('isOnline')) {
    console.log('  ✅ Gestion connectivité réseau dans inventory.js');
    passedChecks++;
  } else {
    console.log('  ❌ Gestion connectivité réseau manquante dans inventory.js');
    allPassed = false;
  }
} else {
  console.log('  ❌ pages/inventory.js non trouvé');
  allPassed = false;
  totalChecks += 2;
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Résultats: ${passedChecks}/${totalChecks} vérifications réussies`);
console.log(`📈 Taux de réussite: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (allPassed) {
  console.log('🎉 Toutes les améliorations priorité 1 sont implémentées !');
  process.exit(0);
} else {
  console.log('⚠️  Certaines améliorations priorité 1 sont manquantes.');
  console.log('\n📝 Actions recommandées:');
  console.log('1. Vérifier les fichiers manquants');
  console.log('2. Compléter les intégrations manquantes');
  console.log('3. Tester les fonctionnalités implémentées');
  console.log('4. Relancer ce script pour validation');
  process.exit(1);
}