export function getAge(birthDate: string | Date): number {
    if (typeof birthDate === 'string') {
        birthDate = new Date(birthDate);
    }
    let now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    let m = now.getMonth() - birthDate.getMonth();
    return Math.round(m < 0 || (m === 0 && now.getDate() < birthDate.getDate()) ? age - 1 : age);

}