#!/usr/bin/env node

// Script de vérification FleetSnap
const fs = require('fs');

console.log('🔍 FleetSnap - Vérification rapide\n');

// Vérifications essentielles
const files = [
  { path: 'pages/inventory.js', name: 'Page inventaire' },
  { path: 'pages/admin.js', name: 'Page admin' },
  { path: 'pages/api/inventory.js', name: 'API inventaire' },
  { path: 'lib/imageUtils.js', name: 'Utilitaires image' },
  { path: 'next.config.ts', name: 'Configuration Next.js' }
];

let allGood = true;

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ ${file.name}`);
  } else {
    console.log(`❌ ${file.name} - MANQUANT`);
    allGood = false;
  }
});

// Vérification des nouvelles fonctionnalités
try {
  const inventoryContent = fs.readFileSync('pages/inventory.js', 'utf8');
  const hasNewFeatures = inventoryContent.includes('imagePreview') && 
                         inventoryContent.includes('uploadProgress') && 
                         inventoryContent.includes('compressImage');
  
  if (hasNewFeatures) {
    console.log('✅ Nouvelles fonctionnalités d\'upload');
  } else {
    console.log('❌ Nouvelles fonctionnalités manquantes');
    allGood = false;
  }
} catch (e) {
  console.log('❌ Erreur lecture inventory.js');
  allGood = false;
}

console.log('\n' + (allGood ? '🎉 Tout est OK !' : '⚠️  Des éléments manquent'));

if (allGood) {
  console.log('\n🚀 Commandes utiles:');
  console.log('   npm run dev   - Démarrer l\'app');
  console.log('   npm run build - Build production');
}