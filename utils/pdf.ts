import * as pdfjsLib from 'pdfjs-dist';

// Use the ES module worker from esm.sh to match the module-based import of pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

export const loadPdfPage = async (file: File, pageNumber: number = 1): Promise<{ image: HTMLImageElement; viewport: any; originalWidth: number; originalHeight: number } | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);

    // Get original PDF dimensions in points (72 points = 1 inch)
    const originalViewport = page.getViewport({ scale: 1.0 });
    const originalWidthPt = originalViewport.width;  // Width in PDF points
    const originalHeightPt = originalViewport.height; // Height in PDF points

    // Calculate scale to achieve high resolution
    // Target 6000px on longer side - good balance between quality and browser compatibility
    // (14000px caused canvas memory issues in some browsers)
    const maxDimension = 6000;
    const longerSide = Math.max(originalWidthPt, originalHeightPt);
    const renderScale = maxDimension / longerSide;

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    // Cast to any to handle pdfjs-dist type strictness
    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Return original dimensions in points for potential calibration
    // 1 point = 1/72 inch = 0.3528 mm
    return {
      image: img,
      viewport,
      originalWidth: originalWidthPt,
      originalHeight: originalHeightPt
    };
  } catch (error) {
    console.error("Error loading PDF:", error);
    return null;
  }
};