-- 1. Vérifier que le cron est bien programmé
SELECT * FROM cron.job;

-- 2. Voir l'historique d'exécution (dernières 10 exécutions)
SELECT 
  start_time,
  end_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC 
LIMIT 10;

-- 3. Voir les erreurs récentes
SELECT 
  start_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = 1 
  AND status != 'succeeded'
ORDER BY start_time DESC 
LIMIT 5;

-- 4. Statistiques des dernières 24h
SELECT 
  status,
  COUNT(*) as count,
  MIN(start_time) as first_execution,
  MAX(start_time) as last_execution
FROM cron.job_run_details 
WHERE jobid = 1
  AND start_time > NOW() - INTERVAL '24 hours'
GROUP BY status;