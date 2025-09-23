#!/usr/bin/env node
// scripts/validate-priority1-final.js
// Validation finale des améliorations priorité 1

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation finale des améliorations priorité 1...\n');

const improvements = [
  {
    name: '🔐 Gestion de Session Robuste',
    files: [
      { path: 'lib/sessionManager.js', required: ['SessionManager', 'useSessionManager', 'scheduleRefresh'] },
      { path: 'pages/inventory.js', required: ['useSessionManager', 'session'] }
    ]
  },
  {
    name: '✅ Validation Côté Client',
    files: [
      { path: 'lib/clientValidator.js', required: ['ImageValidator', 'FormValidator', 'useFormValidation'] },
      { path: 'pages/inventory.js', required: ['validateField', 'validationResults'] }
    ]
  },
  {
    name: '📶 Indicateurs de Connectivité',
    files: [
      { path: 'lib/connectivityManager.js', required: ['ConnectivityManager', 'useConnectivity', 'addToOfflineQueue'] },
      { path: 'components/ConnectivityIndicator.js', required: ['ConnectivityIndicator', 'ConnectivityBanner', 'ConnectivityDot'] },
      { path: 'pages/inventory.js', required: ['useConnectivity', 'ConnectivityBanner'] },
      { path: 'components/Header.js', required: ['ConnectivityDot'] },
      { path: 'pages/admin.js', required: ['ConnectivityIndicator'] }
    ]
  }
];

let totalChecks = 0;
let passedChecks = 0;
let allPassed = true;

for (const improvement of improvements) {
  console.log(`📋 ${improvement.name}`);
  
  for (const fileCheck of improvement.files) {
    const filePath = path.join(process.cwd(), fileCheck.path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ Fichier manquant: ${fileCheck.path}`);
      allPassed = false;
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const required of fileCheck.required) {
      totalChecks++;
      if (content.includes(required)) {
        console.log(`  ✅ ${required} trouvé dans ${fileCheck.path}`);
        passedChecks++;
      } else {
        console.log(`  ❌ ${required} manquant dans ${fileCheck.path}`);
        allPassed = false;
      }
    }
  }
  console.log('');
}

// Vérifications fonctionnelles spécifiques
console.log('🔧 Vérifications fonctionnelles...\n');

// Vérifier l'intégration session dans inventory.js
const inventoryPath = path.join(process.cwd(), 'pages/inventory.js');
if (fs.existsSync(inventoryPath)) {
  const inventoryContent = fs.readFileSync(inventoryPath, 'utf8');
  
  totalChecks += 3;
  
  if (inventoryContent.includes('session') && inventoryContent.includes('sessionLoading')) {
    console.log('  ✅ Gestion de session intégrée dans inventory');
    passedChecks++;
  } else {
    console.log('  ❌ Gestion de session non intégrée dans inventory');
    allPassed = false;
  }
  
  if (inventoryContent.includes('validateField') && inventoryContent.includes('validation.valid')) {
    console.log('  ✅ Validation côté client intégrée dans inventory');
    passedChecks++;
  } else {
    console.log('  ❌ Validation côté client non intégrée dans inventory');
    allPassed = false;
  }
  
  if (inventoryContent.includes('addToQueue') && inventoryContent.includes('isOnline')) {
    console.log('  ✅ Gestion hors ligne intégrée dans inventory');
    passedChecks++;
  } else {
    console.log('  ❌ Gestion hors ligne non intégrée dans inventory');
    allPassed = false;
  }
}

// Vérifier l'intégration dans Header.js
const headerPath = path.join(process.cwd(), 'components/Header.js');
if (fs.existsSync(headerPath)) {
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  
  totalChecks++;
  
  if (headerContent.includes('ConnectivityDot') && headerContent.includes('<ConnectivityDot')) {
    console.log('  ✅ Indicateur de connectivité intégré dans Header');
    passedChecks++;
  } else {
    console.log('  ❌ Indicateur de connectivité non intégré dans Header');
    allPassed = false;
  }
}

// Vérifier l'intégration dans admin.js
const adminPath = path.join(process.cwd(), 'pages/admin.js');
if (fs.existsSync(adminPath)) {
  const adminContent = fs.readFileSync(adminPath, 'utf8');
  
  totalChecks++;
  
  if (adminContent.includes('ConnectivityIndicator') && adminContent.includes('<ConnectivityIndicator')) {
    console.log('  ✅ Indicateur de connectivité intégré dans Admin');
    passedChecks++;
  } else {
    console.log('  ❌ Indicateur de connectivité non intégré dans Admin');
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Résultats: ${passedChecks}/${totalChecks} vérifications réussies`);
console.log(`📈 Taux de réussite: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (allPassed) {
  console.log('\n🎉 Toutes les améliorations priorité 1 sont implémentées !');
  console.log('\n✨ Fonctionnalités ajoutées:');
  console.log('  🔐 Auto-refresh des sessions + détection d\'expiration');
  console.log('  ✅ Validation immédiate côté client avec feedback');
  console.log('  📶 Indicateurs de connectivité + queue hors ligne');
  console.log('  🔄 Gestion automatique des uploads hors ligne');
  console.log('  📱 Bannières et notifications de statut réseau');
  
  console.log('\n🧪 Tests recommandés:');
  console.log('  1. Tester l\'upload avec/sans connexion');
  console.log('  2. Vérifier les validations de fichiers');
  console.log('  3. Observer les indicateurs de connectivité');
  console.log('  4. Tester l\'auto-refresh de session');
  
  process.exit(0);
} else {
  console.log('\n⚠️  Certaines améliorations sont incomplètes.');
  console.log('\n📝 Actions recommandées:');
  console.log('1. Vérifier les fichiers manquants');
  console.log('2. Compléter les intégrations manquantes');
  console.log('3. Tester les fonctionnalités implémentées');
  console.log('4. Relancer ce script pour validation');
  process.exit(1);
}