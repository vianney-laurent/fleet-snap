# Guide du système de logging FleetSnap

## Vue d'ensemble

FleetSnap utilise un système de logging centralisé basé sur Axiom pour surveiller et analyser l'activité de l'application. Ce système capture automatiquement les événements critiques, les performances et les erreurs.

## Configuration

### Variables d'environnement requises

```env
NEXT_PUBLIC_AXIOM_DATASET=fleetsnap
NEXT_PUBLIC_AXIOM_TOKEN=xaat-your-token-here
```

### Initialisation

Le système de logging est automatiquement initialisé au démarrage de l'application via `pages/_app.js`.

## Types de logs

### 1. Logs d'authentification

```javascript
// Connexion réussie
logger.auth.login(email, true, { userId, concession, name });

// Échec de connexion
logger.auth.login(email, false, { error: error.message });

// Session expirée
logger.auth.sessionExpired(email, { page: 'inventory' });

// Déconnexion
logger.auth.logout(email, { duration: sessionDuration });
```

### 2. Logs d'inventaire

```javascript
// Upload d'inventaire
logger.inventory.upload(userId, fileCount, zone, concession, {
  duration: totalDuration,
  recordCount: records.length,
  success: true
});

// Résultat OCR
logger.inventory.ocrResult(userId, identifiant, confidence, {
  duration: ocrDuration,
  fileSize: buffer.length,
  mimeType: file.mimetype
});

// Erreur d'inventaire
logger.inventory.error(userId, error, {
  zone,
  fileCount,
  duration: totalDuration
});
```

### 3. Logs d'administration

```javascript
// Création d'utilisateur
logger.admin.userCreated(adminEmail, newUserEmail, concession, {
  userId: data.user.id,
  fullName
});

// Modification d'utilisateur
logger.admin.userUpdated(adminEmail, targetUserEmail, changes);

// Gestion des concessions
logger.admin.concessionManaged(adminEmail, 'created', concessionName);

// Export de données
logger.admin.export(userEmail, concession, dateRange, recordCount, {
  duration: totalDuration,
  csvSize: csvContent.length
});
```

### 4. Logs de performance

```javascript
// Appel API
logger.performance.apiCall(endpoint, method, duration, statusCode, {
  userId,
  critical: true
});

// Requête lente
logger.performance.slowQuery(query, duration, {
  threshold: MONITORING_CONFIG.SLOW_API_THRESHOLD
});
```

### 5. Logs génériques

```javascript
// Information
logger.info('Message informatif', { data: 'contextuelle' });

// Avertissement
logger.warn('Message d\'avertissement', { data: 'contextuelle' });

// Erreur
logger.error('Message d\'erreur', error, { data: 'contextuelle' });
```

## Sécurité et confidentialité

### Données automatiquement masquées

Le système masque automatiquement les champs sensibles :
- `password`, `token`, `access_token`, `refresh_token`
- `api_key`, `secret`, `authorization`, `cookie`
- Toutes les clés d'environnement sensibles

### Exemple de masquage

```javascript
// Input
logger.info('Connexion', { 
  email: 'user@example.com', 
  password: 'secret123',
  token: 'abc123'
});

// Output dans Axiom
{
  message: 'Connexion',
  email: 'user@example.com',
  password: '[REDACTED]',
  token: '[REDACTED]'
}
```

## Monitoring et métriques

### APIs de monitoring

- `GET /api/monitoring/health` - État de santé du système
- `GET /api/monitoring/metrics` - Métriques détaillées

### Dashboard de monitoring

Accessible via `/monitoring` (réservé aux administrateurs).

### Métriques collectées

1. **Performance des APIs**
   - Nombre d'appels
   - Durée moyenne
   - Taux d'erreur
   - Dernier appel

2. **Activité utilisateurs**
   - Utilisateurs totaux
   - Utilisateurs actifs
   - Actions par utilisateur

3. **Santé du système**
   - Base de données Supabase
   - Stockage Supabase
   - Variables d'environnement
   - Utilisation mémoire

### Seuils d'alerte

```javascript
const MONITORING_CONFIG = {
  SLOW_API_THRESHOLD: 5000,     // 5 secondes
  SLOW_OCR_THRESHOLD: 10000,    // 10 secondes
  ERROR_RATE_THRESHOLD: 0.1,    // 10% d'erreurs
};
```

## Utilisation dans le code

### Wrapper automatique pour les APIs

```javascript
import { withApiLogging } from '../../lib/logger';

async function handler(req, res) {
  // Votre logique API
}

export default withApiLogging(handler);
```

### Logging manuel

```javascript
import { logger } from '../lib/logger';

// Dans vos composants ou APIs
logger.info('Événement important', { 
  userId: user.id,
  action: 'specific_action',
  metadata: { key: 'value' }
});
```

### Métriques personnalisées

```javascript
import { metricsCollector } from '../lib/monitoring';

// Enregistrer une activité utilisateur
metricsCollector.recordUserActivity(userId, 'custom_action', {
  duration: 1000,
  success: true
});

// Enregistrer une erreur
metricsCollector.recordError('custom_error', error, {
  context: 'additional_info'
});
```

## Bonnes pratiques

### 1. Contexte riche
Toujours inclure un contexte pertinent dans vos logs :

```javascript
// ✅ Bon
logger.info('Upload terminé', {
  userId: user.id,
  fileCount: files.length,
  zone: selectedZone,
  duration: Date.now() - startTime
});

// ❌ Mauvais
logger.info('Upload terminé');
```

### 2. Niveaux appropriés
- `info` : Événements normaux importants
- `warn` : Situations anormales mais non critiques
- `error` : Erreurs nécessitant une attention

### 3. Données sensibles
Ne jamais logger directement :
- Mots de passe
- Tokens d'authentification
- Données personnelles sensibles

### 4. Performance
Éviter les logs trop verbeux dans les boucles :

```javascript
// ✅ Bon
logger.info('Traitement de batch', { itemCount: items.length });
items.forEach(item => processItem(item));
logger.info('Batch terminé', { processedCount: items.length });

// ❌ Mauvais
items.forEach(item => {
  logger.info('Traitement item', { itemId: item.id }); // Trop verbeux
  processItem(item);
});
```

## Dépannage

### Logs non visibles dans Axiom

1. Vérifier les variables d'environnement
2. Vérifier la configuration Next.js (`next.config.ts`)
3. Vérifier les erreurs de réseau dans la console

### Performance dégradée

1. Réduire la verbosité des logs
2. Vérifier les seuils de monitoring
3. Optimiser les requêtes lentes identifiées

### Erreurs de monitoring

1. Vérifier l'accès aux APIs de monitoring
2. Vérifier les permissions Supabase
3. Consulter les logs d'erreur système

## Support

Pour toute question sur le système de logging :
1. Consulter ce guide
2. Vérifier les logs d'erreur dans Axiom
3. Contacter l'équipe de développement

## Évolutions futures

- Alertes automatiques par email/Slack
- Dashboard temps réel avec WebSockets
- Intégration avec des outils de monitoring externes
- Analyse prédictive des performances