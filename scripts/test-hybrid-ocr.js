#!/usr/bin/env node

/**
 * Script de test pour le système OCR hybride FleetSnap
 * Usage: node scripts/test-hybrid-ocr.js
 */

console.log('🧪 Test du système OCR hybride FleetSnap...\n');

async function testHybridSystem() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('1. Test déclenchement manuel...');
  try {
    const response = await fetch(`${baseUrl}/api/inventory/triggerOcr`, {
      method: 'GET',
      headers: {
        'User-Agent': 'FleetSnap-Test-Script',
        'X-Triggered-By': 'manual-test'
      }
    });
    
    const result = await response.json();
    console.log('✅ Déclenchement manuel:', result);
  } catch (error) {
    console.error('❌ Erreur déclenchement manuel:', error.message);
  }
  
  console.log('\n2. Test déclenchement automatique (simulation)...');
  try {
    const response = await fetch(`${baseUrl}/api/inventory/triggerOcr`, {
      method: 'GET',
      headers: {
        'User-Agent': 'FleetSnap-Auto-Trigger',
        'X-Triggered-By': 'bulk-upload',
        'X-User-Id': 'test-user-123',
        'X-Record-Count': '3'
      }
    });
    
    const result = await response.json();
    console.log('✅ Déclenchement automatique:', result);
  } catch (error) {
    console.error('❌ Erreur déclenchement automatique:', error.message);
  }
  
  console.log('\n🎉 Tests terminés !');
  console.log('📊 Vérifiez les logs dans Axiom avec les filtres :');
  console.log('   - triggeredBy:"manual-test"');
  console.log('   - triggeredBy:"bulk-upload"');
  console.log('   - message:"Déclenchement traitement OCR hybride"');
}

testHybridSystem().catch(error => {
  console.error('❌ Erreur lors du test:', error.message);
  process.exit(1);
});

export { testHybridSystem };