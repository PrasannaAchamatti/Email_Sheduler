import { encrypt, decrypt } from '../src/utils/encryption';

describe('AES-256-GCM Security Encryption', () => {
  test('encrypts and decrypts secret credentials accurately', () => {
    const secret = 'super_secret_smtp_password_123!';
    const encrypted = encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:cipher

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  test('handles empty strings gracefully', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });
});

