-- Configuration du cron pour déclencher l'OCR toutes les 5 minutes
-- À exécuter dans le SQL Editor de Supabase

-- Créer l'extension pg_cron si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programmer le cron pour s'exécuter toutes les 5 minutes
SELECT cron.schedule(
  'process-pending-ocr',           -- nom du job
  '*/5 * * * *',                   -- toutes les 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://[VOTRE-PROJET].supabase.co/functions/v1/cron-ocr',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [VOTRE-SERVICE-ROLE-KEY]'
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'executed_at', now()
      )
    );
  $$
);

-- Vérifier que le cron est bien programmé
SELECT * FROM cron.job;