// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-for-testing-purposes';

const encryptionService = require('../services/encryptionService');

describe('Encryption Service Tests', () => {
  test('should encrypt and decrypt text correctly', () => {
    const originalText = 'This is a secret message 💕';
    const encrypted = encryptionService.encrypt(originalText);
    const decrypted = encryptionService.decrypt(encrypted);

    expect(encrypted).not.toBe(originalText);
    expect(decrypted).toBe(originalText);
    expect(encrypted).toContain(':'); // Should contain IV and auth tag separators
  });

  test('should handle empty and null values gracefully', () => {
    expect(encryptionService.encrypt('')).toBe('');
    expect(encryptionService.encrypt(null)).toBe(null);
    expect(encryptionService.decrypt('')).toBe('');
    expect(encryptionService.decrypt(null)).toBe(null);
  });

  test('should fail to decrypt tampered data', () => {
    const originalText = 'Secret message';
    const encrypted = encryptionService.encrypt(originalText);
    const tamperedEncrypted = encrypted.replace(/.$/, 'x'); // Change last character

    expect(() => {
      encryptionService.decrypt(tamperedEncrypted);
    }).toThrow();
  });

  test('should hash passwords securely', async () => {
    const password = 'TestPassword123!';
    const hashedPassword = await encryptionService.hashPassword(password);

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword.length).toBeGreaterThan(50);
    expect(await encryptionService.verifyPassword(password, hashedPassword)).toBe(true);
    expect(await encryptionService.verifyPassword('wrongpassword', hashedPassword)).toBe(false);
  });

  test('should generate secure tokens', () => {
    const token1 = encryptionService.generateSecureToken();
    const token2 = encryptionService.generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
  });

  test('should encrypt and decrypt files', () => {
    const originalData = Buffer.from('This is test file content with special chars: 🔒💕');
    const encrypted = encryptionService.encryptFile(originalData);
    const decrypted = encryptionService.decryptFile(encrypted);

    expect(encrypted).not.toEqual(originalData);
    expect(decrypted).toEqual(originalData);
  });

  test('should create and verify HMAC signatures', () => {
    const data = 'important data to sign';
    const signature = encryptionService.createHmacSignature(data);
    
    expect(encryptionService.verifyHmacSignature(data, signature)).toBe(true);
    expect(encryptionService.verifyHmacSignature('tampered data', signature)).toBe(false);
  });

  test('should generate API keys with proper format', () => {
    const apiKey = encryptionService.generateApiKey();
    
    expect(apiKey).toMatch(/^cc_[a-z0-9]+_[a-f0-9]+$/);
    expect(apiKey.length).toBeGreaterThan(20);
  });

  test('should hash sensitive data with salt', () => {
    const data = 'sensitive information';
    const result = encryptionService.hashSensitiveData(data);
    
    expect(result.hash).toBeDefined();
    expect(result.salt).toBeDefined();
    expect(result.hash).not.toBe(data);
    expect(result.salt.length).toBe(64); // 32 bytes = 64 hex chars
    
    // Verify the hash
    expect(encryptionService.verifyHash(data, result.hash, result.salt)).toBe(true);
    expect(encryptionService.verifyHash('wrong data', result.hash, result.salt)).toBe(false);
  });
});