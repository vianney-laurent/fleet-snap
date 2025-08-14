#!/bin/bash

echo "🧪 Test du cron Supabase..."

# Vérifier les variables
if [ -z "$SUPABASE_PROJECT_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Variables manquantes:"
    echo "   export SUPABASE_PROJECT_URL=https://votre-projet.supabase.co"
    echo "   export SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key"
    exit 1
fi

echo "🔧 Configuration détectée:"
echo "   URL: $SUPABASE_PROJECT_URL"
echo "   Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."

# Test de l'Edge Function cron-ocr
echo ""
echo "📤 Test de l'Edge Function cron-ocr..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$SUPABASE_PROJECT_URL/functions/v1/cron-ocr" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual-test","executed_at":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Edge Function OK"
    echo "📋 Réponse: $BODY"
else
    echo "❌ Edge Function échoué (HTTP $HTTP_CODE)"
    echo "📋 Réponse: $BODY"
    exit 1
fi

echo ""
echo "🎯 Prochaines étapes:"
echo "   1. Configurer le cron dans Supabase SQL Editor"
echo "   2. Utiliser le SQL fourni dans SUPABASE-CRON-SETUP.md"
echo "   3. Remplacer [VOTRE-PROJET] par votre URL"
echo "   4. Remplacer [SERVICE-ROLE-KEY] par votre clé"
echo ""
echo "✅ Test terminé avec succès!"