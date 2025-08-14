#!/bin/bash

echo "🔄 Redéploiement de l'Edge Function corrigée..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "📦 Installation: npm install -g supabase"
    exit 1
fi

# Déployer la fonction corrigée
echo "📤 Déploiement de process-ocr (version corrigée)..."
supabase functions deploy process-ocr

if [ $? -eq 0 ]; then
    echo "✅ Edge Function redéployée avec succès!"
    echo ""
    echo "🔧 Corrections apportées:"
    echo "   ✅ Conversion base64 par chunks (évite stack overflow)"
    echo "   ✅ Timeout de 30s pour le téléchargement"
    echo "   ✅ Limite de taille réduite à 10MB"
    echo "   ✅ Gestion d'erreur améliorée"
    echo ""
    echo "🧪 Testez maintenant:"
    echo "   1. Allez sur /test-ocr-trigger"
    echo "   2. Cliquez sur 'Edge Function'"
    echo "   3. Uploadez des photos pour tester l'auto-trigger"
else
    echo "❌ Erreur lors du redéploiement"
    exit 1
fi