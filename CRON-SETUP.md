# 🕐 Configuration du Cron OCR Supabase

## 🎯 **Objectif**
Déclencher automatiquement le traitement OCR toutes les 5 minutes pour rattraper les photos qui resteraient en `pending`.

## 🔧 **Configuration Supabase Cron**

### **1. Déployer l'Edge Function**
```bash
./scripts/deploy-edge-function.sh
```

### **2. Configuration SQL**
Dans Supabase SQL Editor, exécuter :
```sql
-- Remplacer [VOTRE-PROJET] et [VOTRE-SERVICE-ROLE-KEY]
SELECT cron.schedule(
  'process-pending-ocr',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://[VOTRE-PROJET].supabase.co/functions/v1/cron-ocr',
      headers := jsonb_build_object(
        'Authorization', 'Bearer [VOTRE-SERVICE-ROLE-KEY]'
      )
    );
  $$
);
```

## 📊 **Monitoring**

### **Logs Supabase**
- Dashboard Supabase → Edge Functions → cron-ocr → Logs
- SQL Editor → `SELECT * FROM cron.job_run_details ORDER BY start_time DESC`

### **Métriques Axiom**
Les crons sont loggés avec le tag `source: 'pg_cron'`

## ⚙️ **Configuration recommandée**

### **Fréquence**
- **5 minutes** : Bon équilibre entre réactivité et coût
- **10 minutes** : Plus économique si moins critique
- **2 minutes** : Plus réactif si critique

### **Horaires**
```bash
# Toutes les 5 minutes
"*/5 * * * *"

# Seulement en heures ouvrées (9h-18h, lun-ven)
"*/5 9-18 * * 1-5"

# Toutes les 10 minutes
"*/10 * * * *"
```

## 🎯 **Résultat**

Avec le cron en place :
1. **Upload photos** → Status `pending`
2. **Auto-trigger** → Traitement immédiat
3. **Si échec** → Cron rattrape dans les 5 minutes
4. **Robustesse** → Aucune photo perdue

**Votre système est maintenant 100% fiable !** 🚀