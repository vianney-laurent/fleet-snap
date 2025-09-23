#!/usr/bin/env node
// scripts/validate-build-ready.js
// Validation finale avant build

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation finale avant build...\n');

const checks = [
  {
    name: 'Apostrophes échappées',
    files: ['pages/api/inventory.js', 'pages/api/inventory-optimized.js', 'pages/api/inventory-stable.js'],
    test: (content) => {
      const hasUnescapedApostrophes = content.includes("d'immatriculation") && !content.includes("d\\'immatriculation");
      return !hasUnescapedApostrophes;
    }
  },
  {
    name: 'Syntaxe JSX admin.js',
    files: ['pages/admin.js'],
    test: (content) => {
      // Vérifier que le fichier se termine correctement
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      return lastLine === '}';
    }
  },
  {
    name: 'Imports React hooks',
    files: ['lib/sessionManager.js', 'lib/connectivityManager.js', 'lib/clientValidator.js'],
    test: (content) => {
      // Vérifier que les hooks React ne sont pas importés au niveau module
      const hasTopLevelReactImport = content.includes("import { useState, useEffect } from 'react';");
      return !hasTopLevelReactImport;
    }
  }
];

let allPassed = true;
let totalChecks = 0;
let passedChecks = 0;

for (const check of checks) {
  console.log(`📋 ${check.name}`);
  
  for (const filePath of check.files) {
    const fullPath = path.join(process.cwd(), filePath);
    totalChecks++;
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ❌ Fichier manquant: ${filePath}`);
      allPassed = false;
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (check.test(content)) {
      console.log(`  ✅ ${filePath}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${filePath}`);
      allPassed = false;
    }
  }
  console.log('');
}

console.log('='.repeat(50));
console.log(`📊 Résultats: ${passedChecks}/${totalChecks} vérifications réussies`);
console.log(`📈 Taux de réussite: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (allPassed) {
  console.log('\n🎉 Prêt pour le build !');
  console.log('✅ Toutes les validations sont passées');
  console.log('🚀 Vous pouvez déployer sur Vercel');
  process.exit(0);
} else {
  console.log('\n⚠️  Des corrections sont encore nécessaires');
  console.log('❌ Certaines validations ont échoué');
  process.exit(1);
}