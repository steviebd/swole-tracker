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

  // Create a new Uint8Array to ensure proper BufferSource typing
  const saltBuffer = new Uint8Array(salt);

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
  const masterKey = process.env["ENCRYPTION_MASTER_KEY"];
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
  // Validate consistency by checking length and basic format (no logging of actual key)
  if (masterKey.length !== masterKey.trim().length) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must not contain leading or trailing whitespace",
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
    // Validate token format before attempting decryption
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Invalid token format: token must be a non-empty string");
    }

    // Check if it looks like base64
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encryptedData)) {
      throw new Error("Invalid token format: token must be base64 encoded");
    }

    console.log("Token decryption: Starting decryption process", {
      tokenLength: encryptedData.length,
      isBase64: true,
    });

    const masterKey = getMasterKey();

    let combined: Uint8Array;
    try {
      combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );
    } catch (decodeError) {
      console.error("Token decryption: Base64 decode failed", {
        error:
          decodeError instanceof Error
            ? decodeError.message
            : "Unknown decode error",
        tokenLength: encryptedData.length,
      });
      throw new Error("Invalid token format: failed to decode base64");
    }

    console.log("Token decryption: Base64 decoded successfully", {
      decodedLength: combined.length,
      expectedMinLength: SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1,
    });

    // Validate minimum length for our format (allow empty plaintext)
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error(
        `Invalid token format: decoded data too short (${combined.length} bytes, minimum ${SALT_LENGTH + IV_LENGTH + TAG_LENGTH} bytes)`,
      );
    }

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = new Uint8Array(
      combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH),
    );
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    console.log("Token decryption: Components extracted", {
      saltLength: salt.length,
      ivLength: iv.length,
      tagLength: tag.length,
      ciphertextLength: ciphertext.length,
    });

    let key: CryptoKey;
    try {
      key = await deriveKey(masterKey, salt);
      console.log("Token decryption: Key derivation successful");
    } catch (keyError) {
      console.error("Token decryption: Key derivation failed", {
        error:
          keyError instanceof Error
            ? keyError.message
            : "Unknown key derivation error",
        saltLength: salt.length,
      });
      throw new Error("Key derivation failed during decryption");
    }

    // Combine ciphertext and tag for decryption
    const encrypted = new Uint8Array([...ciphertext, ...tag]);

    console.log("Token decryption: Attempting decryption", {
      encryptedLength: encrypted.length,
      algorithm: ALGORITHM,
      ivLength: iv.length,
    });

    let decrypted: ArrayBuffer;
    try {
      decrypted = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: iv,
        },
        key,
        encrypted,
      );
      console.log("Token decryption: Decryption successful");
    } catch (decryptError) {
      console.error("Token decryption: Crypto decryption failed", {
        error:
          decryptError instanceof Error
            ? decryptError.message
            : "Unknown decryption error",
        encryptedLength: encrypted.length,
        ivLength: iv.length,
        tagLength: tag.length,
        ciphertextLength: ciphertext.length,
      });
      throw new Error(
        "Cryptographic decryption failed - possible key mismatch or corrupted data",
      );
    }

    const decoder = new TextDecoder();
    const result = decoder.decode(decrypted);

    console.log("Token decryption: Process completed successfully", {
      resultLength: result.length,
    });

    return result;
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
    // Check if it has the expected minimum length for our format (allow empty plaintext)
    return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
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
