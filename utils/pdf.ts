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

    // Calculate scale to achieve high resolution (target ~14000px on longer side, matching blank sheet quality)
    // This allows detailed zooming while keeping file size reasonable
    const maxDimension = 14000;
    const scaleForWidth = maxDimension / originalWidthPt;
    const scaleForHeight = maxDimension / originalHeightPt;
    const renderScale = Math.min(scaleForWidth, scaleForHeight);

    const viewport = page.getViewport({ scale: renderScale });

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