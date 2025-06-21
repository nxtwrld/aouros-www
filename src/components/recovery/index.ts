// Recovery Components
export { default as RecoverySetup } from './RecoverySetup.svelte';
export { default as MnemonicDisplay } from './MnemonicDisplay.svelte';
export { default as MnemonicVerification } from './MnemonicVerification.svelte';
export { default as PassphraseCreation } from './PassphraseCreation.svelte';
export { default as AccountRecovery } from './AccountRecovery.svelte';

// Recovery flow state types
export type RecoveryFlowState = 
    | 'setup'
    | 'display'
    | 'verify'
    | 'passphrase'
    | 'test'
    | 'success'
    | 'error';

// Recovery setup data interface
export interface RecoverySetupData {
    mnemonic: string;
    recoveryKey: CryptoKey;
    recoveryHash: string;
    recoveryEncryptedPrivateKey: string;
}

// Recovery flow props interface
export interface RecoveryFlowProps {
    email: string;
    onComplete: (data: any) => void;
    onError: (error: string) => void;
}