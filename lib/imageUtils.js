/**
 * Utilitaires pour la compression et manipulation d'images
 */

/**
 * Compresse une image en utilisant Canvas API
 * @param {File} file - Fichier image à compresser
 * @param {number} maxWidth - Largeur maximale (défaut: 1920)
 * @param {number} maxHeight - Hauteur maximale (défaut: 1080)
 * @param {number} quality - Qualité de compression 0-1 (défaut: 0.8)
 * @returns {Promise<File>} - Fichier compressé
 */
export const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculer les nouvelles dimensions en gardant le ratio
      const { width: newWidth, height: newHeight } = calculateDimensions(
        img.width, 
        img.height, 
        maxWidth, 
        maxHeight
      );

      // Configurer le canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convertir en blob avec compression
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erreur lors de la compression'));
            return;
          }

          // Créer un nouveau fichier avec le blob compressé
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg', // Force JPEG pour une meilleure compression
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calcule les dimensions optimales en gardant le ratio
 */
const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Redimensionner si nécessaire
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Valide la taille d'un fichier
 * @param {File} file - Fichier à valider
 * @param {number} maxSizeBytes - Taille maximale en bytes (défaut: 5MB)
 * @returns {boolean} - True si valide
 */
export const validateImageSize = (file, maxSizeBytes = 5 * 1024 * 1024) => {
  return file.size <= maxSizeBytes;
};

/**
 * Obtient les dimensions d'une image
 * @param {File} file - Fichier image
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Impossible de lire les dimensions'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Formate la taille d'un fichier en format lisible
 * @param {number} bytes - Taille en bytes
 * @returns {string} - Taille formatée (ex: "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Vérifie si un fichier est une image valide
 * @param {File} file - Fichier à vérifier
 * @returns {boolean}
 */
export const isValidImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Crée une prévisualisation d'image
 * @param {File} file - Fichier image
 * @returns {Promise<string>} - URL de prévisualisation
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error('Type de fichier non supporté'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(file);
  });
};