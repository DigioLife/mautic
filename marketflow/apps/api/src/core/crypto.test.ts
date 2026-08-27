import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptJson, decryptJson, sha256Hex } from './crypto';

describe('encryptJson / decryptJson', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('round-trips an object through encrypt then decrypt', () => {
    const original = { apiKey: 'sk_live_abc123', nested: { ok: true, count: 3 } };
    const encrypted = encryptJson(original);

    expect(encrypted).not.toContain('sk_live_abc123');
    expect(decryptJson(encrypted)).toEqual(original);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encryptJson({ value: 'same' });
    const b = encryptJson({ value: 'same' });
    expect(a).not.toBe(b);
  });

  it('rejects a tampered ciphertext instead of silently returning garbage', () => {
    const encrypted = encryptJson({ apiKey: 'secret' });
    const [iv, authTag, data] = encrypted.split(':');
    // Flip a byte in the ciphertext
    const tamperedData = Buffer.from(data, 'base64');
    tamperedData[0] ^= 0xff;
    const tampered = [iv, authTag, tamperedData.toString('base64')].join(':');

    expect(() => decryptJson(tampered)).toThrow();
  });

  it('rejects decryption with the wrong key', () => {
    const encrypted = encryptJson({ apiKey: 'secret' });
    process.env.ENCRYPTION_KEY = 'b'.repeat(32);
    expect(() => decryptJson(encrypted)).toThrow();
  });

  it('throws if ENCRYPTION_KEY is not exactly 32 characters', () => {
    process.env.ENCRYPTION_KEY = 'too-short';
    expect(() => encryptJson({ a: 1 })).toThrow(/32 characters/);
  });
});

describe('sha256Hex', () => {
  it('is deterministic for the same input', () => {
    expect(sha256Hex('refresh-token-value')).toBe(sha256Hex('refresh-token-value'));
  });

  it('differs for different inputs', () => {
    expect(sha256Hex('token-a')).not.toBe(sha256Hex('token-b'));
  });

  it('never returns the plaintext input', () => {
    expect(sha256Hex('my-secret-token')).not.toContain('my-secret-token');
  });
});
