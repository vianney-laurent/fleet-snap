#!/usr/bin/env node
// scripts/fix-admin-syntax.js
// Script pour corriger les problèmes de syntaxe dans admin.js

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de la syntaxe admin.js...\n');

const adminPath = path.join(process.cwd(), 'pages/admin.js');

if (!fs.existsSync(adminPath)) {
  console.log('❌ Fichier admin.js non trouvé');
  process.exit(1);
}

let content = fs.readFileSync(adminPath, 'utf8');

// Nettoyer les caractères invisibles
content = content.replace(/\u00A0/g, ' '); // Non-breaking space
content = content.replace(/\u2028/g, '\n'); // Line separator
content = content.replace(/\u2029/g, '\n'); // Paragraph separator
content = content.replace(/\uFEFF/g, ''); // BOM

// Normaliser les fins de ligne
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Vérifier la structure de base
const lines = content.split('\n');
const lastLine = lines[lines.length - 1].trim();

if (lastLine !== '}') {
  console.log('❌ Le fichier ne se termine pas correctement');
  console.log(`Dernière ligne: "${lastLine}"`);
} else {
  console.log('✅ Structure de base correcte');
}

// Vérifier les accolades
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  switch (char) {
    case '{': braceCount++; break;
    case '}': braceCount--; break;
    case '(': parenCount++; break;
    case ')': parenCount--; break;
    case '[': bracketCount++; break;
    case ']': bracketCount--; break;
  }
}

console.log(`📊 Comptage des délimiteurs:`);
console.log(`  Accolades: ${braceCount === 0 ? '✅' : '❌'} (${braceCount})`);
console.log(`  Parenthèses: ${parenCount === 0 ? '✅' : '❌'} (${parenCount})`);
console.log(`  Crochets: ${bracketCount === 0 ? '✅' : '❌'} (${bracketCount})`);

// Réécrire le fichier nettoyé
fs.writeFileSync(adminPath, content, 'utf8');
console.log('\n✅ Fichier nettoyé et sauvegardé');

if (braceCount === 0 && parenCount === 0 && bracketCount === 0) {
  console.log('🎉 Syntaxe corrigée !');
  process.exit(0);
} else {
  console.log('⚠️  Des problèmes de syntaxe persistent');
  process.exit(1);
}