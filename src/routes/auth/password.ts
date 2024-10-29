import { passwordStrength, type DiversityType } from 'check-password-strength'

export const PASSWORD_CONFIG: {
    length: number;
    contains: DiversityType[];
} = {
    length: 10,
    contains: ['lowercase', 'uppercase', 'symbol', 'number']
}


export function checkPassword(password: string) {
    const check =  passwordStrength(password);
    if (check.length < PASSWORD_CONFIG.length ) {
        return false;
    }
    for (const type of PASSWORD_CONFIG.contains) {
        if (!check.contains.includes(type)) {
            return false;
        }
    }
    return true;
}

export function matchPassword(password: string, password2: string) {
    return password === password2;
}
