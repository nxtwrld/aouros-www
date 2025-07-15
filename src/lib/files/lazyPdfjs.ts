import * as pdfjsLib from "pdfjs-dist";
//import * as pdfWorker from "pdfjs-dist/build/pdf.worker.mjs";
//import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";

const pdfWorker = "/pdfjs/pdf.worker.mjs";
// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export { pdfjsLib };
