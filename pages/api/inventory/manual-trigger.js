import { createClient } from '@supabase/supabase-js';
import { withApiLogging, logger } from '../../../lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentification utilisateur
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    logger.info('Déclenchement manuel OCR', {
      userId: user.id,
      email: user.email
    });

    // Vérifier s'il y a des records pending
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('inventaire')
      .select('id')
      .eq('status', 'pending')
      .limit(1);
    
    if (fetchError) {
      logger.error('Erreur vérification records pending', fetchError);
      throw fetchError;
    }

    if (pendingRecords.length === 0) {
      return res.status(200).json({ 
        message: 'Aucun enregistrement en attente de traitement',
        pendingCount: 0
      });
    }

    // Stratégie hybride : Edge Function Supabase + Fallback API interne
    let response;
    let result;
    
    // 1. Priorité à l'Edge Function Supabase v2
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-ocr`;
      
      logger.info('Déclenchement manuel Edge Function', {
        userId: user.id,
        edgeFunctionUrl: edgeFunctionUrl.substring(0, 50) + '...',
        pendingCount: pendingRecords.length
      });

      try {
        response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'FleetSnap-Manual-Trigger',
            'X-Triggered-By': 'manual',
            'X-User-Id': user.id
          },
          body: JSON.stringify({
            source: 'manual-trigger',
            userId: user.id
          })
        });

        if (response.ok) {
          result = await response.json();
          logger.info('Edge Function manuelle réussie', {
            userId: user.id,
            result
          });
        } else {
          throw new Error(`Edge Function error: ${response.status} ${response.statusText}`);
        }
      } catch (edgeError) {
        logger.warn('Edge Function échouée, tentative fallback', {
          userId: user.id,
          error: edgeError.message
        });
        
        // 2. Fallback : API interne
        const baseUrl = req.headers.origin || 
                       `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}` ||
                       'http://localhost:3000';
        
        const triggerUrl = `${baseUrl}/api/inventory/triggerOcr`;
        
        response = await fetch(triggerUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'FleetSnap-Manual-Trigger-Fallback',
            'X-Triggered-By': 'manual-fallback',
            'X-User-Id': user.id
          }
        });

        if (!response.ok) {
          throw new Error(`Fallback API error: ${response.status} ${response.statusText}`);
        }

        result = await response.json();
      }
    } else {
      throw new Error('Configuration Supabase manquante');
    }
    
    logger.info('OCR manuel déclenché avec succès', {
      userId: user.id,
      result
    });

    return res.status(200).json({
      message: 'Traitement OCR déclenché avec succès',
      ...result
    });

  } catch (err) {
    logger.error('Erreur déclenchement manuel OCR', err);
    return res.status(500).json({ error: err.message });
  }
}

export default withApiLogging(handler);