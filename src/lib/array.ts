

export function getSortForEnum(enumerator: object, property: string | undefined = undefined): (a: any, b: any) => number {

    const map: {
        [key: string]: number;
    } = {};

    (Object.values(enumerator) as string[]).forEach((value, index) => {
        map[value] = index;
    });

    return (a, b) => {

        const c = property ? a[property] : a;
        const d = property ? b[property] : b;

        if (map[c] < map[d]) {
            return -1;
        }

        if (map[c] > map[d]) {
            return 1;
        }

        return 0;
    }
}


export function sortbyProperty(property: string): (a: any, b: any) => number {
    return (a, b) => {
        return a[property] - b[property] 
    }
}