import type FileProcessor from "./processor";
import type { ProcessedFile } from "./types.d";
import { resizeImage } from "$lib/images";
import { THUMBNAIL_SIZE, PROCESS_SIZE } from "./CONFIG";
const DEFAULT_DELAY = 20;


export async function  processImages(images: string[]): Promise<ProcessedFile> {
    return new Promise(async (resolve, reject) => {

        const resizedImages = await Promise.all(images.map(async (image) => resizeImage(image, PROCESS_SIZE)));  

/*        console.log('Number of images', resizedImages.length);*/
        

        const response = await fetch('/v1/import/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                images: resizedImages
            })
        });

        const processed = await response.json();

        // attach original images and thumbnails    
        processed.pages = await Promise.all(processed.pages.map(async (page: any, index: number) => {
            const image = images[index];
            return {
                ...page,
                image,
                thumbnail: await resizeImage(image, THUMBNAIL_SIZE)
            }
        }));


        resolve(processed);
    });
}


export async function processImage(image: string): Promise<ProcessedFile> {
    return new Promise(async (resolve, reject) => {
       return processImages([image]);
    });
}
