#!/bin/bash

# Script de déploiement de l'Edge Function OCR (version nettoyée)

echo "🚀 Déploiement de l'Edge Function process-ocr..."

# Vérifier Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI manquant"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Vérifier le fichier
if [ ! -f "supabase/functions/process-ocr/index.ts" ]; then
    echo "❌ Fichier Edge Function non trouvé"
    exit 1
fi

# Déployer les fonctions
echo "📤 Déploiement process-ocr..."
supabase functions deploy process-ocr &
PID1=$!

echo "📤 Déploiement test-gemini..."
supabase functions deploy test-gemini &
PID2=$!

echo "📤 Déploiement cron-ocr..."
supabase functions deploy cron-ocr &
PID3=$!

# Attendre les déploiements
wait $PID1
RESULT1=$?

wait $PID2
RESULT2=$?

wait $PID3
RESULT3=$?

echo ""
if [ $RESULT1 -eq 0 ]; then
    echo "✅ process-ocr déployé"
else
    echo "❌ Erreur process-ocr"
fi

if [ $RESULT2 -eq 0 ]; then
    echo "✅ test-gemini déployé"
else
    echo "❌ Erreur test-gemini"
fi

if [ $RESULT3 -eq 0 ]; then
    echo "✅ cron-ocr déployé"
else
    echo "❌ Erreur cron-ocr"
fi

echo ""
echo "🎯 Architecture avec cron:"
echo "   📋 process-ocr: Traitement OCR principal"
echo "   🧪 test-gemini: Test API Gemini"
echo "   🕐 cron-ocr: Cron de sécurité (toutes les 5min)"
echo ""
echo "🔧 Configuration Supabase Dashboard:"
echo "   Variables d'environnement à ajouter:"
echo "   - GEMINI_API_KEY"
echo "   - SUPABASE_URL" 
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "🧪 Tests:"
echo "   1. /test-ocr-trigger → Test Gemini"
echo "   2. /test-ocr-trigger → Test Edge Function"
echo "   3. Upload photos → Auto-trigger"