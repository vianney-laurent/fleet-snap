# 🕐 Configuration Cron Supabase - Guide Complet

## 🎯 **Objectif**
Configurer un cron Supabase qui déclenche l'OCR toutes les 5 minutes pour rattraper les photos en `pending`.

## 📋 **Étapes de configuration**

### **1. Déployer les Edge Functions**
```bash
./scripts/deploy-edge-function.sh
```
Cela déploie :
- ✅ `process-ocr` : Traitement OCR principal
- ✅ `test-gemini` : Test API Gemini  
- ✅ `cron-ocr` : Fonction appelée par le cron

### **2. Configurer les variables d'environnement**
Dans **Supabase Dashboard** → **Edge Functions** → **Settings** :

```
GEMINI_API_KEY=votre-clé-gemini-ici
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

### **3. Activer pg_cron**
Dans **Supabase Dashboard** → **SQL Editor**, exécuter :

```sql
-- Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### **4. Programmer le cron**
Dans **SQL Editor**, remplacer `[VOTRE-PROJET]` et `[SERVICE-ROLE-KEY]` puis exécuter :

```sql
-- Programmer le cron toutes les 5 minutes
SELECT cron.schedule(
  'process-pending-ocr',                    -- Nom du job
  '*/5 * * * *',                           -- Toutes les 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://[VOTRE-PROJET].supabase.co/functions/v1/cron-ocr',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [SERVICE-ROLE-KEY]'
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'executed_at', now()
      )
    );
  $$
);
```

### **5. Vérifier la configuration**
```sql
-- Voir tous les crons programmés
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## 🧪 **Tests**

### **Test manuel de l'Edge Function**
```bash
curl -X POST https://[VOTRE-PROJET].supabase.co/functions/v1/cron-ocr \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual-test"}'
```

### **Vérifier les logs**
**Supabase Dashboard** → **Edge Functions** → **cron-ocr** → **Logs**

## ⚙️ **Personnalisation**

### **Changer la fréquence**
```sql
-- Modifier le cron existant
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-pending-ocr'),
  schedule := '*/10 * * * *'  -- Toutes les 10 minutes
);
```

### **Horaires ouvrés seulement**
```sql
-- Seulement 9h-18h, lundi-vendredi
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-pending-ocr'),
  schedule := '*/5 9-18 * * 1-5'
);
```

### **Supprimer le cron**
```sql
SELECT cron.unschedule('process-pending-ocr');
```

## 📊 **Monitoring**

### **Logs en temps réel**
```sql
-- Voir les dernières exécutions
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-pending-ocr')
ORDER BY start_time DESC 
LIMIT 5;
```

### **Statistiques**
```sql
-- Statistiques des 24 dernières heures
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-pending-ocr')
  AND start_time > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## 🎯 **Résultat**

Une fois configuré, votre système sera **100% fiable** :

1. **Upload photos** → Auto-trigger immédiat
2. **Si problème** → Cron rattrape dans les 5 minutes  
3. **Monitoring** → Logs détaillés dans Supabase
4. **Flexibilité** → Modification facile via SQL

**Votre FleetSnap est maintenant ultra-robuste !** 🚀