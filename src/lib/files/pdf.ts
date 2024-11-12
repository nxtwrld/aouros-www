import type { ProcessedFile,  ProcessedPage } from './types.d';
import type { PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist';
import type FileProcessor from "./pProcessor";
import FileProcessorClass from './processor';
import { processImages } from './image';
import { merge as mergeImages } from '$lib/images';
import { THUMBNAIL_SIZE, PROCESS_SIZE } from "./CONFIG";


export enum CODES {
    PASSWORD = 'require.password',
    PASSWORD_INCORRECT = 'password.incorrect',
}

const TOLERANCE = 3;
const TOP_OFFSET = 15;
const SCALE = 2;

export async function processPDF(arrayBuffer: ArrayBuffer, password: string | undefined = undefined): Promise<ProcessedFile> {
    
    try {

        const options: {
            data: ArrayBuffer;
            password?: string;
        } = {
            data: arrayBuffer.slice(0)
        }
        if (password) {
            options.password = password;
        }

      const pdfDoc = await loadPdfDocument(options);

      return processInternal(pdfDoc);
    } catch (error: any) {
       if (error.name === 'PasswordException') {
        throw new Error(CODES.PASSWORD);
      } else {
        throw new Error(error);
      }
    }
  }
  


  async function processInternal(pdfDoc: PDFDocumentProxy): Promise<ProcessedFile> {
 
        const thumbnail = await makeThumb(await pdfDoc.getPage(1));
        
        //fileProcessor?.emit('thumbnail', thumbnail);
        

          // no text was extracted, it is probably PDF scan so we'll try to extract images instead and OCR them
          const base64Images = await renderPDFToBase64Images(pdfDoc);

          let imagesCount = base64Images.length;
        
          let text: string = '';
          let tags: string[] = [];
          const pages: ProcessedPage[] = [];


          let index = 0;
        const processedImages = await processImages(base64Images);

          //if (fileProcessor) fileProcessor.emit('progress', 'extract', 100);
          
          return processedImages;



  }

  async function loadPdfDocument(config: any) {
    // Dynamically import pdf.js
    const { pdfjsLib } = await import('./lazyPdfjs');
  
    // Now, use getDocument to load your PDF
    const loadingTask = pdfjsLib.getDocument(config);
    return loadingTask.promise;
  }


  async function renderPDFToBase64Images(pdfDoc: PDFDocumentProxy): Promise<string[]> {
    let base64Images: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        //await page.render({ canvasContext: ctx, viewport }).promise;
        base64Images.push(await renderPDFPageToBase64Image(page)); // Get base64 representation
    }

    return base64Images;
}

async function renderPDFPageToBase64Image(page: PDFPageProxy): Promise<string> {
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL(); 
}




  async function makeThumb(page: PDFPageProxy): Promise<string> {
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement("canvas");
    const scale = Math.min(THUMBNAIL_SIZE / viewport.width, THUMBNAIL_SIZE / viewport.height);
    canvas.width = viewport.width * scale;
    canvas.height = viewport.height * scale;
    return page.render({canvasContext: canvas.getContext("2d"), viewport: page.getViewport({ scale })}).promise.then(function () {
      return canvas.toDataURL('image/png');
    });
  }

