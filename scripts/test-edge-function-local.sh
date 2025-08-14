#!/bin/bash

# Script de test local de l'Edge Function

echo "🧪 Test local de l'Edge Function process-ocr-v2..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "supabase/functions/process-ocr-v2/index.ts" ]; then
    echo "❌ Fichier Edge Function v2 non trouvé"
    echo "📁 Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

# Démarrer Supabase localement
echo "🚀 Démarrage de Supabase local..."
supabase start

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du démarrage de Supabase local"
    exit 1
fi

# Servir les fonctions localement
echo "📡 Démarrage du serveur Edge Functions local..."
supabase functions serve process-ocr-v2 --env-file .env.local &
SERVE_PID=$!

# Attendre que le serveur démarre
sleep 5

# Tester la fonction
echo "🔍 Test de la fonction..."
curl -X POST http://localhost:54321/functions/v1/process-ocr-v2 \
  -H "Authorization: Bearer $(supabase status | grep 'service_role key' | awk '{print $3}')" \
  -H "Content-Type: application/json" \
  -d '{"source":"local-test","userId":"test-user"}'

# Nettoyer
echo ""
echo "🧹 Nettoyage..."
kill $SERVE_PID 2>/dev/null

echo "✅ Test terminé!"
echo ""
echo "💡 Pour tester en continu:"
echo "   supabase functions serve process-ocr-v2 --env-file .env.local"
echo "   # Dans un autre terminal:"
echo "   curl -X POST http://localhost:54321/functions/v1/process-ocr-v2 \\"
echo "        -H 'Authorization: Bearer [anon-key]' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"source\":\"test\"}'"