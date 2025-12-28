import * as pdfjsLib from 'pdfjs-dist';

// Use the ES module worker from esm.sh to match the module-based import of pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

// Cache for PDF documents to enable re-rendering at different zoom levels
const pdfCache = new Map<string, { pdf: any; arrayBuffer: ArrayBuffer }>();

export interface PdfLoadResult {
  image: HTMLImageElement;
  viewport: any;
  originalWidth: number;
  originalHeight: number;
  pdfId: string;  // ID for re-rendering
}

// Render PDF at specific resolution
export const renderPdfAtResolution = async (
  pdfId: string,
  targetPixels: number,
  pageNumber: number = 1
): Promise<HTMLImageElement | null> => {
  const cached = pdfCache.get(pdfId);
  if (!cached) return null;

  try {
    const page = await cached.pdf.getPage(pageNumber);
    const originalViewport = page.getViewport({ scale: 1.0 });
    const longerSide = Math.max(originalViewport.width, originalViewport.height);
    const renderScale = targetPixels / longerSide;

    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.92);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    return img;
  } catch (error) {
    console.error("Error re-rendering PDF:", error);
    return null;
  }
};

// Check if PDF needs higher resolution based on current zoom
export const getRequiredResolution = (
  currentScale: number,
  imageWidth: number,
  containerWidth: number
): number => {
  // Calculate effective display size
  const displayWidth = imageWidth * currentScale;

  // If we're zooming in past 100% of the image, we need more resolution
  // Target: always have at least 1:1 pixel ratio when possible
  const minResolution = 4000;  // Minimum resolution
  const maxResolution = 16000; // Maximum resolution (browser limit)

  // Calculate needed resolution based on zoom level
  const neededResolution = Math.max(displayWidth, containerWidth) * 1.5;

  // Clamp to reasonable bounds
  return Math.min(maxResolution, Math.max(minResolution, Math.round(neededResolution)));
};

export const loadPdfPage = async (
  file: File,
  pageNumber: number = 1,
  initialResolution: number = 6000
): Promise<PdfLoadResult | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNumber);

    // Generate unique ID for this PDF
    const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Cache the PDF for later re-rendering
    pdfCache.set(pdfId, { pdf, arrayBuffer });

    // Get original PDF dimensions in points (72 points = 1 inch)
    const originalViewport = page.getViewport({ scale: 1.0 });
    const originalWidthPt = originalViewport.width;
    const originalHeightPt = originalViewport.height;

    // Initial render at moderate resolution (faster loading)
    const longerSide = Math.max(originalWidthPt, originalHeightPt);
    const renderScale = initialResolution / longerSide;

    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.92);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    return {
      image: img,
      viewport,
      originalWidth: originalWidthPt,
      originalHeight: originalHeightPt,
      pdfId
    };
  } catch (error) {
    console.error("Error loading PDF:", error);
    return null;
  }
};

// Clean up cached PDF when sheet is deleted
export const cleanupPdfCache = (pdfId: string) => {
  pdfCache.delete(pdfId);
};