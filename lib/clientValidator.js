// lib/clientValidator.js
// Validation côté client pour feedback immédiat

import { useState, useEffect } from 'react';
import { logger } from './logger';

/**
 * Validateur d'images côté client
 */
export class ImageValidator {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxTotalSize = 50 * 1024 * 1024; // 50MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    this.minFileSize = 1024; // 1KB
    this.maxDimensions = { width: 8000, height: 8000 };
    this.minDimensions = { width: 50, height: 50 };
  }

  /**
   * Valider un fichier image
   */
  async validateFile(file) {
    const errors = [];
    const warnings = [];

    try {
      // Validation de base
      if (!file) {
        errors.push('Aucun fichier sélectionné');
        return { valid: false, errors, warnings };
      }

      // Vérifier le type MIME
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`Type de fichier non supporté: ${file.type}. Types autorisés: JPG, PNG, WebP`);
      }

      // Vérifier l'extension
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!this.allowedExtensions.includes(extension)) {
        errors.push(`Extension non autorisée: ${extension}. Extensions autorisées: .jpg, .jpeg, .png, .webp`);
      }

      // Vérifier la taille du fichier
      if (file.size < this.minFileSize) {
        errors.push('Fichier trop petit ou corrompu (minimum 1KB)');
      }

      if (file.size > this.maxFileSize) {
        errors.push(`Fichier trop volumineux: ${this.formatFileSize(file.size)}. Maximum: ${this.formatFileSize(this.maxFileSize)}`);
      } else if (file.size > 5 * 1024 * 1024) { // 5MB
        warnings.push(`Fichier volumineux: ${this.formatFileSize(file.size)}. Il sera compressé automatiquement.`);
      }

      // Vérifier le nom du fichier
      if (file.name.length > 255) {
        errors.push('Nom de fichier trop long (maximum 255 caractères)');
      }

      // Caractères dangereux dans le nom
      if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
        errors.push('Le nom de fichier contient des caractères non autorisés');
      }

      // Validation des dimensions (si possible)
      try {
        const dimensions = await this.getImageDimensions(file);
        
        if (dimensions.width < this.minDimensions.width || dimensions.height < this.minDimensions.height) {
          errors.push(`Image trop petite: ${dimensions.width}x${dimensions.height}. Minimum: ${this.minDimensions.width}x${this.minDimensions.height}`);
        }

        if (dimensions.width > this.maxDimensions.width || dimensions.height > this.maxDimensions.height) {
          warnings.push(`Image très grande: ${dimensions.width}x${dimensions.height}. Elle sera redimensionnée automatiquement.`);
        }

        // Ajouter les dimensions aux métadonnées
        return {
          valid: errors.length === 0,
          errors,
          warnings,
          metadata: {
            size: file.size,
            formattedSize: this.formatFileSize(file.size),
            dimensions,
            type: file.type,
            name: file.name
          }
        };
      } catch (dimensionError) {
        warnings.push('Impossible de lire les dimensions de l\'image');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          size: file.size,
          formattedSize: this.formatFileSize(file.size),
          type: file.type,
          name: file.name
        }
      };

    } catch (error) {
      logger.error('Erreur validation fichier', error);
      errors.push('Erreur lors de la validation du fichier');
      
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Valider plusieurs fichiers
   */
  async validateFiles(files) {
    if (!files || files.length === 0) {
      return {
        valid: false,
        errors: ['Aucun fichier sélectionné'],
        warnings: [],
        results: []
      };
    }

    const results = [];
    const globalErrors = [];
    const globalWarnings = [];
    let totalSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.validateFile(file);
      
      results.push({
        index: i,
        file,
        ...result
      });

      totalSize += file.size;
    }

    // Vérifier la taille totale
    if (totalSize > this.maxTotalSize) {
      globalErrors.push(`Taille totale trop importante: ${this.formatFileSize(totalSize)}. Maximum: ${this.formatFileSize(this.maxTotalSize)}`);
    }

    // Vérifier le nombre de fichiers
    if (files.length > 10) {
      globalErrors.push(`Trop de fichiers: ${files.length}. Maximum: 10 fichiers`);
    }

    const allValid = results.every(r => r.valid) && globalErrors.length === 0;

    return {
      valid: allValid,
      errors: globalErrors,
      warnings: globalWarnings,
      results,
      totalSize,
      formattedTotalSize: this.formatFileSize(totalSize)
    };
  }

  /**
   * Obtenir les dimensions d'une image
   */
  getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Impossible de lire les dimensions'));
      };
      
      img.src = objectUrl;
    });
  }

  /**
   * Formater la taille de fichier
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

/**
 * Validateur de formulaire
 */
export class FormValidator {
  /**
   * Valider une zone
   */
  validateZone(zone) {
    const errors = [];
    
    if (!zone || typeof zone !== 'string') {
      errors.push('Zone requise');
      return { valid: false, errors };
    }

    const trimmed = zone.trim();
    
    if (trimmed.length < 2) {
      errors.push('Zone trop courte (minimum 2 caractères)');
    }
    
    if (trimmed.length > 50) {
      errors.push('Zone trop longue (maximum 50 caractères)');
    }
    
    if (!/^[a-zA-Z0-9\s.-]+$/.test(trimmed)) {
      errors.push('Zone contient des caractères non autorisés');
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: trimmed
    };
  }

  /**
   * Valider un commentaire
   */
  validateComment(comment) {
    const errors = [];
    const warnings = [];
    
    if (!comment) {
      return { valid: true, errors, warnings, sanitized: '' };
    }

    if (typeof comment !== 'string') {
      errors.push('Commentaire invalide');
      return { valid: false, errors, warnings };
    }

    const trimmed = comment.trim();
    
    if (trimmed.length > 500) {
      errors.push('Commentaire trop long (maximum 500 caractères)');
    }
    
    if (trimmed.length > 300) {
      warnings.push('Commentaire très long, considérez le raccourcir');
    }

    // Vérifier les caractères dangereux
    if (/<script|javascript:|on\w+=/i.test(trimmed)) {
      errors.push('Commentaire contient du contenu non autorisé');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized: trimmed
    };
  }

  /**
   * Valider un formulaire d'inventaire complet
   */
  async validateInventoryForm(data) {
    const { files, zone, comment } = data;
    
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      fields: {}
    };

    // Valider les fichiers
    const imageValidator = new ImageValidator();
    const fileValidation = await imageValidator.validateFiles(files);
    results.fields.files = fileValidation;
    
    if (!fileValidation.valid) {
      results.valid = false;
      results.errors.push(...fileValidation.errors);
    }
    results.warnings.push(...fileValidation.warnings);

    // Valider la zone
    const zoneValidation = this.validateZone(zone);
    results.fields.zone = zoneValidation;
    
    if (!zoneValidation.valid) {
      results.valid = false;
      results.errors.push(...zoneValidation.errors);
    }

    // Valider le commentaire
    const commentValidation = this.validateComment(comment);
    results.fields.comment = commentValidation;
    
    if (!commentValidation.valid) {
      results.valid = false;
      results.errors.push(...commentValidation.errors);
    }
    results.warnings.push(...commentValidation.warnings);

    return results;
  }
}

// Instances globales
export const imageValidator = new ImageValidator();
export const formValidator = new FormValidator();

/**
 * Hook React pour la validation en temps réel
 */
export function useFormValidation() {
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = async (fieldName, value) => {
    setIsValidating(true);
    
    try {
      let result;
      
      switch (fieldName) {
        case 'files':
          result = await imageValidator.validateFiles(value);
          break;
        case 'zone':
          result = formValidator.validateZone(value);
          break;
        case 'comment':
          result = formValidator.validateComment(value);
          break;
        default:
          result = { valid: true, errors: [], warnings: [] };
      }

      setValidationResults(prev => ({
        ...prev,
        [fieldName]: result
      }));

      return result;
    } catch (error) {
      logger.error('Erreur validation champ', error);
      const errorResult = { valid: false, errors: ['Erreur de validation'], warnings: [] };
      
      setValidationResults(prev => ({
        ...prev,
        [fieldName]: errorResult
      }));
      
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = async (formData) => {
    setIsValidating(true);
    
    try {
      const result = await formValidator.validateInventoryForm(formData);
      setValidationResults(result.fields);
      return result;
    } catch (error) {
      logger.error('Erreur validation formulaire', error);
      return { valid: false, errors: ['Erreur de validation'], warnings: [] };
    } finally {
      setIsValidating(false);
    }
  };

  const clearValidation = (fieldName) => {
    if (fieldName) {
      setValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[fieldName];
        return newResults;
      });
    } else {
      setValidationResults({});
    }
  };

  return {
    validationResults,
    isValidating,
    validateField,
    validateForm,
    clearValidation
  };
}

export default {
  ImageValidator,
  FormValidator,
  imageValidator,
  formValidator,
  useFormValidation
};