import { encrypt, decrypt, encryptField, decryptField } from './crypto';

const KEY = 'a'.repeat(64); // 32-byte key as 64 hex chars

describe('encrypt / decrypt', () => {
  it('roundtrips a plaintext string', () => {
    const text = 'hello, world';
    expect(decrypt(encrypt(text, KEY), KEY)).toBe(text);
  });

  it('produces different blobs on each call (IV randomization)', () => {
    const text = 'same text';
    expect(encrypt(text, KEY)).not.toBe(encrypt(text, KEY));
  });

  it('throws when ciphertext is tampered', () => {
    const blob = encrypt('secret', KEY);
    const parts = blob.split(':');
    parts[2] = parts[2].replace(/.$/, parts[2].slice(-1) === '0' ? '1' : '0');
    expect(() => decrypt(parts.join(':'), KEY)).toThrow();
  });
});

describe('encryptField', () => {
  it('returns null for null input', () => {
    expect(encryptField(null, KEY)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(encryptField('', KEY)).toBeNull();
  });

  it('returns encrypted blob for non-empty string', () => {
    const blob = encryptField('value', KEY);
    expect(blob).not.toBeNull();
    expect(blob!.split(':').length).toBe(3);
  });
});

describe('decryptField', () => {
  it('returns null for null input', () => {
    expect(decryptField(null, KEY)).toBeNull();
  });

  it('roundtrips through encryptField', () => {
    const value = 'Bangkok';
    const blob = encryptField(value, KEY)!;
    expect(decryptField(blob, KEY)).toBe(value);
  });

  it('returns null when decryption fails (wrong key)', () => {
    const blob = encrypt('secret', KEY);
    const wrongKey = 'b'.repeat(64);
    expect(decryptField(blob, wrongKey)).toBeNull();
  });
});
