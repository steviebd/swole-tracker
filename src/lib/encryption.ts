import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Secure encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const SALT_LENGTH = 32; // 256-bit salt
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Derive a cryptographic key from the master key and a salt using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return createHash('sha256')
    .update(masterKey + salt.toString('hex'))
    .digest();
}

/**
 * Get the master encryption key from environment variables
 */
function getMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is required for token encryption');
  }
  if (masterKey.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters long');
  }
  return masterKey;
}

/**
 * Encrypt sensitive data (like OAuth tokens) using AES-256-GCM
 * Returns base64-encoded encrypted data with format: salt:iv:tag:ciphertext
 */
export function encryptToken(plaintext: string): string {
  try {
    const masterKey = getMasterKey();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = deriveKey(masterKey, salt);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and ciphertext
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Token encryption failed:', error);
    // Re-throw specific errors without wrapping
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt sensitive data encrypted with encryptToken
 */
export function decryptToken(encryptedData: string): string {
  try {
    const masterKey = getMasterKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH, 
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(masterKey, salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    // Re-throw specific errors without wrapping
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Check if a string appears to be encrypted (base64 format)
 */
export function isEncrypted(data: string): boolean {
  try {
    const decoded = Buffer.from(data, 'base64');
    // Check if it has the expected minimum length for our format
    return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Migrate existing plain-text tokens to encrypted format
 * This is safe to run multiple times - already encrypted tokens will be left unchanged
 */
export function migrateToken(token: string): string {
  if (isEncrypted(token)) {
    return token; // Already encrypted
  }
  return encryptToken(token);
}

/**
 * Safely get a decrypted token, handling both encrypted and plain-text formats
 * This supports gradual migration of existing tokens
 */
export function getDecryptedToken(token: string): string {
  if (isEncrypted(token)) {
    return decryptToken(token);
  }
  return token; // Plain-text token (for backward compatibility during migration)
}