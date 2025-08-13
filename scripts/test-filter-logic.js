#!/usr/bin/env node

/**
 * Test de la logique des filtres FleetSnap
 */

const ALL_STATUSES = ['pending', 'processing', 'done', 'error'];

function toggleStatus(currentFilter, statusToToggle) {
  let next;
  const isCurrentlySelected = currentFilter.includes(statusToToggle);
  const isAllCurrentlySelected = currentFilter.length === ALL_STATUSES.length && 
                                ALL_STATUSES.every(status => currentFilter.includes(status));
  
  if (isAllCurrentlySelected) {
    // CAS SPÉCIAL: Si tout est sélectionné → ne garder que ce statut
    next = [statusToToggle];
  } else if (isCurrentlySelected) {
    // COMPORTEMENT: Clic sur un statut déjà sélectionné → le retirer
    next = currentFilter.filter(x => x !== statusToToggle);
    // Si on retire le dernier, revenir à "tout"
    if (next.length === 0) {
      next = [...ALL_STATUSES];
    }
  } else {
    // COMPORTEMENT: Clic sur un statut non sélectionné → l'ajouter
    next = [...currentFilter, statusToToggle];
  }
  
  return next;
}

console.log('🧪 Test de la logique des filtres\n');

// Test 1: État initial (tout sélectionné) → clic sur "done"
let filter = [...ALL_STATUSES];
console.log('1. État initial:', filter);
filter = toggleStatus(filter, 'done');
console.log('   Après clic sur "done":', filter);
console.log('   ✅ Attendu: ["done"] - Obtenu:', filter.length === 1 && filter[0] === 'done' ? '✅' : '❌');

// Test 2: Ajouter "pending" à la sélection
console.log('\n2. État actuel:', filter);
filter = toggleStatus(filter, 'pending');
console.log('   Après clic sur "pending":', filter);
console.log('   ✅ Attendu: ["done", "pending"] - Obtenu:', filter.length === 2 && filter.includes('done') && filter.includes('pending') ? '✅' : '❌');

// Test 3: Retirer "done" de la sélection
console.log('\n3. État actuel:', filter);
filter = toggleStatus(filter, 'done');
console.log('   Après clic sur "done" (déjà sélectionné):', filter);
console.log('   ✅ Attendu: ["pending"] - Obtenu:', filter.length === 1 && filter[0] === 'pending' ? '✅' : '❌');

// Test 4: Retirer le dernier statut → revenir à tout
console.log('\n4. État actuel:', filter);
filter = toggleStatus(filter, 'pending');
console.log('   Après retrait du dernier statut:', filter);
console.log('   ✅ Attendu: tout sélectionné - Obtenu:', filter.length === ALL_STATUSES.length ? '✅' : '❌');

console.log('\n🎉 Tests terminés !');