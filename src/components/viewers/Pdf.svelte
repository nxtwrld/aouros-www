<!-- @migration-task Error while migrating Svelte code: Can only bind to an Identifier or MemberExpression or a `{get, set}` pair
https://svelte.dev/e/bind_invalid_expression -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { PDFDocumentProxy } from 'pdfjs-dist';

  
    export let pdfData: ArrayBuffer | string;
  
    let pdf: PDFDocumentProxy | null = null;
    let numPages = 0;
    let pageNumbers: number[] = [];
  
    onMount(async () => {
        const { pdfjsLib } = await import('$lib/files/lazyPdfjs');
    
        let loadingTask;
    
        if (typeof pdfData === 'string') {
            // Convert base64 string to Uint8Array
            const byteCharacters = atob(pdfData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            loadingTask = pdfjsLib.getDocument({ data: byteArray });
        } else if (pdfData instanceof ArrayBuffer) {
            loadingTask = pdfjsLib.getDocument({ data: pdfData });
        } else {
            throw new Error('Invalid pdfData format');
        }

        pdf = await loadingTask.promise;
        numPages = pdf.numPages;

        pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
    });
  
    async function renderPage(pageNum: number, canvas: HTMLCanvasElement) {
        if (!pdf) return;

        const page = await pdf.getPage(pageNum);

        const viewport = page.getViewport({ scale: 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext).promise;
    }
  </script>
  
  <style>
    canvas {
      display: block;
      margin: 1em auto;
      max-width: 100%;
    }
  </style>
  
  {#if pdf}
    {#each pageNumbers as pageNum}
      <canvas bind:this={canvas => {
        if (canvas) {
          renderPage(pageNum, canvas);
        }
      }}></canvas>
    {/each}
  {:else}
    <p>Loading PDF...</p>
  {/if}
  