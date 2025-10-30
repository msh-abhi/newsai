// Simple encryption utility for API keys
// In production, use proper encryption libraries

export class EncryptionService {
  private static readonly key = 'ai-newsletter-encryption-key';

  static encrypt(text: string): string {
    // This is a simple Base64 encoding for demo purposes
    // In production, use proper encryption like AES
    return btoa(text);
  }

  static decrypt(encryptedText: string): string {
    try {
      return atob(encryptedText);
    } catch {
      return '';
    }
  }

  static mask(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '••••••••';
    return apiKey.slice(0, 4) + '••••••••••••' + apiKey.slice(-4);
  }
}