

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


export function float32Flatten (chunks: Float32Array[]): Float32Array {
    //get the total number of frames on the new float32array
    const nFrames = chunks.reduce((acc, elem) => acc + elem.length, 0)
    
    //create a new float32 with the correct number of frames
    const result = new Float32Array(nFrames);
    
    //insert each chunk into the new float32array 
    let currentFrame =0
    chunks.forEach((chunk)=> {
        result.set(chunk, currentFrame)
        currentFrame += chunk.length;
    });
    return result;
 }    