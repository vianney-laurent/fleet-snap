# 🎯 Workflow FleetSnap - Version Simplifiée

## 📋 **Architecture nettoyée**

### **Edge Functions (2 seulement)**
- ✅ **`process-ocr`** : Traitement OCR principal
- ✅ **`test-gemini`** : Test de l'API Gemini

### **APIs Next.js**
- ✅ **`bulk.js`** : Upload batch de photos
- ✅ **`manual-trigger.js`** : Déclenchement manuel OCR
- ✅ **`triggerOcr.js`** : Fallback local (développement)

### **Scripts**
- ✅ **`deploy-edge-function.sh`** : Déploiement des Edge Functions
- ✅ **`analyze-upload-performance.js`** : Analyse des performances

## 🔄 **Workflow complet**

### **1. Upload de photos**
```
User → Upload photos → bulk.js → Supabase (status: pending) → Edge Function trigger
```

### **2. Traitement OCR automatique**
```
Edge Function → Récupère pending → Gemini 2.0 Flash → Update status: done
```

### **3. Déclenchement manuel**
```
User → Bouton OCR → manual-trigger.js → Edge Function → Traite tous les pending
```

## 🕐 **Cron de sécurité**

### **Supabase pg_cron**
```sql
-- Toutes les 5 minutes, rattrape les photos pending
SELECT cron.schedule('process-pending-ocr', '*/5 * * * *', $$
  SELECT net.http_post(url := 'https://[projet].supabase.co/functions/v1/cron-ocr', ...)
$$);
```

## 🧪 **Tests et diagnostic**

### **Page de test** : `/test-ocr-trigger`
1. **Test Gemini** : Vérifie la connexion API
2. **Test Edge Function** : Teste le traitement OCR
3. **Diagnostic complet** : URLs et configuration

### **Logs de diagnostic**
- **Supabase Dashboard** → Edge Functions → Logs
- **Supabase Dashboard** → SQL Editor → `SELECT * FROM cron.job_run_details`
- **Axiom** → Logs applicatifs

## 🚀 **Déploiement**

```bash
# Déployer les Edge Functions
./scripts/deploy-edge-function.sh

# Configurer les variables dans Supabase Dashboard
# - GEMINI_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## 🔧 **Résolution des problèmes**

### **Photos restent en pending**
1. Vérifier les logs Edge Function
2. Tester l'API Gemini séparément
3. Vérifier les variables d'environnement
4. Utiliser le déclenchement manuel

### **Erreur base64**
- ✅ **Résolu** : Conversion byte par byte

### **Timeout Edge Function**
- Limite à 10 photos par appel
- Traitement séquentiel pour éviter rate limiting

## 📊 **Métriques**

- **Upload** : Temps par photo, taille, succès/échecs
- **OCR** : Durée Gemini, taux de détection, erreurs
- **Performance** : Temps total, parallélisation

Cette architecture simplifiée est plus maintenable et debuggable ! 🎉