# 🧪 Guide de Tests - FleetSnap

Ce document décrit la stratégie de tests automatisés simple et efficace pour FleetSnap, sans dépendances externes complexes.

## 📋 Types de Tests

### 1. **Test Rapide** (`scripts/test-quick.js`)
- **Objectif** : Vérification rapide de la structure et des fonctionnalités
- **Couverture** : Fichiers critiques, configuration, syntaxe
- **Commande** : `npm run test`

### 2. **Tests de Santé** (`scripts/test-health.js`)
- **Objectif** : Vérification approfondie de l'état de l'application
- **Couverture** : Structure, contenu, configuration, syntaxe JavaScript
- **Commande** : `npm run test:health`

### 3. **Tests d'API** (`scripts/test-api.js`)
- **Objectif** : Tester les endpoints API en conditions réelles
- **Couverture** : Accessibilité, codes de réponse, gestion d'erreurs
- **Commande** : `npm run test:api` (nécessite le serveur démarré)

### 4. **Tests d'Utilitaires** (`scripts/test-utils.js`)
- **Objectif** : Tester les fonctions utilitaires critiques
- **Couverture** : Formatage, validation, calculs
- **Commande** : Inclus dans les autres tests

## 🚀 Commandes Disponibles

```bash
# Installation des dépendances de test
npm install

# Test rapide de santé
node scripts/test-quick.js

# Tous les tests unitaires et d'intégration
npm run test

# Tests en mode watch (développement)
npm run test:watch

# Tests avec couverture de code
npm run test:coverage

# Tests E2E (nécessite que l'app tourne)
npm run test:e2e
    
# Tous les tests (unitaires + E2E)
npm run test:all

# Tests d'API uniquement
npm run test:api

# Tests unitaires uniquement
npm run test:unit
```

## 📊 Couverture de Code

### Objectifs de Couverture
- **Branches** : 70%
- **Fonctions** : 70%
- **Lignes** : 70%
- **Statements** : 70%

### Fichiers Critiques Testés
- ✅ `pages/inventory.js` - Page principale d'upload
- ✅ `pages/api/inventory.js` - API d'upload avec retry
- ✅ `lib/imageUtils.js` - Utilitaires de compression
- ✅ `lib/useRetryUpload.js` - Hook de retry intelligent
- ✅ `pages/admin.js` - Interface d'administration

## 🎯 Scénarios de Test Critiques

### Upload d'Inventaire
- [x] Validation des types de fichiers
- [x] Compression automatique des images lourdes
- [x] Retry automatique en cas d'erreur 413
- [x] Barre de progression en temps réel
- [x] Messages d'erreur personnalisés
- [x] Prévisualisation d'image
- [x] Validation des champs obligatoires

### Gestion d'Erreurs
- [x] Erreur 413 (fichier trop volumineux)
- [x] Erreur 401 (session expirée)
- [x] Erreur 500 (serveur indisponible)
- [x] Erreur réseau (pas de connexion)
- [x] Fichiers corrompus
- [x] Types de fichiers non supportés

### Interface Utilisateur
- [x] Responsive design (mobile/desktop)
- [x] Accessibilité des boutons
- [x] États de chargement
- [x] Validation en temps réel
- [x] Modals et interactions

### Administration
- [x] Reset de mot de passe avec Brevo
- [x] Création d'utilisateurs
- [x] Gestion des concessions
- [x] Interface mobile optimisée

## 🔧 Configuration des Tests

### Jest Configuration (`jest.config.js`)
```javascript
// Configuration pour les tests unitaires et d'intégration
// Inclut les mocks pour Next.js, Supabase, et les APIs du navigateur
```

### Playwright Configuration (`playwright.config.js`)
```javascript
// Configuration pour les tests E2E
// Support multi-navigateurs et mobile
```

### Mocks Disponibles
- **Supabase** : Auth, Database, Storage
- **Next.js Router** : Navigation et routing
- **File API** : Upload et manipulation de fichiers
- **Canvas API** : Compression d'images
- **LocalStorage** : Persistance côté client

## 📱 Tests Mobile

Les tests incluent une couverture spécifique pour mobile :
- **Responsive Design** : Vérification de l'affichage sur différentes tailles
- **Touch Interactions** : Boutons tactiles et gestures
- **Performance** : Temps de chargement sur connexions lentes
- **Accessibilité** : Navigation au clavier et lecteurs d'écran

## 🚨 Tests de Régression

### Avant chaque déploiement
```bash
# 1. Test rapide de santé
node scripts/test-quick.js

# 2. Tests complets
npm run test:all

# 3. Vérification de la couverture
npm run test:coverage
```

### Scénarios de Régression Critiques
1. **Upload d'image 5MB** → Doit être compressée et envoyée
2. **Upload d'image 15MB** → Doit échouer avec message explicite
3. **Perte de connexion pendant upload** → Doit retry automatiquement
4. **Session expirée** → Doit rediriger vers login
5. **Erreur serveur** → Doit afficher message d'erreur approprié

## 📈 Monitoring des Tests

### Métriques Surveillées
- **Temps d'exécution** des tests
- **Taux de succès** par type de test
- **Couverture de code** par module
- **Performance** des fonctions critiques

### Alertes
- Tests qui échouent > 2 fois consécutives
- Couverture de code < 70%
- Temps d'exécution > seuils définis
- Erreurs dans les tests E2E

## 🛠 Développement avec Tests

### Workflow Recommandé
1. **TDD** : Écrire le test avant la fonctionnalité
2. **Watch Mode** : `npm run test:watch` pendant le développement
3. **Pre-commit** : Tests automatiques avant chaque commit
4. **CI/CD** : Tests complets sur chaque PR

### Debugging des Tests
```bash
# Debug d'un test spécifique
npm run test -- --testNamePattern="nom du test" --verbose

# Debug des tests E2E
npm run test:e2e -- --debug

# Voir les traces Playwright
npm run test:e2e -- --trace on
```

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

## 🎯 Checklist de Test

Avant chaque release :

- [ ] `node scripts/test-quick.js` ✅
- [ ] `npm run test` ✅
- [ ] `npm run test:e2e` ✅
- [ ] `npm run test:coverage` ≥ 70% ✅
- [ ] Tests manuels sur mobile ✅
- [ ] Tests de charge basiques ✅

**L'application est prête pour la production ! 🚀**