import bcrypt from 'bcryptjs';

// Function to create a bcrypt hash from a passphrase
export async function createHash(passphrase: string, saltRounds: number = 10): Promise<string> {
    const hash = await bcrypt.hash(passphrase, saltRounds);
    return hash;
}

// Function to verify a passphrase against a known bcrypt hash
export async function verifyHash(passphrase: string, knownHash: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(passphrase, knownHash);
    return isMatch;
}
