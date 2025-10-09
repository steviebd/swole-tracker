/**
 * Secure encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption with Web Crypto API
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 16; // 128-bit IV
const SALT_LENGTH = 32; // 256-bit salt
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Derive a cryptographic key from the master key and a salt using PBKDF2
 */
async function deriveKey(
  masterKey: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Ensure we pass only the salt view (respecting offset/length) to PBKDF2
  const saltBuffer =
    salt.byteOffset === 0 && salt.byteLength === salt.buffer.byteLength
      ? (salt.buffer as ArrayBuffer)
      : salt.slice().buffer;

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Get the master encryption key from environment variables
 */
function getMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY environment variable is required for token encryption",
    );
  }
  if (masterKey.length < 32) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be at least 32 characters long",
    );
  }
  return masterKey;
}

/**
 * Encrypt sensitive data (like OAuth tokens) using AES-256-GCM
 * Returns base64-encoded encrypted data with format: salt:iv:tag:ciphertext
 */
export async function encryptToken(plaintext: string): Promise<string> {
  try {
    const masterKey = getMasterKey();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(masterKey, salt);

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      plaintextBytes,
    );

    // Extract the auth tag (last 16 bytes)
    const ciphertext = encrypted.slice(0, -TAG_LENGTH);
    const tag = encrypted.slice(-TAG_LENGTH);

    // Combine salt, iv, tag, and ciphertext
    const combined = new Uint8Array([
      ...salt,
      ...iv,
      ...new Uint8Array(tag),
      ...new Uint8Array(ciphertext),
    ]);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...combined));
    return base64;
  } catch (error) {
    console.error("Token encryption failed:", error);
    // Re-throw specific errors without wrapping
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt sensitive data encrypted with encryptToken
 */
export async function decryptToken(encryptedData: string): Promise<string> {
  try {
    const masterKey = getMasterKey();
    const combined = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = await deriveKey(masterKey, salt);

    // Combine ciphertext and tag for decryption
    const encrypted = new Uint8Array([...ciphertext, ...tag]);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Token decryption failed:", error);
    // Re-throw specific errors without wrapping
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Check if a string appears to be encrypted (base64 format)
 */
export function isEncrypted(data: string): boolean {
  try {
    const decoded = Buffer.from(data, "base64");
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
export async function migrateToken(token: string): Promise<string> {
  if (isEncrypted(token)) {
    return token; // Already encrypted
  }
  return encryptToken(token);
}

/**
 * Safely get a decrypted token, handling both encrypted and plain-text formats
 * This supports gradual migration of existing tokens
 */
export async function getDecryptedToken(token: string): Promise<string> {
  if (isEncrypted(token)) {
    return decryptToken(token);
  }
  return token; // Plain-text token (for backward compatibility during migration)
}
