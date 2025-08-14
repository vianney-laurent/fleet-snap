#!/bin/bash

# Script de déploiement de l'Edge Function Supabase pour le traitement OCR

echo "🚀 Déploiement de l'Edge Function process-ocr..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "supabase/functions/process-ocr/index.ts" ]; then
    echo "❌ Fichier Edge Function non trouvé"
    echo "📁 Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

# Déployer la fonction v2 (version corrigée)
echo "📤 Déploiement de process-ocr-v2 en cours..."
supabase functions deploy process-ocr-v2

if [ $? -eq 0 ]; then
    echo "✅ Edge Function v2 déployée avec succès!"
    echo ""
    echo "🔧 Configuration requise dans Supabase Dashboard:"
    echo "   1. Aller dans Edge Functions > process-ocr-v2"
    echo "   2. Ajouter les variables d'environnement:"
    echo "      - GEMINI_API_KEY: votre clé API Gemini"
    echo "      - SUPABASE_URL: URL de votre projet Supabase"
    echo "      - SUPABASE_SERVICE_ROLE_KEY: clé service role"
    echo ""
    echo "🌐 URL de la fonction:"
    echo "   https://[votre-projet].supabase.co/functions/v1/process-ocr-v2"
    echo ""
    echo "🧪 Test de la fonction:"
    echo "   curl -X POST https://[votre-projet].supabase.co/functions/v1/process-ocr-v2 \\"
    echo "        -H 'Authorization: Bearer [service-role-key]' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"source\":\"test\"}'"
    echo ""
    echo "🔄 Optionnel: Déployer aussi l'ancienne version comme backup"
    echo "   supabase functions deploy process-ocr"
else
    echo "❌ Erreur lors du déploiement"
    exit 1
fi