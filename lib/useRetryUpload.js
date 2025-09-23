import { useState, useCallback } from 'react';
import { compressImage } from './imageUtils';
import { logger } from './logger';

/**
 * Hook pour gérer les uploads avec retry automatique et compression progressive
 */
export const useRetryUpload = (maxRetries = 3) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Détermine si une erreur est "retryable"
   */
  const isRetryableError = (error, response) => {
    // Erreurs réseau
    if (!response) return true;
    
    // Codes d'erreur retryables
    const retryableCodes = [413, 500, 502, 503, 504, 408, 429];
    return retryableCodes.includes(response.status);
  };

  /**
   * Calcule le délai d'attente avec backoff exponentiel
   */
  const calculateBackoffDelay = (attempt) => {
    return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 secondes
  };

  /**
   * Compresse progressivement l'image selon le nombre de tentatives
   */
  const getCompressionSettings = (attempt, originalFile) => {
    const settings = [
      { quality: 0.8, maxWidth: 1920, maxHeight: 1080 }, // Tentative 1
      { quality: 0.6, maxWidth: 1600, maxHeight: 900 },  // Tentative 2
      { quality: 0.4, maxWidth: 1280, maxHeight: 720 },  // Tentative 3
    ];

    return settings[Math.min(attempt, settings.length - 1)];
  };

  /**
   * Fonction principale d'upload avec retry
   */
  const uploadWithRetry = useCallback(async (file, uploadFunction, userId = 'unknown') => {
    setIsUploading(true);
    setError(null);
    setCurrentAttempt(0);
    setUploadProgress(0);

    let lastError = null;
    let compressedFile = file;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setCurrentAttempt(attempt + 1);
        setUploadProgress(20 + (attempt * 20)); // Progression basique

        logger.info('Tentative upload', { 
          userId, 
          attempt: attempt + 1, 
          maxRetries,
          originalSize: file.size,
          compressedSize: compressedFile.size 
        });

        // Compression progressive selon la tentative
        if (attempt > 0) {
          const compressionSettings = getCompressionSettings(attempt, file);
          setUploadProgress(30 + (attempt * 20));
          
          logger.info('Compression progressive', { 
            userId, 
            attempt: attempt + 1, 
            ...compressionSettings 
          });

          compressedFile = await compressImage(
            file, 
            compressionSettings.maxWidth, 
            compressionSettings.maxHeight, 
            compressionSettings.quality
          );

          logger.info('Image compressée', { 
            userId, 
            attempt: attempt + 1,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(1) + '%'
          });
        }

        setUploadProgress(50 + (attempt * 20));

        // Tentative d'upload
        const result = await uploadFunction(compressedFile);
        
        setUploadProgress(100);
        setIsUploading(false);

        logger.info('Upload réussi', { 
          userId, 
          attempt: attempt + 1,
          finalSize: compressedFile.size,
          success: true 
        });

        return result;

      } catch (err) {
        lastError = err;
        const response = err.response || { status: err.status };

        logger.warn('Échec tentative upload', { 
          userId, 
          attempt: attempt + 1,
          error: err.message,
          status: response.status,
          retryable: isRetryableError(err, response)
        });

        // Si ce n'est pas retryable ou dernière tentative
        if (!isRetryableError(err, response) || attempt === maxRetries - 1) {
          break;
        }

        // Attendre avant la prochaine tentative
        const delay = calculateBackoffDelay(attempt);
        logger.info('Attente avant retry', { userId, attempt: attempt + 1, delay });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Toutes les tentatives ont échoué
    setIsUploading(false);
    setError(lastError);

    logger.error('Échec définitif upload', lastError, { 
      userId, 
      totalAttempts: maxRetries,
      finalError: lastError?.message 
    });

    throw lastError;
  }, [maxRetries]);

  /**
   * Reset l'état du hook
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentAttempt(0);
    setError(null);
  }, []);

  return {
    uploadWithRetry,
    isUploading,
    uploadProgress,
    currentAttempt,
    error,
    reset,
  };
};

/**
 * Utilitaire pour créer une fonction d'upload compatible
 */
export const createUploadFunction = (url, options = {}) => {
  return async (file) => {
    const formData = new FormData();
    formData.append('photos', file);
    
    // Ajouter les autres champs du formulaire
    Object.entries(options.fields || {}).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: options.headers || {},
      body: formData,
    });

    if (!response.ok) {
      const error = new Error(`Upload failed: ${response.statusText}`);
      error.response = response;
      error.status = response.status;
      throw error;
    }

    return response.json();
  };
};