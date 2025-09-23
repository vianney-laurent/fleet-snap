#!/usr/bin/env node
// scripts/fix-apostrophes.js
// Script pour vérifier et corriger les apostrophes dans les fichiers

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des apostrophes dans les fichiers...\n');

const filesToCheck = [
  'pages/api/inventory.js',
  'pages/api/inventory-optimized.js', 
  'pages/api/inventory-stable.js'
];

let issuesFound = 0;

for (const filePath of filesToCheck) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    continue;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Vérifier les apostrophes non échappées dans les chaînes
  const problematicLines = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Chercher les apostrophes non échappées dans les chaînes
    if (line.includes("'") && line.includes("d'immatriculation") && !line.includes("d\\'immatriculation")) {
      problematicLines.push({
        lineNumber: index + 1,
        content: line.trim()
      });
    }
  });
  
  if (problematicLines.length > 0) {
    console.log(`❌ ${filePath}:`);
    problematicLines.forEach(issue => {
      console.log(`  Ligne ${issue.lineNumber}: ${issue.content}`);
    });
    issuesFound += problematicLines.length;
  } else {
    console.log(`✅ ${filePath}: OK`);
  }
}

console.log(`\n📊 Résultat: ${issuesFound} problème(s) trouvé(s)`);

if (issuesFound === 0) {
  console.log('🎉 Tous les fichiers sont corrects !');
  process.exit(0);
} else {
  console.log('⚠️  Des corrections sont nécessaires.');
  process.exit(1);
}