import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM at-rest encryption for sensitive JSON blobs (provider API keys,
// OAuth tokens, etc.) stored in columns like Integration.config. ENCRYPTION_KEY
// must be exactly 32 bytes — validated at boot by core/env.ts.
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be set and exactly 32 characters long');
  }
  return Buffer.from(key, 'utf8');
}

/**
 * Encrypts a plain object into a single opaque string: iv:authTag:ciphertext (base64 each).
 * Use for any column holding provider credentials before writing to the database.
 */
export function encryptJson(data: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Reverses encryptJson. Throws if the payload was tampered with or the key is wrong.
 */
export function decryptJson<T = unknown>(payload: string): T {
  const [ivB64, authTagB64, dataB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Malformed encrypted payload');
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}
