export function getAge(birthDate: string | Date): number {
    let date: Date;
    if (typeof birthDate === 'string') {
        date = new Date(birthDate);
    } else if (birthDate instanceof Date)  {
        date = birthDate;
    }
    if (!date) {
        return 0;
    }

    let now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    let m = now.getMonth() - date.getMonth();
    return Math.round(m < 0 || (m === 0 && now.getDate() < date.getDate()) ? age - 1 : age);

}