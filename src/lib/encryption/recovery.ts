import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39-web-crypto';
import { createHash, verifyHash } from './hash';
import { encrypt as encryptAES, decrypt as decryptAES } from './aes';
import { logger } from '$lib/logging/logger';

export interface RecoverySetup {
  mnemonic: string;
  recoveryKey: CryptoKey;
  recoveryHash: string;
  recoveryEncryptedPrivateKey: string;
}

export interface RecoveryVerification {
  success: boolean;
  error?: string;
}

export class RecoveryKeyManager {
  
  /**
   * Generate complete recovery setup for new user
   */
  static async generateRecoverySetup(privateKeyPEM: string): Promise<RecoverySetup> {
    try {
      logger.api.debug('Generating BIP39 recovery setup');
      
      // Generate 24-word mnemonic (256-bit entropy)
      const mnemonic = await generateMnemonic(256);
      
      // Derive recovery key from mnemonic
      const seed = await mnemonicToSeed(mnemonic);
      const recoveryKey = await this.deriveKeyFromSeed(seed);
      
      // Create hash for storage and verification (higher bcrypt rounds for recovery)
      const recoveryHash = await createHash(mnemonic, 12);
      
      // Encrypt private key with recovery key
      const recoveryEncryptedPrivateKey = await this.encryptPrivateKeyWithRecovery(
        privateKeyPEM, 
        recoveryKey
      );
      
      logger.api.info('Recovery setup generated successfully');
      
      return {
        mnemonic,
        recoveryKey,
        recoveryHash,
        recoveryEncryptedPrivateKey
      };
    } catch (error) {
      logger.api.error('Failed to generate recovery setup', { error });
      throw new Error('Failed to generate recovery setup');
    }
  }
  
  /**
   * Encrypt private key with recovery key derived from mnemonic
   */
  static async encryptPrivateKeyWithRecovery(
    privateKeyPEM: string, 
    recoveryKey: CryptoKey
  ): Promise<string> {
    try {
      return await encryptAES(recoveryKey, privateKeyPEM);
    } catch (error) {
      logger.api.error('Failed to encrypt private key with recovery key', { error });
      throw new Error('Recovery key encryption failed');
    }
  }
  
  /**
   * Recover private key using BIP39 mnemonic
   */
  static async recoverPrivateKey(
    mnemonic: string,
    recoveryEncryptedKey: string
  ): Promise<string> {
    try {
      logger.api.debug('Attempting private key recovery');
      
      // Validate mnemonic format
      if (!await validateMnemonic(mnemonic)) {
        throw new Error('Invalid recovery phrase format');
      }
      
      // Derive recovery key from mnemonic
      const seed = await mnemonicToSeed(mnemonic);
      const recoveryKey = await this.deriveKeyFromSeed(seed);
      
      // Decrypt private key
      const privateKeyPEM = await decryptAES(recoveryKey, recoveryEncryptedKey);
      
      logger.api.info('Private key recovered successfully');
      return privateKeyPEM;
    } catch (error) {
      logger.api.error('Failed to recover private key', { error });
      throw new Error('Recovery failed: Invalid recovery phrase or corrupted data');
    }
  }
  
  /**
   * Verify recovery phrase against stored hash
   */
  static async verifyRecoveryPhrase(
    mnemonic: string,
    storedHash: string
  ): Promise<RecoveryVerification> {
    try {
      logger.api.debug('Verifying recovery phrase');
      
      // Validate mnemonic format first
      if (!await validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Invalid recovery phrase format'
        };
      }
      
      // Verify against stored hash
      const isValid = await verifyHash(mnemonic, storedHash);
      
      if (isValid) {
        logger.api.info('Recovery phrase verified successfully');
        return { success: true };
      } else {
        logger.api.warn('Recovery phrase verification failed');
        return {
          success: false,
          error: 'Recovery phrase does not match'
        };
      }
    } catch (error) {
      logger.api.error('Recovery phrase verification error', { error });
      return {
        success: false,
        error: 'Verification failed due to system error'
      };
    }
  }
  
  /**
   * Validate mnemonic phrase format and checksum
   */
  static async validateMnemonicFormat(mnemonic: string): Promise<boolean> {
    try {
      return await validateMnemonic(mnemonic.trim());
    } catch (error) {
      logger.api.debug('Mnemonic validation failed', { error });
      return false;
    }
  }
  
  /**
   * Split mnemonic into word array for UI display
   */
  static parseMnemonicWords(mnemonic: string): string[] {
    return mnemonic.trim().split(/\s+/).filter(word => word.length > 0);
  }
  
  /**
   * Generate random word indices for verification
   */
  static generateVerificationIndices(totalWords: number = 24, count: number = 4): number[] {
    const indices: number[] = [];
    while (indices.length < count) {
      const randomIndex = Math.floor(Math.random() * totalWords);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    return indices.sort((a, b) => a - b);
  }
  
  /**
   * Verify user-entered words against original mnemonic
   */
  static verifyMnemonicWords(
    originalMnemonic: string,
    verificationIndices: number[],
    userWords: string[]
  ): boolean {
    const originalWords = this.parseMnemonicWords(originalMnemonic);
    
    if (verificationIndices.length !== userWords.length) {
      return false;
    }
    
    for (let i = 0; i < verificationIndices.length; i++) {
      const expectedWord = originalWords[verificationIndices[i]];
      const userWord = userWords[i].trim().toLowerCase();
      
      if (expectedWord.toLowerCase() !== userWord) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Derive AES key from BIP39 seed
   */
  private static async deriveKeyFromSeed(seed: Uint8Array): Promise<CryptoKey> {
    // Use first 32 bytes of seed as key material for AES-256
    const keyMaterial = seed.slice(0, 32);
    
    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );
  }
}

/**
 * Recovery attempt logging for audit trail
 */
export interface RecoveryAttempt {
  userId: string;
  attemptType: 'mnemonic_verification' | 'key_recovery' | 'passphrase_reset';
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logRecoveryAttempt(attempt: RecoveryAttempt): Promise<void> {
  try {
    const response = await fetch('/v1/security/recovery-attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: attempt.userId,
        attempt_type: attempt.attemptType,
        success: attempt.success,
        error_message: attempt.errorMessage,
        ip_address: attempt.ipAddress,
        user_agent: attempt.userAgent
      })
    });
    
    if (!response.ok) {
      logger.api.warn('Failed to log recovery attempt', { 
        status: response.status,
        attempt: attempt.attemptType 
      });
    }
  } catch (error) {
    logger.api.error('Error logging recovery attempt', { error });
  }
}

/**
 * Check if user has recovery key set up
 */
export async function userHasRecoveryKey(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/v1/security/recovery-status/${userId}`);
    if (!response.ok) {
      return false;
    }
    const { hasRecoveryKey } = await response.json();
    return hasRecoveryKey;
  } catch (error) {
    logger.api.error('Error checking recovery key status', { error });
    return false;
  }
}

/**
 * Recovery constants
 */
export const RECOVERY_CONSTANTS = {
  MNEMONIC_WORD_COUNT: 24,
  VERIFICATION_WORD_COUNT: 4,
  ENTROPY_BITS: 256,
  BCRYPT_ROUNDS: 12,
  MIN_PASSPHRASE_LENGTH: 8
} as const;

export default RecoveryKeyManager;