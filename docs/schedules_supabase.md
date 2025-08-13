

# ⏱️ Schedules Supabase — `process-pending`

> Supabase exécute les schedules en **UTC**.  
> Été : Paris = **CEST (UTC+2)** · Hiver : Paris = **CET (UTC+1)**

## 🎯 Objectif
- **Lun–Ven 07:00–18:00 (Paris)** → toutes les **2 minutes**
- **Lun–Ven 18:01–06:59 (Paris)** → toutes les **30 minutes**
- **Samedi & Dimanche** → **toutes les heures**

---

## ☀️ Été (CEST, UTC+2) — à utiliser maintenant

**Mapping :**  
07:00–18:00 Paris ⇒ **05:00–16:59 UTC**  
18:01–06:59 Paris ⇒ **16:01–04:59 UTC**

Créer des **Schedules** (Function = `process-pending`) avec ces crons :

**1) Lun–Ven — heures ouvrées (toutes les 2 min)**  
Nom : `workdays_fast`
```
*/2 5-16 * * 1-5
```

**2) Lun–Ven — 16:01–16:59 UTC (toutes les 30 min :01/:31)**  
Nom : `workdays_evening_16utc`
```
1,31 16 * * 1-5
```

**3) Lun–Ven — 17:00–21:59 UTC (toutes les 30 min)**  
Nom : `workdays_evening_17to21utc`
```
*/30 17-21 * * 1-5
```

**4) Lun–Jeu 22–23 UTC & Dim 22–23 UTC (toutes les 30 min)**  
→ couvre Paris 00:00–01:59 (nuit suivante)  
Nom : `workdays_late_22to23utc`
```
*/30 22-23 * * 0,1-4
```

**5) Lun–Ven — 00:00–04:59 UTC (toutes les 30 min)**  
Nom : `workdays_night_0to4utc`
```
*/30 0-4 * * 1-5
```

**6) Week-end — toutes les heures (sam & dim)**  
Nom : `weekend_hourly`
```
0 * * * 6,0
```

---

## ❄️ Hiver (CET, UTC+1) — à activer au changement d’heure

**Mapping :**  
07:00–18:00 Paris ⇒ **06:00–17:59 UTC**  
18:01–06:59 Paris ⇒ **17:01–05:59 UTC**

**Remplacer par :**

**1) Lun–Ven — heures ouvrées (toutes les 2 min)**
```
*/2 6-17 * * 1-5
```

**2) Lun–Ven — 17:01–17:59 UTC (à :01/:31)**
```
1,31 17 * * 1-5
```

**3) Lun–Ven — 18:00–22:59 UTC (toutes les 30 min)**
```
*/30 18-22 * * 1-5
```

**4) Dim–Jeu — 23:00 UTC (toutes les 30 min)**
```
*/30 23 * * 0,1-4
```

**5) Lun–Ven — 00:00–05:59 UTC (toutes les 30 min)**
```
*/30 0-5 * * 1-5
```

**6) Week-end — toutes les heures**
```
0 * * * 6,0
```

---

## ⚙️ Paramètres & surveillance

- **Batch size** (nombre max d’items traités par run) : variable d’env Supabase  
  `PROCESS_BATCH_SIZE` (ex. `50`)
- **Robustesse** : la Function “claim” une ligne (`pending → processing`), reprend les `processing`, met `NO_DETECTION` si image inaccessible.
- **Suivi rapide (SQL)** :
```sql
select status, count(*) 
from public.inventaire 
group by status;
```

---

## ✅ Checklist « changement d’heure »

- [ ] Dans Supabase → **Functions → Schedules**, **désactiver** les crons “Été”
- [ ] **Créer/activer** les crons “Hiver” (ou l’inverse au printemps)
- [ ] Vérifier `PROCESS_BATCH_SIZE` (env var) est toujours OK
- [ ] Lancer un **Invoke** manuel de `process-pending` pour valider (Logs = OK)
- [ ] Contrôler la file :
```sql
select status, count(*) 
from public.inventaire 
group by status;
```