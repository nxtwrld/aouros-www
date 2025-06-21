# Data and Privacy Architecture

## Overview

Aouros implements a **zero-knowledge encryption architecture** designed to ensure that the backend server cannot decrypt sensitive medical documents and health data. The system uses a multi-layered encryption approach combining AES symmetric encryption for documents and RSA asymmetric encryption for secure key distribution.

## Current Implementation (Updated December 2024)

### Document Encryption Flow

1. **Document Creation** (`src/lib/documents/index.ts:248`)
   - Generate unique AES-256-GCM key for each document
   - Encrypt document content and metadata using AES key
   - Encrypt AES key with user's RSA public key
   - Store encrypted document and encrypted key separately

2. **Document Storage Structure**
   - **Supabase Database**: Stores encrypted document metadata and content
   - **Supabase Storage**: Stores encrypted file attachments
   - **Key Storage**: Each document's AES key is encrypted per user who has access

3. **Multi-User Access** (`src/lib/documents/index.ts:290`)
   - Document creator's AES key encrypted with their RSA public key
   - For shared documents, AES key additionally encrypted with recipient's RSA public key
   - Each user maintains their own encrypted copy of the document key

### User Key Management

#### RSA Key Pair Generation (`src/lib/encryption/rsa.ts:113`)
- **Algorithm**: RSA-OAEP with 2048-bit modulus
- **Hash Function**: SHA-256
- **Key Storage**:
  - Public key: Stored unencrypted in user profile
  - Private key: Encrypted with user's master passphrase using PBKDF2

#### Master Passphrase System (`src/components/onboarding/Privacy.svelte`)
- **Generation**: Cryptographically secure random passphrase (10 characters)
- **Key Derivation**: PBKDF2 with 100,000 iterations, SHA-256, 16-byte salt
- **Private Key Protection**: Private RSA key encrypted using passphrase-derived AES key
- **Password Manager Integration**: Optional browser credential storage

#### BIP39 Recovery System (`src/lib/encryption/recovery.ts`)
- **Mnemonic Generation**: 24-word BIP39 phrases with 256-bit entropy
- **Library**: `bip39-web-crypto` for zero-dependency implementation
- **Key Derivation**: PBKDF2 from mnemonic seed to recovery key
- **Dual Encryption**: Private key encrypted with both passphrase and recovery key
- **Mandatory Setup**: Users must complete recovery setup during onboarding
- **Recovery Interface**: Complete account recovery flow via `/recover` page

#### Passphrase Verification (`src/lib/encryption/hash.ts`)
- **Hash Algorithm**: bcrypt with 10 salt rounds
- **Storage**: Hash stored in user profile for authentication
- **Zero-Knowledge**: Server never receives plaintext passphrase

### Encryption Protocols

#### AES Document Encryption (`src/lib/encryption/aes.ts`)
- **Algorithm**: AES-256-GCM
- **IV**: 12-byte random initialization vector per encryption
- **Key Generation**: Cryptographically secure random 256-bit keys
- **Data Format**: Base64-encoded (IV + encrypted_data)

#### RSA Key Exchange (`src/lib/encryption/rsa.ts`)
- **Algorithm**: RSA-OAEP with SHA-256
- **Usage**: Encrypting/decrypting AES document keys
- **Key Format**: PEM encoding for storage and transmission

#### Passphrase-Based Encryption (`src/lib/encryption/passphrase.ts`)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 16-byte random salt per encryption
- **Algorithm**: AES-256-GCM for private key protection
- **Data Format**: Base64-encoded (salt + IV + encrypted_data)

## Security Strengths

1. **Zero-Knowledge Architecture**: Backend cannot decrypt any user documents
2. **Defense in Depth**: Multiple encryption layers (RSA + AES + PBKDF2)
3. **Forward Secrecy**: Unique AES keys per document
4. **Cryptographic Standards**: Uses well-established algorithms (RSA-OAEP, AES-GCM, PBKDF2)
5. **Secure Sharing**: Per-user key encryption enables secure document sharing
6. **Password Manager Integration**: Reduces risk of passphrase loss
7. **Account Recovery**: BIP39 mnemonic recovery prevents permanent account lockout
8. **Dual Authentication**: Both passphrase and recovery phrase provide access options
9. **Recovery Audit Trail**: All recovery attempts logged for security monitoring

## Security Weaknesses and Improvement Opportunities

1. **Limited Passphrase Verification**
   - bcrypt with 10 rounds may be insufficient against modern attacks
   - No protection against timing attacks on hash verification
   - Hash stored on server enables offline attacks if database compromised

2. **Browser Dependency**
   - Password manager integration required for secure operation
   - No alternative key storage mechanisms
   - Client-side key generation limits cross-device security

3. **Attachment Encryption Gaps**
   - File attachments encrypted but metadata may leak information
   - No verification of encryption for large file uploads
   - Potential for unencrypted temporary files during processing

## Future Recovery Enhancements

**Threshold Secret Sharing**:
- Could complement BIP39 for enterprise users
- Requires trusted contact network
- Higher complexity but distributed trust

**Hardware Security Keys**:
- FIDO2/WebAuthn integration for recovery
- Physical backup device requirement
- Enhanced security for high-value accounts

## Security Improvements

1. **Passphrase Security Enhancement**
   - Increase bcrypt rounds to 12-14 for passphrase hashes
   - Implement rate limiting on authentication attempts
   - Add CAPTCHA for repeated failed attempts

2. **Key Derivation Hardening**
   - Increase PBKDF2 iterations to 600,000+ for new accounts
   - Consider Argon2id as PBKDF2 alternative
   - Add client-side key stretching

3. **Advanced Security Features**
   - Implement key rotation mechanism
   - Add integrity verification for stored encrypted keys
   - Consider hardware security module integration for enterprise
   - Implement anomaly detection for unusual access patterns

## Implementation Roadmap

### Phase 1: Security Hardening (Priority: MEDIUM)
- [ ] Increase bcrypt rounds and PBKDF2 iterations
- [ ] Implement rate limiting and authentication protection
- [ ] Add key rotation mechanisms
- [ ] Enhanced passphrase strength validation

### Phase 2: Advanced Features (Priority: LOW)
- [ ] Hardware security module integration
- [ ] Multi-device key synchronization
- [ ] Advanced threat detection and monitoring
- [ ] Alternative recovery mechanisms (threshold sharing)






### Phase 2: Security Hardening (Priority: MEDIUM)
- [ ] Increase bcrypt rounds and PBKDF2 iterations
- [ ] Implement rate limiting and authentication protection
- [ ] Add key rotation mechanisms
- [ ] Enhanced passphrase strength validation

### Phase 3: Advanced Features (Priority: LOW)
- [ ] Hardware security module integration
- [ ] Multi-device key synchronization
- [ ] Advanced threat detection and monitoring
- [ ] Alternative recovery mechanisms (threshold sharing)

## Security Flow Migration Strategy

### Generic Migration Framework

To enable seamless security protocol updates while preserving document sharing capabilities, we implement a **versioned encryption architecture** that allows user key re-encryption without touching document-level AES keys.

#### Migration Architecture (`src/lib/security/migration.ts`)

```typescript
interface SecurityMigration {
  version: number;
  name: string;
  description: string;
  migrateUserKeys: (oldKeys: UserKeys, passphrase: string) => Promise<UserKeys>;
  validateMigration: (oldKeys: UserKeys, newKeys: UserKeys) => Promise<boolean>;
}

interface UserKeys {
  version: number;
  publicKey: string;
  privateKey: string;  // Always encrypted with passphrase
  recoveryKey?: string; // Optional recovery key
  algorithm: 'RSA-OAEP-2048' | 'RSA-OAEP-4096' | 'ML-KEM-768' | 'ML-KEM-1024';
}
```

#### Migration Process

1. **User Authentication**: Authenticate with current passphrase to decrypt existing private key
2. **Key Migration**: Generate new key pair using updated security protocols
3. **Document Key Re-encryption**: Re-encrypt all document AES keys with new public key
4. **Validation**: Verify ability to decrypt existing documents with new keys
5. **Atomical Update**: Replace old keys with new keys in single database transaction

#### Document Compatibility Preservation

- **AES Document Keys Unchanged**: Document-level AES-256-GCM keys remain static
- **Per-User Re-encryption**: Only user's encrypted copies of document keys are updated
- **Sharing Integrity**: Shared documents maintain access for all users through individual key re-encryption
- **Rollback Safety**: Migration failures preserve original key structure

### Quantum-Resistant Transition Strategy

#### AES-256-GCM Quantum Security Assessment

**Current Status**: ✅ **QUANTUM-RESISTANT (Long-term)**
- **Grover's Algorithm Impact**: Reduces effective security from 256-bit to 128-bit
- **Timeline**: Remains secure well beyond 2120 given current quantum computing limitations
- **Recommendation**: Continue using AES-256-GCM for document encryption

**Technical Analysis**:
- Quantum computers require 6,600+ logical qubits to impact AES-256
- Even with sufficient qubits, breaking AES-256 would require 10³² years
- Current quantum computers (IBM ~1,121 qubits) are insufficient for cryptographic attacks

#### Post-Quantum Key Exchange Migration

**Phase 1: Hybrid Classical/Post-Quantum (2025-2027)**
```typescript
interface HybridKeyPair {
  classical: RSA_OAEP_4096;
  postQuantum: ML_KEM_768;
  combinedEncryption: (data: string) => Promise<{
    rsa: string;
    mlkem: string;
  }>;
}
```

**Phase 2: Full Post-Quantum Transition (2027-2030)**
```typescript
interface PostQuantumKeyPair {
  algorithm: 'ML-KEM-1024';
  keySize: 1568; // bytes for ML-KEM-1024
  encapsulation: (publicKey: Uint8Array) => Promise<{
    ciphertext: Uint8Array;
    sharedSecret: Uint8Array;
  }>;
}
```

#### Available Post-Quantum Libraries

**Recommended Implementation Stack**:
1. **Primary**: `mlkem` (npm) - Pure TypeScript ML-KEM implementation
2. **Performance**: `@uqs.org/crystals-kyber-rustykey` - WebAssembly with side-channel protection  
3. **Backup**: `@dajiaji/mlkem` - NIST FIPS 203 compliant

**Browser Compatibility**:
- Chrome 131+ (November 2024): Native ML-KEM support
- Firefox/Safari: WebAssembly fallback required
- All modern browsers: Pure JavaScript implementation available

### Migration Implementation Plan

#### Phase 1: Enhanced Security Hardening (2025)
- Increase bcrypt rounds and PBKDF2 iterations for stronger key derivation
- Implement comprehensive rate limiting and authentication protection
- Add key rotation mechanisms for long-term key management
- Enhanced passphrase strength validation and entropy requirements

#### Phase 2: Quantum Preparation (Q3 2025)
```typescript
// src/lib/security/migrations/002-hybrid-keys.ts
export const HybridKeyMigration: SecurityMigration = {
  version: 2,
  name: "Hybrid Classical/Post-Quantum Keys",
  description: "Add ML-KEM alongside RSA for quantum resistance",
  
  async migrateUserKeys(oldKeys: UserKeys, passphrase: string): Promise<UserKeys> {
    // Keep existing RSA keys
    const rsaKeys = extractRSAKeys(oldKeys);
    
    // Generate ML-KEM keys
    const mlkemKeyPair = await generateMLKEMKeyPair();
    
    return {
      version: 2,
      algorithm: 'HYBRID-RSA-MLKEM',
      publicKey: combinePublicKeys(rsaKeys.publicKey, mlkemKeyPair.publicKey),
      privateKey: await encryptHybridPrivateKey({
        rsa: rsaKeys.privateKey,
        mlkem: mlkemKeyPair.privateKey
      }, passphrase),
      recoveryKey: oldKeys.recoveryKey
    };
  }
};
```

#### Phase 3: Full Post-Quantum (2027+)
```typescript
// src/lib/security/migrations/003-full-post-quantum.ts
export const PostQuantumMigration: SecurityMigration = {
  version: 3,
  name: "Full Post-Quantum Transition",
  description: "Migrate to ML-KEM-1024 exclusively",
  
  async migrateUserKeys(oldKeys: UserKeys, passphrase: string): Promise<UserKeys> {
    // Extract current document AES keys using hybrid decryption
    const documentKeys = await extractAllDocumentKeys(oldKeys, passphrase);
    
    // Generate new ML-KEM-1024 key pair
    const mlkemKeyPair = await generateMLKEM1024KeyPair();
    
    // Re-encrypt all document keys with new public key
    await reencryptDocumentKeys(documentKeys, mlkemKeyPair.publicKey);
    
    return {
      version: 3,
      algorithm: 'ML-KEM-1024',
      publicKey: mlkemKeyPair.publicKey,
      privateKey: await encryptPrivateKey(mlkemKeyPair.privateKey, passphrase),
      recoveryKey: await updateRecoveryKey(oldKeys.recoveryKey, mlkemKeyPair.privateKey)
    };
  }
};
```

### User Experience for Migrations

#### Migration Trigger Points
1. **Voluntary Upgrade**: User-initiated security upgrade
2. **Scheduled Migration**: Automatic prompts for critical updates
3. **Forced Migration**: Security incident response or algorithm deprecation

#### Migration UI Flow
```typescript
// Migration notification component
interface MigrationPrompt {
  severity: 'info' | 'warning' | 'critical';
  timeline: string; // "Recommended by March 2025"
  benefits: string[];
  risks: string[];
  estimatedTime: string; // "2-5 minutes"
}
```

#### Safety Mechanisms
- **Pre-migration Backup**: Export encrypted key backup before migration
- **Gradual Rollout**: Deploy migrations to small user percentage first  
- **Rollback Capability**: Maintain old keys during transition period
- **Verification**: Test document decryption before finalizing migration

## Quantum Security Timeline and Recommendations

### Short-term (2025-2027): Hybrid Approach
- **Action**: Enhance existing security with higher bcrypt rounds and PBKDF2 iterations
- **Preparation**: Add ML-KEM libraries and hybrid key support
- **Monitoring**: Track quantum computing developments and NIST standards

### Medium-term (2027-2030): Gradual Transition  
- **Action**: Deploy hybrid RSA/ML-KEM keys for new users
- **Migration**: Offer voluntary post-quantum upgrades for existing users
- **Standards**: Follow industry adoption of ML-KEM in major browsers/services

### Long-term (2030+): Full Post-Quantum
- **Action**: Mandate ML-KEM-1024 for all new accounts
- **Deprecation**: Phase out RSA key generation (keep decryption support)
- **Compliance**: Meet regulatory requirements for quantum-safe cryptography

## Conclusion

The current implementation provides strong cryptographic protection with a comprehensive BIP39 recovery system that eliminates the account lockout vulnerability while maintaining the zero-knowledge architecture.

**Current Security State**:
- Zero-knowledge document encryption with AES-256-GCM
- Dual-layer key protection (passphrase + BIP39 recovery)
- Complete account recovery infrastructure
- Audit trail for all recovery operations

**AES-256-GCM remains quantum-resistant** for the foreseeable future, requiring no immediate changes to document encryption. Future security focus will be on **RSA key exchange migration** to post-quantum algorithms like ML-KEM.

The implemented **versioned key storage** enables seamless security updates while preserving document sharing functionality. This approach ensures long-term security while maintaining usability for medical professionals handling sensitive patient data.