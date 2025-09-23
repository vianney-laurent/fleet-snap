#!/usr/bin/env node
// scripts/test-inventory-upload.js
// Test de l'API inventory avec données simulées

const FormData = require('form-data');
const fs = require('fs');
const http = require('http');
const path = require('path');

console.log('🔍 Test de l\'API inventory...\n');

// Créer une image de test simple (1x1 pixel PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
  0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
  0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Créer le FormData
const form = new FormData();
form.append('zone', 'test-zone');
form.append('comment', 'Test upload');
form.append('photos', testImageBuffer, {
  filename: 'test.png',
  contentType: 'image/png'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/inventory',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer test-token' // Token de test
  }
};

console.log('📤 Envoi de la requête...');
console.log('Headers:', options.headers);

const req = http.request(options, (res) => {
  console.log(`📡 Statut: ${res.statusCode}`);
  console.log(`📋 Headers de réponse:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 Réponse:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.log('Réponse brute:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Erreur de connexion:', err.message);
  console.log('\n💡 Assurez-vous que le serveur Next.js est démarré avec: npm run dev');
});

// Envoyer les données du formulaire
form.pipe(req);