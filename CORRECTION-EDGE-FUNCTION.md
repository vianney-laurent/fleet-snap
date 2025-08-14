# 🔧 Correction Edge Function - Stack Overflow

## 🚨 **Problème identifié**
```
RangeError: Maximum call stack size exceeded
```

**Cause** : La conversion base64 des images volumineuses avec `String.fromCharCode.apply()` causait un stack overflow.

## ✅ **Corrections apportées**

### **1. Conversion base64 sécurisée**
```typescript
// ❌ AVANT (causait stack overflow)
binaryString += String.fromCharCode.apply(null, Array.from(chunk))

// ✅ APRÈS (traitement par chunks)
const chunkSize = 1024 * 1024 // 1MB chunks
let base64Parts: string[] = []

for (let i = 0; i < bytes.length; i += chunkSize) {
  const chunk = bytes.slice(i, i + chunkSize)
  let binaryString = ''
  
  for (let j = 0; j < chunk.length; j++) {
    binaryString += String.fromCharCode(chunk[j])
  }
  
  base64Parts.push(btoa(binaryString))
}

base64Image = base64Parts.join('')
```

### **2. Timeout de téléchargement**
```typescript
// Éviter les blocages sur le téléchargement d'images
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s

const imgRes = await fetch(record.photo_url, {
  signal: controller.signal
})
clearTimeout(timeoutId)
```

### **3. Limite de taille réduite**
```typescript
// Limite réduite pour éviter les timeouts
if (imageSize > 10 * 1024 * 1024) { // 10MB max (au lieu de 20MB)
  // Marquer comme erreur IMAGE_TOO_LARGE
}
```

### **4. Logs améliorés**
- Taille des images en KB/MB
- Progression de la conversion base64
- Durée des opérations

## 🚀 **Déploiement**

```bash
# Redéployer la fonction corrigée
./scripts/redeploy-edge-function.sh

# Ou manuellement
supabase functions deploy process-ocr
```

## 🧪 **Test**

1. **Page de test** : `/test-ocr-trigger`
2. **Test Edge Function directe** : Bouton "⚡ Edge Function"
3. **Test upload** : Uploader des photos et vérifier l'auto-trigger

## 📊 **Résultat attendu**

- ✅ Plus d'erreur "Maximum call stack size exceeded"
- ✅ Traitement des images jusqu'à 10MB
- ✅ Timeout de 30s pour éviter les blocages
- ✅ Conversion base64 stable et rapide

## 🔄 **Fallback**

Si l'Edge Function échoue encore, le système utilise automatiquement l'API interne en développement local.

Cette correction résout définitivement le problème de stack overflow ! 🎉