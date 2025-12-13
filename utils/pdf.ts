import * as pdfjsLib from 'pdfjs-dist';

// Use the ES module worker from esm.sh to match the module-based import of pdfjs-dist
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

export const loadPdfPage = async (file: File, pageNumber: number = 1): Promise<{ image: HTMLImageElement; viewport: any } | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);
    
    const scale = 2.0; // Render at high res
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    await new Promise((resolve) => { img.onload = resolve; });
    
    return { image: img, viewport };
  } catch (error) {
    console.error("Error loading PDF:", error);
    return null;
  }
};