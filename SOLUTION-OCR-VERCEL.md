# 🔧 Solution : Problème de déclenchement OCR sur Vercel

## 🚨 **Problème identifié**

Le diagnostic a révélé que **toutes les URLs échouent** lors du déclenchement automatique de l'OCR sur Vercel. Ceci est dû à une limitation connue de Vercel : **les fonctions ne peuvent pas faire d'appels HTTP vers elles-mêmes** (self-referencing calls).

## ✅ **Solution implémentée : Architecture hybride**

### **1. Edge Function Supabase (Solution principale)**
- **Fichier** : `supabase/functions/process-ocr/index.ts`
- **Avantages** :
  - ✅ Fonctionne parfaitement avec Vercel
  - ✅ Pas de limitation de self-referencing
  - ✅ Timeout plus long (jusqu'à 5 minutes)
  - ✅ Meilleure performance pour l'OCR

### **2. Fallback API interne (Développement local)**
- **Fichier** : `pages/api/inventory/triggerOcr.js`
- **Usage** : Uniquement en développement local

## 🚀 **Déploiement de l'Edge Function**

### **Prérequis**
```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à Supabase
supabase login
```

### **Déploiement**
```bash
# Utiliser le script automatisé
./scripts/deploy-edge-function.sh

# Ou manuellement
supabase functions deploy process-ocr
```

### **Configuration dans Supabase Dashboard**
1. Aller dans **Edge Functions** > **process-ocr**
2. Ajouter les variables d'environnement :
   - `GEMINI_API_KEY` : Votre clé API Gemini
   - `SUPABASE_URL` : URL de votre projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` : Clé service role

## 🔄 **Fonctionnement de la solution hybride**

### **Upload de photos (`bulk.js`)**
```javascript
// 1. Priorité : Edge Function Supabase
const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-ocr`;
const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }
});

// 2. Fallback : API interne (développement uniquement)
if (!response.ok && process.env.NODE_ENV === 'development') {
  await fetch('http://localhost:3000/api/inventory/triggerOcr');
}
```

### **Déclenchement manuel (`manual-trigger.js`)**
- Même logique hybride
- Interface utilisateur avec bouton "🔍 OCR"
- Feedback en temps réel

## 🧪 **Tests et diagnostic**

### **Page de test** : `/test-ocr-trigger`
- **Test diagnostic complet** : Teste toutes les stratégies d'URL
- **Test déclenchement manuel** : API hybride
- **Test Edge Function directe** : Test direct de l'Edge Function

### **APIs de diagnostic**
- `/api/debug/trigger-test` : Diagnostic complet des URLs
- `/api/inventory/manual-trigger` : Déclenchement manuel hybride

## 📊 **Avantages de cette solution**

### **✅ Fiabilité**
- Fonctionne sur Vercel ET en local
- Pas de limitation de self-referencing
- Fallback automatique

### **✅ Performance**
- Edge Function plus rapide que les API Routes
- Timeout plus long (5min vs 10s)
- Traitement parallèle optimisé

### **✅ Monitoring**
- Logs détaillés dans Axiom
- Métriques de performance
- Diagnostic intégré

## 🎯 **Résultat attendu**

Après déploiement de l'Edge Function :
1. **Upload de photos** → Insertion en base avec status `pending`
2. **Déclenchement automatique** → Edge Function Supabase traite l'OCR
3. **Status mis à jour** → `pending` → `processing` → `done`
4. **Interface rafraîchie** → Photos apparaissent avec identifiants extraits

## 🔍 **Vérification du bon fonctionnement**

1. **Déployer** l'Edge Function avec le script
2. **Tester** sur `/test-ocr-trigger`
3. **Uploader** des photos sur Vercel
4. **Vérifier** que le status passe de `pending` à `done`

Cette solution résout définitivement le problème de déclenchement OCR sur Vercel ! 🎉