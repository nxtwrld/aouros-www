# Data and Privacy Architecture

## Overview

Aouros implements a **zero-knowledge encryption architecture** designed to ensure that the backend server cannot decrypt sensitive medical documents and health data. The system uses a multi-layered encryption approach combining AES symmetric encryption for documents and RSA asymmetric encryption for secure key distribution.

## Current Implementation

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

## Security Weaknesses and Improvement Opportunities

### Critical Weaknesses

1. **Account Recovery Lockout** ⚠️ **CRITICAL**
   - If user loses master passphrase, all data becomes permanently inaccessible
   - No recovery mechanism exists for forgotten passphrases
   - Single point of failure for entire account

2. **Passphrase Quality Dependency**
   - User-chosen passphrases may be weak despite auto-generation option
   - No enforced minimum entropy for custom passphrases
   - Social engineering vulnerability if passphrase is shared

3. **Key Storage Centralization**
   - All encrypted keys stored in single database
   - Database compromise could enable offline attacks on key material
   - No key escrow or backup mechanisms

### Medium Priority Issues

4. **Limited Passphrase Verification**
   - bcrypt with 10 rounds may be insufficient against modern attacks
   - No protection against timing attacks on hash verification
   - Hash stored on server enables offline attacks if database compromised

5. **Browser Dependency**
   - Password manager integration required for secure operation
   - No alternative key storage mechanisms
   - Client-side key generation limits cross-device security

6. **Attachment Encryption Gaps**
   - File attachments encrypted but metadata may leak information
   - No verification of encryption for large file uploads
   - Potential for unencrypted temporary files during processing

## Proposed Account Recovery Solutions

### Option 1: Cryptographic Recovery Keys (Recommended)

**Implementation**:
- Generate 24-word BIP39 mnemonic during account setup
- Derive separate recovery key pair from mnemonic using PBKDF2
- Encrypt user's main private key with recovery public key
- Store recovery-encrypted private key alongside passphrase-encrypted version

**Benefits**:
- Provides secure recovery without server access to keys
- User controls recovery seed phrase
- Compatible with existing architecture
- Industry-standard approach (used by crypto wallets)

**User Experience**:
- Display recovery phrase during onboarding with clear warnings
- Require user to confirm phrase storage before proceeding
- Provide recovery interface for passphrase reset

### Option 2: Threshold Secret Sharing

**Implementation**:
- Split master key using Shamir's Secret Sharing (3-of-5 threshold)
- Store shares with trusted contacts or secure services
- Require majority of shares to reconstruct key for recovery

**Benefits**:
- Distributed trust model
- No single point of failure
- Social recovery mechanism

**Challenges**:
- Complex user experience
- Requires trusted network of contacts
- Higher implementation complexity

### Option 3: Time-Locked Recovery

**Implementation**:
- Generate time-locked recovery key pair
- Encrypt user's private key with time-locked public key
- After configurable delay (e.g., 30 days), allow key recovery
- Implement notification system for recovery attempts

**Benefits**:
- Prevents immediate social engineering attacks
- Provides recovery window for legitimate users
- Server-assisted but still zero-knowledge

**Challenges**:
- Complex cryptographic implementation
- Requires secure time-lock service
- May not prevent all attack scenarios

## Immediate Security Improvements

1. **Enhance Passphrase Security**
   - Increase bcrypt rounds to 12-14
   - Implement rate limiting on authentication attempts
   - Add CAPTCHA for repeated failed attempts

2. **Key Derivation Hardening**
   - Increase PBKDF2 iterations to 600,000+ for new accounts
   - Implement Argon2id as PBKDF2 alternative
   - Add client-side key stretching

3. **Implement Recovery Keys**
   - Add BIP39 mnemonic generation to onboarding flow
   - Create recovery key encryption alongside passphrase encryption
   - Build recovery interface for key reconstruction

4. **Enhanced Key Storage**
   - Implement key rotation mechanism
   - Add integrity verification for stored encrypted keys
   - Consider hardware security module integration for enterprise

5. **Audit and Monitoring**
   - Log all key access attempts
   - Implement anomaly detection for unusual access patterns
   - Add secure key backup verification

## Implementation Roadmap

### Phase 1: Critical Recovery (Priority: HIGH)
- [ ] Implement BIP39 mnemonic generation
- [ ] Add recovery key encryption to user onboarding
- [ ] Create recovery interface for passphrase reset
- [ ] Update existing users to generate recovery keys

## BIP39 Recovery Implementation Strategy

### Overview

Implement mandatory BIP39 mnemonic recovery keys to solve the critical account lockout vulnerability while maintaining zero-knowledge architecture. Users cannot complete onboarding without properly storing their recovery phrase.

### Database Schema Changes

**Migration File**: `recovery_keys_migration.sql`

#### Key Schema Updates:
```sql
ALTER TABLE public.private_keys 
ADD COLUMN recovery_key text,              -- Private key encrypted with recovery-derived key
ADD COLUMN recovery_key_hash text,         -- bcrypt hash of BIP39 mnemonic
ADD COLUMN key_version integer DEFAULT 0,  -- Versioning for future migrations
ADD COLUMN recovery_created_at timestamp,  -- Recovery key generation time
ADD COLUMN recovery_verified_at timestamp; -- Last recovery verification time
```

#### New Tables:
- **recovery_attempts**: Audit log for all recovery operations
- **security_migrations**: Track user key migration history
- **Supporting functions**: Validation and RLS policies

### BIP39 Implementation Details

#### Library Selection
**Recommended**: `bip39-web-crypto` (npm)
- Zero dependencies, uses native Web Crypto API
- Browser-optimized with async/await support
- 24-word mnemonic generation (256-bit entropy)

**Alternative**: `bip39` (npm) - Most battle-tested option

#### Key Derivation Process
```typescript
// src/lib/encryption/recovery.ts
interface RecoveryKeyDerivation {
  generateMnemonic(): string;                    // 24-word BIP39 mnemonic
  deriveKeyFromMnemonic(mnemonic: string): Promise<CryptoKey>;
  encryptPrivateKeyWithRecovery(privateKey: string, recoveryKey: CryptoKey): Promise<string>;
  validateMnemonic(mnemonic: string): boolean;
}
```

**Process Flow**:
1. Generate 24-word BIP39 mnemonic (256-bit entropy)
2. Derive recovery key using PBKDF2 (100,000 iterations, SHA-256)
3. Encrypt user's RSA private key with recovery key
4. Store recovery-encrypted key alongside passphrase-encrypted key
5. Hash mnemonic with bcrypt for verification (never store plaintext)

### Updated Privacy Onboarding Flow

#### Current State Analysis (`src/components/onboarding/Privacy.svelte`)
- **Lines 41-155**: Existing passphrase creation and validation flow
- **State Management**: `autoPassphrase` state machine with 6 states
- **Key Issues**: No recovery mechanism, optional password manager dependency

#### New Required Flow
```typescript
type OnboardingState = 
  | 'settingup'           // Initial state
  | 'generate-recovery'   // Generate and display mnemonic
  | 'verify-recovery'     // User confirms mnemonic storage
  | 'create-passphrase'   // Set master passphrase
  | 'test-passphrase'     // Validate password manager
  | 'success'             // Complete setup
  | 'fail';               // Error state

interface RecoveryOnboardingData {
  mnemonic: string;
  mnemonicWords: string[];
  userConfirmedWords: string[];
  recoveryVerified: boolean;
  passphraseSet: boolean;
}
```

#### Step-by-Step UI Flow

**Step 1: Recovery Key Generation**
```svelte
<!-- Generate 24-word mnemonic -->
<div class="recovery-generation">
  <h3>Secure Recovery Setup</h3>
  <p>We'll generate a 24-word recovery phrase that can restore your account if you forget your passphrase.</p>
  <button onclick={generateRecoveryPhrase}>Generate Recovery Phrase</button>
</div>
```

**Step 2: Mnemonic Display and Storage Confirmation**
```svelte
<!-- Display mnemonic with security warnings -->
<div class="recovery-display">
  <h3>Your Recovery Phrase</h3>
  <div class="warning-box">
    ⚠️ CRITICAL: Write down these 24 words in order. Store them securely offline.
    Without this phrase, lost passphrases cannot be recovered.
  </div>
  
  <div class="mnemonic-grid">
    {#each mnemonicWords as word, index}
      <div class="word-item">
        <span class="word-number">{index + 1}</span>
        <span class="word-text">{word}</span>
      </div>
    {/each}
  </div>
  
  <div class="storage-options">
    <label><input type="checkbox" bind:checked={writtenDown}> I have written down all 24 words</label>
    <label><input type="checkbox" bind:checked={storedSecurely}> I have stored them in a secure location</label>
    <label><input type="checkbox" bind:checked={understand}> I understand this cannot be recovered if lost</label>
  </div>
  
  <button disabled={!allConfirmed} onclick={proceedToVerification}>Continue</button>
</div>
```

**Step 3: Mnemonic Verification**
```svelte
<!-- Verify user wrote down mnemonic correctly -->
<div class="recovery-verification">
  <h3>Verify Recovery Phrase</h3>
  <p>Please enter words #{wordIndexes.join(', ')} from your recovery phrase:</p>
  
  {#each verificationWords as wordIndex, i}
    <div class="verification-word">
      <label>Word #{wordIndex + 1}:</label>
      <input 
        type="text" 
        bind:value={userInputs[i]}
        placeholder="Enter word"
        autocomplete="off"
      />
    </div>
  {/each}
  
  <button onclick={verifyRecoveryPhrase}>Verify & Continue</button>
</div>
```

**Step 4: Passphrase Creation** (Modified existing flow)
```svelte
<!-- Enhanced passphrase creation with recovery context -->
<div class="passphrase-creation">
  <h3>Create Master Passphrase</h3>
  <p>Your passphrase encrypts your private keys. Combined with your recovery phrase, this provides maximum security.</p>
  
  <!-- Existing passphrase creation UI with recovery integration -->
  <div class="security-summary">
    ✅ Recovery phrase verified and stored<br>
    🔒 Passphrase protects daily access<br>
    🛡️ Double protection against account loss
  </div>
</div>
```

### Recovery Interface Implementation

#### Account Recovery Page (`src/routes/recover/+page.svelte`)
```svelte
<script lang="ts">
  import { validateMnemonic, recoverAccount } from '$lib/encryption/recovery';
  
  let recoveryPhrase = '';
  let newPassphrase = '';
  let confirmPassphrase = '';
  let recoveryStep: 'mnemonic' | 'passphrase' | 'success' = 'mnemonic';
</script>

<div class="recovery-flow">
  {#if recoveryStep === 'mnemonic'}
    <h2>Account Recovery</h2>
    <p>Enter your 24-word recovery phrase to restore access to your account.</p>
    
    <textarea 
      bind:value={recoveryPhrase}
      placeholder="Enter your 24-word recovery phrase"
      rows="4"
    ></textarea>
    
    <button onclick={validateAndProceed}>Verify Recovery Phrase</button>
  
  {:else if recoveryStep === 'passphrase'}
    <h2>Set New Passphrase</h2>
    <p>Create a new passphrase for your recovered account.</p>
    
    <input type="password" bind:value={newPassphrase} placeholder="New passphrase" />
    <input type="password" bind:value={confirmPassphrase} placeholder="Confirm passphrase" />
    
    <button onclick={completeRecovery}>Complete Recovery</button>
  
  {:else}
    <h2>Recovery Complete</h2>
    <p>Your account has been successfully recovered with a new passphrase.</p>
    <a href="/dashboard">Continue to Dashboard</a>
  {/if}
</div>
```

### Encryption Implementation

#### Recovery Key Module (`src/lib/encryption/recovery.ts`)
```typescript
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39-web-crypto';
import { createHash, verifyHash } from './hash';
import { encryptString, decryptString } from './passphrase';

export class RecoveryKeyManager {
  
  static async generateRecoverySetup(): Promise<{
    mnemonic: string;
    recoveryKey: CryptoKey;
    recoveryHash: string;
  }> {
    // Generate 24-word mnemonic (256-bit entropy)
    const mnemonic = generateMnemonic(256);
    
    // Derive recovery key from mnemonic
    const seed = await mnemonicToSeed(mnemonic);
    const recoveryKey = await deriveKeyFromSeed(seed);
    
    // Create hash for storage and verification
    const recoveryHash = await createHash(mnemonic, 12); // Higher bcrypt rounds
    
    return { mnemonic, recoveryKey, recoveryHash };
  }
  
  static async encryptPrivateKeyWithRecovery(
    privateKeyPEM: string, 
    recoveryKey: CryptoKey
  ): Promise<string> {
    // Use recovery key to encrypt private key
    return await encryptWithCryptoKey(privateKeyPEM, recoveryKey);
  }
  
  static async recoverPrivateKey(
    mnemonic: string,
    recoveryEncryptedKey: string
  ): Promise<string> {
    // Validate mnemonic format
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid recovery phrase format');
    }
    
    // Derive recovery key from mnemonic
    const seed = await mnemonicToSeed(mnemonic);
    const recoveryKey = await deriveKeyFromSeed(seed);
    
    // Decrypt private key
    return await decryptWithCryptoKey(recoveryEncryptedKey, recoveryKey);
  }
  
  static async verifyRecoveryPhrase(
    mnemonic: string,
    storedHash: string
  ): Promise<boolean> {
    return await verifyHash(mnemonic, storedHash);
  }
}

async function deriveKeyFromSeed(seed: Uint8Array): Promise<CryptoKey> {
  // Use first 32 bytes of seed as key material
  const keyMaterial = seed.slice(0, 32);
  
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

### Security Considerations

#### Mnemonic Security
- **Entropy**: 256-bit entropy (24 words) provides 2^256 security
- **Storage**: Never store mnemonic plaintext, only bcrypt hash for verification
- **Display**: Show mnemonic only once during setup with clear warnings
- **Verification**: Require user to confirm storage before proceeding

#### Recovery Process Security
- **Rate Limiting**: Limit recovery attempts to prevent brute force
- **Audit Logging**: Log all recovery attempts in `recovery_attempts` table
- **IP Tracking**: Monitor unusual recovery patterns
- **Time Delays**: Consider progressive delays for failed attempts

#### Migration Safety
- **Backup Verification**: Test recovery before completing migration
- **Rollback Capability**: Maintain old keys during transition period
- **Gradual Deployment**: Roll out to subset of users first
- **Error Handling**: Graceful failure with clear user messaging

### User Experience Guidelines

#### Onboarding UX Principles
1. **Progressive Disclosure**: Show one step at a time to avoid overwhelming users
2. **Clear Warnings**: Emphasize the importance of recovery phrase storage
3. **Multiple Confirmation**: Require multiple confirmations before proceeding
4. **Visual Hierarchy**: Use colors and icons to highlight critical information
5. **Educational Content**: Provide context about why recovery is important

#### Recovery UX Principles
1. **Simple Interface**: Minimize cognitive load during stressful recovery
2. **Clear Instructions**: Step-by-step guidance with progress indicators
3. **Error Handling**: Helpful error messages with recovery suggestions
4. **Success Confirmation**: Clear confirmation when recovery is complete

### Testing Strategy

#### Unit Tests
- BIP39 mnemonic generation and validation
- Key derivation from mnemonic
- Encryption/decryption with recovery keys
- Hash verification functions

#### Integration Tests
- Complete onboarding flow with recovery setup
- Recovery process end-to-end
- Database migration and rollback
- Cross-browser compatibility

#### Security Tests
- Entropy analysis of generated mnemonics
- Key derivation consistency
- Recovery attempt rate limiting
- SQL injection prevention in new tables

### Deployment Plan

#### Phase 1: Infrastructure (Week 1-2)
1. Deploy database migration to staging
2. Implement recovery key encryption library
3. Create basic recovery UI components
4. Unit and integration testing

#### Phase 2: Onboarding Integration (Week 3-4)
1. Update Privacy.svelte with recovery flow
2. Add mandatory recovery verification
3. Update user registration API endpoints
4. End-to-end testing

#### Phase 3: Recovery Interface (Week 5-6)
1. Implement account recovery page
2. Add recovery attempt monitoring
3. Security testing and audit
4. Documentation and user guides

#### Phase 4: Production Deployment (Week 7-8)
1. Gradual rollout to 10% of new users
2. Monitor recovery metrics and errors
3. Full deployment to all new users
4. Optional migration prompt for existing users

This implementation provides a secure, user-friendly recovery system that eliminates the account lockout vulnerability while maintaining the zero-knowledge architecture.

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

#### Phase 1: Migration Infrastructure (Q1 2025)
```typescript
// src/lib/security/migrations/001-recovery-keys.ts
export const RecoveryKeyMigration: SecurityMigration = {
  version: 1,
  name: "BIP39 Recovery Keys",
  description: "Add cryptographic recovery using 24-word mnemonic",
  
  async migrateUserKeys(oldKeys: UserKeys, passphrase: string): Promise<UserKeys> {
    // Generate BIP39 mnemonic
    const mnemonic = generateMnemonic(256);
    const recoveryKeyPair = await deriveKeyPairFromMnemonic(mnemonic);
    
    // Decrypt current private key
    const privateKey = await decryptPrivateKey(oldKeys.privateKey, passphrase);
    
    // Re-encrypt with recovery key
    const recoveryEncryptedKey = await encryptWithRecoveryKey(privateKey, recoveryKeyPair.publicKey);
    
    return {
      ...oldKeys,
      version: 1,
      recoveryKey: recoveryEncryptedKey,
      recoveryMnemonic: mnemonic // Displayed once to user
    };
  }
};
```

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
- **Action**: Implement BIP39 recovery keys immediately
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

The current implementation provides strong cryptographic protection but suffers from a critical account recovery vulnerability. The recommended BIP39 recovery key solution addresses this weakness while maintaining the zero-knowledge architecture.

**AES-256-GCM remains quantum-resistant** for the foreseeable future, requiring no immediate changes to document encryption. The focus should be on **RSA key exchange migration** to post-quantum algorithms like ML-KEM.

The proposed **versioned migration framework** enables seamless security updates while preserving document sharing functionality. Implementation should prioritize:

1. **Immediate**: BIP39 recovery key system
2. **2025**: Hybrid classical/post-quantum key infrastructure  
3. **2027+**: Full transition to ML-KEM based on industry adoption

This approach ensures long-term security while maintaining usability for medical professionals handling sensitive patient data in an evolving threat landscape.