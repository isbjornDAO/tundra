/**
 * Security utilities for input sanitization and validation
 * Prevents NoSQL injection and other security vulnerabilities
 */

import { ObjectId } from 'mongodb';

/**
 * MongoDB operators that should be filtered from user input
 */
const MONGODB_OPERATORS = [
  '$where', '$regex', '$options', '$expr', '$jsonSchema',
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$and', '$or', '$not', '$nor', '$exists', '$type', '$mod',
  '$all', '$elemMatch', '$size', '$bitsAllClear', '$bitsAllSet',
  '$bitsAnyClear', '$bitsAnySet', '$geoIntersects', '$geoWithin',
  '$near', '$nearSphere', '$text', '$comment', '$meta'
];

/**
 * Recursively sanitize an object by removing MongoDB operators
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip MongoDB operators
      if (MONGODB_OPERATORS.includes(key)) {
        console.warn(`Blocked potential NoSQL injection attempt: ${key}`);
        continue;
      }
      
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize user input to prevent NoSQL injection
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove null bytes and trim whitespace
    return input.replace(/\0/g, '').trim();
  }
  
  if (typeof input === 'object') {
    return sanitizeObject(input);
  }
  
  return input;
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function validateObjectId(id: string): { isValid: boolean; objectId?: ObjectId; error?: string } {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID must be a non-empty string' };
  }
  
  // Sanitize the input first
  const sanitizedId = sanitizeInput(id);
  
  if (!ObjectId.isValid(sanitizedId)) {
    return { isValid: false, error: 'Invalid ObjectId format' };
  }
  
  try {
    const objectId = new ObjectId(sanitizedId);
    return { isValid: true, objectId };
  } catch (error) {
    return { isValid: false, error: 'Failed to create ObjectId' };
  }
}

/**
 * Escape special characters in regex patterns
 */
export function escapeRegex(string: string): string {
  if (typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and sanitize wallet address
 */
export function validateWalletAddress(address: string): { isValid: boolean; address?: string; error?: string } {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Wallet address must be a non-empty string' };
  }
  
  const sanitized = sanitizeInput(address).toLowerCase();
  
  // Basic validation for Ethereum addresses (0x followed by 40 hex characters)
  if (!/^0x[a-fA-F0-9]{40}$/.test(sanitized)) {
    return { isValid: false, error: 'Invalid wallet address format' };
  }
  
  return { isValid: true, address: sanitized };
}

/**
 * Validate game name against allowed values
 */
const ALLOWED_GAMES = ['CS2', 'Valorant', 'League of Legends', 'Dota 2', 'Rocket League', 'Fortnite'];

export function validateGame(game: string): { isValid: boolean; game?: string; error?: string } {
  if (!game || typeof game !== 'string') {
    return { isValid: false, error: 'Game must be specified' };
  }
  
  const sanitized = sanitizeInput(game);
  
  if (!ALLOWED_GAMES.includes(sanitized)) {
    return { isValid: false, error: 'Invalid game type' };
  }
  
  return { isValid: true, game: sanitized };
}

/**
 * Validate tournament/clan status against allowed values
 */
const ALLOWED_STATUSES = ['pending', 'active', 'full', 'completed', 'cancelled', 'rejected'];

export function validateStatus(status: string): { isValid: boolean; status?: string; error?: string } {
  if (!status || typeof status !== 'string') {
    return { isValid: false, error: 'Status must be specified' };
  }
  
  const sanitized = sanitizeInput(status);
  
  if (!ALLOWED_STATUSES.includes(sanitized)) {
    return { isValid: false, error: 'Invalid status value' };
  }
  
  return { isValid: true, status: sanitized };
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function validateCountryCode(country: string): { isValid: boolean; country?: string; error?: string } {
  if (!country || typeof country !== 'string') {
    return { isValid: false, error: 'Country code must be specified' };
  }
  
  const sanitized = sanitizeInput(country).toUpperCase();
  
  // Basic validation for 2-letter country codes
  if (!/^[A-Z]{2}$/.test(sanitized)) {
    return { isValid: false, error: 'Invalid country code format (must be 2 letters)' };
  }
  
  return { isValid: true, country: sanitized };
}

/**
 * Sanitize and validate username
 */
export function validateUsername(username: string): { isValid: boolean; username?: string; error?: string } {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username must be specified' };
  }
  
  const sanitized = sanitizeInput(username).trim();
  
  // Username validation: 3-20 characters, alphanumeric + underscore/dash
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(sanitized)) {
    return { 
      isValid: false, 
      error: 'Username must be 3-20 characters and contain only letters, numbers, underscore, or dash' 
    };
  }
  
  return { isValid: true, username: sanitized };
}

/**
 * Create a safe MongoDB query filter by sanitizing all inputs
 */
export function createSafeQuery(filter: Record<string, any>): Record<string, any> {
  const safeFilter: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(filter)) {
    // Skip if key is a MongoDB operator
    if (MONGODB_OPERATORS.includes(key)) {
      console.warn(`Blocked MongoDB operator in query filter: ${key}`);
      continue;
    }
    
    // Sanitize the value
    safeFilter[key] = sanitizeInput(value);
  }
  
  return safeFilter;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: string, limit?: string): { 
  page: number; 
  limit: number; 
  skip: number; 
} {
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '10', 10) || 10)); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, skip };
}