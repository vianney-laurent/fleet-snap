// pages/api/health.js
// Endpoint de santé pour monitoring externe et interne

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { healthMonitor, createHealthEndpoint, initializeHealthMonitoring } from '../../lib/healthMonitor';
import { logger } from '../../lib/logger';

// Initialisation des services pour les checks de santé
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Initialiser le monitoring si pas déjà fait
let monitoringInitialized = false;

export default async function handler(req, res) {
    // Initialiser le monitoring au premier appel
    if (!monitoringInitialized) {
        try {
            initializeHealthMonitoring(supabase, ai);
            monitoringInitialized = true;
        } catch (error) {
            logger.error('Erreur initialisation monitoring', error);
        }
    }

    // Gérer les différentes méthodes HTTP
    if (req.method === 'HEAD') {
        // Check rapide pour la connectivité
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // Check complet de santé
        const healthEndpoint = await createHealthEndpoint();
        return healthEndpoint(req, res);
    }

    // Méthode non supportée
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
}