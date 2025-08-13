/**
 * Utilitaires pour la gestion des images dans FleetSnap
 */

/**
 * Détecte le mimeType d'une image de manière robuste
 * @param {Response} response - Réponse fetch de l'image
 * @param {string} imageUrl - URL de l'image pour fallback
 * @param {ArrayBuffer} arrayBuffer - Buffer de l'image pour détection par signature
 * @returns {string} mimeType détecté
 */
export function detectImageMimeType(response, imageUrl, arrayBuffer) {
  // 1. Essayer d'abord le header Content-Type
  let mimeType = response.headers.get('content-type');
  
  if (mimeType && mimeType !== 'application/octet-stream' && mimeType.startsWith('image/')) {
    return mimeType;
  }
  
  // 2. Détection par signature de fichier (magic bytes)
  const bytes = new Uint8Array(arrayBuffer);
  
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes.length >= 8 && 
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return 'image/png';
  }
  
  // WebP: RIFF....WEBP
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  
  // GIF: GIF87a ou GIF89a
  if (bytes.length >= 6 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return 'image/gif';
  }
  
  // 3. Fallback basé sur l'extension de l'URL
  if (imageUrl) {
    const urlLower = imageUrl.toLowerCase();
    if (urlLower.includes('.png')) return 'image/png';
    if (urlLower.includes('.webp')) return 'image/webp';
    if (urlLower.includes('.gif')) return 'image/gif';
    if (urlLower.includes('.bmp')) return 'image/bmp';
    if (urlLower.includes('.tiff') || urlLower.includes('.tif')) return 'image/tiff';
  }
  
  // 4. Défaut JPEG (le plus courant pour les photos)
  return 'image/jpeg';
}

/**
 * Valide qu'un mimeType est supporté par Gemini
 * @param {string} mimeType 
 * @returns {boolean}
 */
export function isValidImageMimeType(mimeType) {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];
  
  return mimeType && supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Formate la taille d'un fichier en format lisible
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  detectImageMimeType,
  isValidImageMimeType,
  formatFileSize
};