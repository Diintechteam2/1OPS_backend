const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Derive a 32-byte key from env variable or use a robust fallback
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || '1ops_default_secret_encryption_key_2026_32_bytes';
  // If the secret is not 32 bytes, hash it to get a consistent 32-byte buffer
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypt a text string
 * @param {string} text - Plain text
 * @returns {string} - Encrypted string in format ivHex:encryptedHex
 */
const encrypt = (text) => {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt an encrypted string
 * @param {string} encryptedText - Encrypted string in format ivHex:encryptedHex
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '';
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return '';
  }
};

module.exports = {
  encrypt,
  decrypt,
};
