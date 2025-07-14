const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change';

class EncryptionService {
  static encrypt(text) {
    if (!text) return text;
    try {
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return text;
    }
  }

  static decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText;
    }
  }

  static hashSensitiveData(data) {
    return CryptoJS.SHA256(data).toString();
  }
}

module.exports = EncryptionService;