// lib/securityValidator.js
// Validateurs de sécurité et sanitisation des données

import { logger } from './logger';

/**
 * Validateur d'email avec protection contre les attaques
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requis' };
  }

  // Longueur raisonnable
  if (email.length > 254) {
    return { valid: false, error: 'Email trop long' };
  }

  // Pattern de base sécurisé
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Format email invalide' };
  }

  // Vérifications de sécurité supplémentaires
  const [localPart, domain] = email.split('@');
  
  // Local part ne doit pas être vide
  if (!localPart || localPart.length === 0) {
    return { valid: false, error: 'Partie locale email vide' };
  }

  // Domaine ne doit pas être vide
  if (!domain || domain.length === 0) {
    return { valid: false, error: 'Domaine email vide' };
  }

  // Pas de caractères dangereux
  const dangerousChars = /[<>\"'&]/;
  if (dangerousChars.test(email)) {
    return { valid: false, error: 'Caractères non autorisés dans email' };
  }

  return { valid: true, sanitized: email.toLowerCase().trim() };
}

/**
 * Validateur de mot de passe avec critères de sécurité
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Mot de passe requis' };
  }

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon: !isCommonPassword(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  if (score < 4) {
    return { 
      valid: false, 
      error: 'Mot de passe trop faible',
      checks,
      score
    };
  }

  // Vérifications de sécurité
  if (password.length > 128) {
    return { valid: false, error: 'Mot de passe trop long' };
  }

  return { 
    valid: true, 
    strength: getPasswordStrength(score),
    checks,
    score
  };
}

/**
 * Liste des mots de passe communs à éviter
 */
function isCommonPassword(password) {
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'shadow', 'azerty', 'motdepasse'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Évaluation de la force du mot de passe
 */
function getPasswordStrength(score) {
  if (score <= 2) return 'Très faible';
  if (score === 3) return 'Faible';
  if (score === 4) return 'Moyen';
  if (score === 5) return 'Fort';
  return 'Très fort';
}

/**
 * Sanitisation des chaînes de caractères
 */
export function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 1000,
    allowHtml = false,
    allowSpecialChars = true,
    trim = true
  } = options;

  let sanitized = input;

  // Trim si demandé
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Limiter la longueur
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Échapper HTML si pas autorisé
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Supprimer caractères spéciaux si pas autorisés
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s.-]/g, '');
  }

  // Supprimer caractères de contrôle
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validateur de nom de zone
 */
export function validateZoneName(zoneName) {
  if (!zoneName || typeof zoneName !== 'string') {
    return { valid: false, error: 'Nom de zone requis' };
  }

  const sanitized = sanitizeString(zoneName, { 
    maxLength: 50, 
    allowHtml: false,
    allowSpecialChars: false 
  });

  if (sanitized.length < 2) {
    return { valid: false, error: 'Nom de zone trop court (min 2 caractères)' };
  }

  if (sanitized.length > 50) {
    return { valid: false, error: 'Nom de zone trop long (max 50 caractères)' };
  }

  // Vérifier caractères autorisés
  if (!/^[a-zA-Z0-9\s.-]+$/.test(sanitized)) {
    return { valid: false, error: 'Caractères non autorisés dans le nom de zone' };
  }

  return { valid: true, sanitized };
}

/**
 * Validateur de nom complet
 */
export function validateFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'Nom complet requis' };
  }

  const sanitized = sanitizeString(fullName, { 
    maxLength: 100, 
    allowHtml: false,
    allowSpecialChars: false 
  });

  if (sanitized.length < 2) {
    return { valid: false, error: 'Nom trop court (min 2 caractères)' };
  }

  if (sanitized.length > 100) {
    return { valid: false, error: 'Nom trop long (max 100 caractères)' };
  }

  // Vérifier format nom (lettres, espaces, tirets, apostrophes)
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(sanitized)) {
    return { valid: false, error: 'Caractères non autorisés dans le nom' };
  }

  return { valid: true, sanitized };
}

/**
 * Validateur de commentaire
 */
export function validateComment(comment) {
  if (!comment) {
    return { valid: true, sanitized: '' };
  }

  if (typeof comment !== 'string') {
    return { valid: false, error: 'Commentaire invalide' };
  }

  const sanitized = sanitizeString(comment, { 
    maxLength: 500, 
    allowHtml: false,
    allowSpecialChars: true 
  });

  if (sanitized.length > 500) {
    return { valid: false, error: 'Commentaire trop long (max 500 caractères)' };
  }

  return { valid: true, sanitized };
}

/**
 * Validateur de token d'authentification
 */
export function validateAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token manquant' };
  }

  // Longueur minimale pour un JWT
  if (token.length < 20) {
    return { valid: false, error: 'Token trop court' };
  }

  // Longueur maximale raisonnable
  if (token.length > 2000) {
    return { valid: false, error: 'Token trop long' };
  }

  // Vérifier format de base (caractères autorisés pour JWT)
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    return { valid: false, error: 'Format token invalide' };
  }

  return { valid: true };
}

/**
 * Validateur de fichier image
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Fichier requis' };
  }

  // Vérifier que c'est bien un objet File
  if (!(file instanceof File)) {
    return { valid: false, error: 'Type de fichier invalide' };
  }

  // Types MIME autorisés
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Type de fichier non autorisé' };
  }

  // Extensions autorisées
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Extension de fichier non autorisée' };
  }

  // Taille minimale (éviter fichiers vides/corrompus)
  if (file.size < 1024) { // 1KB
    return { valid: false, error: 'Fichier trop petit ou corrompu' };
  }

  // Taille maximale
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Fichier trop volumineux (max 50MB)' };
  }

  // Vérifier nom de fichier
  if (file.name.length > 255) {
    return { valid: false, error: 'Nom de fichier trop long' };
  }

  // Caractères dangereux dans le nom
  if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    return { valid: false, error: 'Caractères non autorisés dans le nom de fichier' };
  }

  return { valid: true };
}

/**
 * Détecteur d'attaques par injection
 */
export function detectInjectionAttempt(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const injectionPatterns = [
    // SQL Injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/)/,
    
    // XSS
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    
    // Command Injection
    /(\||&|;|\$\(|\`)/,
    /(rm\s|cat\s|ls\s|pwd|whoami)/i,
    
    // Path Traversal
    /\.\.\//,
    /\.\.\\/,
    
    // LDAP Injection
    /(\(|\)|&|\|)/
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Validateur de requête API avec protection
 */
export function validateApiRequest(req, expectedFields = []) {
  const errors = [];
  const warnings = [];

  // Vérifier méthode HTTP
  if (!req.method) {
    errors.push('Méthode HTTP manquante');
  }

  // Vérifier Content-Type pour POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType) {
      warnings.push('Content-Type manquant');
    }
  }

  // Vérifier User-Agent (détection de bots basiques)
  const userAgent = req.headers['user-agent'];
  if (!userAgent || userAgent.length < 10) {
    warnings.push('User-Agent suspect');
  }

  // Vérifier taille de la requête
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 100 * 1024 * 1024) { // 100MB
    errors.push('Requête trop volumineuse');
  }

  // Vérifier champs attendus
  if (req.body && expectedFields.length > 0) {
    const missingFields = expectedFields.filter(field => !(field in req.body));
    if (missingFields.length > 0) {
      errors.push(`Champs manquants: ${missingFields.join(', ')}`);
    }
  }

  // Détecter tentatives d'injection dans les paramètres
  const allParams = { ...req.query, ...req.body };
  for (const [key, value] of Object.entries(allParams)) {
    if (typeof value === 'string' && detectInjectionAttempt(value)) {
      errors.push(`Tentative d'injection détectée dans ${key}`);
      logger.warn('Tentative d\'injection détectée', { 
        key, 
        value: value.substring(0, 100),
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent 
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Rate limiter simple en mémoire
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Nettoyage périodique
    setInterval(() => {
      this.cleanup();
    }, windowMs);
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    
    // Supprimer les requêtes anciennes
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(identifier, validRequests);
    
    // Vérifier la limite
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Ajouter la requête actuelle
    validRequests.push(now);
    return true;
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  getStats() {
    return {
      activeUsers: this.requests.size,
      totalRequests: Array.from(this.requests.values()).reduce((sum, reqs) => sum + reqs.length, 0)
    };
  }
}

// Instance globale du rate limiter
export const rateLimiter = new RateLimiter(60000, 100); // 100 requêtes par minute

export default {
  validateEmail,
  validatePassword,
  sanitizeString,
  validateZoneName,
  validateFullName,
  validateComment,
  validateAuthToken,
  validateImageFile,
  detectInjectionAttempt,
  validateApiRequest,
  RateLimiter,
  rateLimiter
};