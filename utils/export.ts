
import { jsPDF } from 'jspdf';
import { Shape, Point, Sheet, CoordinateReference, PageConfig } from '../types';
import { getPolygonArea, getPolygonPerimeter, getDistance, getCentroid, transformPointToWorld, getAxisSystemPoints, getMidpoint, getArrowHeadPoints } from './geometry';

// ============================================
// PDF EXPORT
// ============================================

export interface PdfExportOptions {
  sheet: Sheet;
  image: HTMLImageElement | null;
  pixelsPerMeter: number | null;
  pageConfig: PageConfig;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export const exportToPdf = async (options: PdfExportOptions): Promise<Blob> => {
  const { sheet, image, pixelsPerMeter, pageConfig } = options;

  if (!image) {
    throw new Error('Pilti pole laaditud');
  }

  const imgWidth = image.naturalWidth;
  const imgHeight = image.naturalHeight;

  // Determine page orientation based on image aspect ratio
  const isLandscape = imgWidth > imgHeight;

  // Create PDF with appropriate orientation
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Calculate margins and available space
  const margin = 10;
  const headerSpace = options.includeHeader ? pageConfig.headerHeight / 10 : 0;
  const footerSpace = options.includeFooter ? pageConfig.footerHeight / 10 : 0;

  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin - headerSpace - footerSpace;

  // Calculate scale to fit image
  const scaleX = availableWidth / imgWidth;
  const scaleY = availableHeight / imgHeight;
  const scale = Math.min(scaleX, scaleY);

  const pdfImgWidth = imgWidth * scale;
  const pdfImgHeight = imgHeight * scale;

  // Center the image
  const offsetX = margin + (availableWidth - pdfImgWidth) / 2;
  const offsetY = margin + headerSpace + (availableHeight - pdfImgHeight) / 2;

  // Add header if requested
  if (options.includeHeader) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(sheet.title || 'Projekt', margin, margin + 5);

    if (sheet.floor) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(sheet.floor, margin, margin + 10);
    }

    // Add date
    pdf.setFontSize(8);
    pdf.text(new Date().toLocaleDateString('et-EE'), pageWidth - margin - 20, margin + 5);
  }

  // Add background image
  pdf.addImage(image.src, 'PNG', offsetX, offsetY, pdfImgWidth, pdfImgHeight);

  // Convert pixel coordinates to PDF coordinates
  const toPdfCoord = (p: Point): { x: number; y: number } => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale
  });

  // Draw shapes
  for (const shape of sheet.shapes) {
    if (shape.visible === false) continue;

    // Set color
    const hexColor = shape.color || '#000000';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    pdf.setDrawColor(r, g, b);
    pdf.setFillColor(r, g, b);

    if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle') {
      const pdfPoints = shape.points.map(toPdfCoord);

      // Draw polygon
      pdf.setLineWidth((shape.strokeWidth || 2) * scale * 0.3);

      // Fill with transparency
      const opacity = shape.opacity || 0.4;
      pdf.setGState(pdf.GState({ opacity }));

      // Draw filled polygon using lines method
      if (pdfPoints.length >= 3) {
        pdf.setFillColor(r, g, b);

        // Convert points to relative movements for jsPDF lines method
        const startX = pdfPoints[0].x;
        const startY = pdfPoints[0].y;
        const lineSegments: [number, number][] = [];

        for (let i = 1; i < pdfPoints.length; i++) {
          lineSegments.push([
            pdfPoints[i].x - pdfPoints[i - 1].x,
            pdfPoints[i].y - pdfPoints[i - 1].y
          ]);
        }
        // Close the polygon
        lineSegments.push([
          pdfPoints[0].x - pdfPoints[pdfPoints.length - 1].x,
          pdfPoints[0].y - pdfPoints[pdfPoints.length - 1].y
        ]);

        // Draw using lines method: lines(lines, x, y, [scale], [style], [closed])
        pdf.lines(lineSegments, startX, startY, [1, 1], 'FD', true);
      }

      pdf.setGState(pdf.GState({ opacity: 1 }));

      // Add label
      if (shape.label) {
        const centroid = getCentroid(shape.points);
        const pdfCentroid = toPdfCoord(centroid);

        pdf.setTextColor(shape.textColor || '#000000');
        pdf.setFontSize(Math.max(6, 12 * scale * pageConfig.fontSizeScale));
        pdf.setFont('helvetica', shape.fontWeight === 'bold' ? 'bold' : 'normal');

        // Add text background if boxed style
        if (shape.textStyle === 'boxed') {
          const textWidth = pdf.getTextWidth(shape.label);
          const textHeight = 4;
          pdf.setFillColor(255, 255, 255);
          pdf.rect(pdfCentroid.x - textWidth / 2 - 1, pdfCentroid.y - textHeight / 2 - 1, textWidth + 2, textHeight + 2, 'F');
        }

        pdf.text(shape.label, pdfCentroid.x, pdfCentroid.y, { align: 'center', baseline: 'middle' });

        // Add area measurement
        if (shape.showArea && pixelsPerMeter) {
          const areaPx = getPolygonArea(shape.points);
          const areaM2 = areaPx / (pixelsPerMeter * pixelsPerMeter);
          pdf.setFontSize(8 * scale * pageConfig.fontSizeScale);
          pdf.text(`${areaM2.toFixed(1)} m²`, pdfCentroid.x, pdfCentroid.y + 4, { align: 'center' });
        }
      }
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      const [start, end] = shape.points.map(toPdfCoord);
      pdf.setLineWidth((shape.strokeWidth || 2) * scale * 0.3);
      pdf.line(start.x, start.y, end.x, end.y);

      // Add arrow head if arrow type
      if (shape.type === 'arrow') {
        const headSize = (shape.strokeWidth || 4) * 3 * scale;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        const p1 = {
          x: end.x - headSize * Math.cos(angle - Math.PI / 6),
          y: end.y - headSize * Math.sin(angle - Math.PI / 6)
        };
        const p2 = {
          x: end.x - headSize * Math.cos(angle + Math.PI / 6),
          y: end.y - headSize * Math.sin(angle + Math.PI / 6)
        };

        pdf.triangle(end.x, end.y, p1.x, p1.y, p2.x, p2.y, 'F');
      }

      // Add measurement label for lines
      if (shape.type === 'line' && pixelsPerMeter) {
        const mid = getMidpoint(shape.points[0], shape.points[1]);
        const pdfMid = toPdfCoord(mid);
        const dist = getDistance(shape.points[0], shape.points[1]) / pixelsPerMeter;

        pdf.setFontSize(8 * scale);
        pdf.setFillColor(r, g, b);
        pdf.roundedRect(pdfMid.x - 8, pdfMid.y - 3, 16, 6, 1, 1, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${dist.toFixed(2)} m`, pdfMid.x, pdfMid.y, { align: 'center', baseline: 'middle' });
      }
    } else if (shape.type === 'circle') {
      const center = toPdfCoord(shape.points[0]);
      const edgePoint = toPdfCoord(shape.points[1]);
      const radius = Math.sqrt(Math.pow(edgePoint.x - center.x, 2) + Math.pow(edgePoint.y - center.y, 2));

      pdf.setLineWidth((shape.strokeWidth || 2) * scale * 0.3);
      pdf.setGState(pdf.GState({ opacity: shape.opacity || 0.5 }));
      pdf.circle(center.x, center.y, radius, 'FD');
      pdf.setGState(pdf.GState({ opacity: 1 }));
    } else if (shape.type === 'text') {
      const pos = toPdfCoord(shape.points[0]);
      pdf.setFontSize((shape.fontSize || 24) * scale * 0.3);
      pdf.setTextColor(r, g, b);
      pdf.text(shape.label, pos.x, pos.y, { align: 'center' });
    } else if (shape.type === 'bullet') {
      const pos = toPdfCoord(shape.points[0]);
      const size = (shape.fontSize || 24) * scale * 0.3;

      pdf.circle(pos.x, pos.y, size / 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(size * 0.6);
      pdf.text(shape.bulletLabel || '', pos.x, pos.y, { align: 'center', baseline: 'middle' });
    } else if (shape.type === 'axis' && shape.axisConfig) {
      const { lines, labels } = getAxisSystemPoints(shape.points[0], shape.points[1], shape.axisConfig, pixelsPerMeter);

      pdf.setLineWidth(0.3 * scale);
      pdf.setLineDashPattern([2, 2], 0);

      for (const [p1, p2] of lines) {
        const pdfP1 = toPdfCoord(p1);
        const pdfP2 = toPdfCoord(p2);
        pdf.line(pdfP1.x, pdfP1.y, pdfP2.x, pdfP2.y);
      }

      pdf.setLineDashPattern([], 0);

      for (const label of labels) {
        const pdfPos = toPdfCoord(label.pos);
        pdf.setFillColor(255, 255, 255);
        pdf.circle(pdfPos.x, pdfPos.y, 3 * scale, 'FD');
        pdf.setTextColor(r, g, b);
        pdf.setFontSize(6 * scale);
        pdf.text(label.text, pdfPos.x, pdfPos.y, { align: 'center', baseline: 'middle' });
      }
    }
  }

  // Add footer if requested
  if (options.includeFooter) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, pageHeight - margin - footerSpace, pageWidth - margin, pageHeight - margin - footerSpace);

    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Leht: ${sheet.name}`, margin, pageHeight - margin);

    if (pixelsPerMeter) {
      pdf.text(`Mõõtkava: 1px = ${(1000/pixelsPerMeter).toFixed(2)}mm`, pageWidth / 2, pageHeight - margin, { align: 'center' });
    }

    pdf.text(`Loodud: Visual Mapper`, pageWidth - margin, pageHeight - margin, { align: 'right' });
  }

  return pdf.output('blob');
};


// ============================================
// DXF EXPORT (for Trimble Connect)
// ============================================

export interface DxfExportOptions {
  sheet: Sheet;
  pixelsPerMeter: number | null;
  useWorldCoordinates: boolean;
  includeLabels: boolean;
  includeMeasurements: boolean;
  layerPrefix?: string;
}

const formatDxfNumber = (n: number): string => {
  return n.toFixed(6);
};

// Generate a unique handle for DXF entities
let dxfHandleCounter = 100;
const getHandle = (): string => {
  return (dxfHandleCounter++).toString(16).toUpperCase();
};

const resetHandleCounter = () => {
  dxfHandleCounter = 100;
};

export const exportToDxf = (options: DxfExportOptions): string => {
  const { sheet, pixelsPerMeter, useWorldCoordinates, includeLabels, includeMeasurements, layerPrefix = '' } = options;

  resetHandleCounter();

  const shapes = sheet.shapes.filter(s => s.visible !== false);
  const coordRefs = sheet.coordRefs;

  // Coordinate transformation function
  const transformPoint = (p: Point): { x: number; y: number; z: number } => {
    if (useWorldCoordinates && coordRefs.length === 2) {
      const world = transformPointToWorld(p, coordRefs[0], coordRefs[1]);
      return { x: world.x, y: world.y, z: world.z || 0 };
    } else if (pixelsPerMeter) {
      // Convert pixels to meters (standard coordinate system)
      return {
        x: p.x / pixelsPerMeter,
        y: -p.y / pixelsPerMeter, // Flip Y for CAD coordinate system
        z: 0
      };
    } else {
      // Use pixels as-is but flip Y
      return { x: p.x, y: -p.y, z: 0 };
    }
  };

  // Collect all points for bounding box
  let allPoints: { x: number; y: number }[] = [];
  for (const shape of shapes) {
    for (const p of shape.points) {
      const tp = transformPoint(p);
      allPoints.push({ x: tp.x, y: tp.y });
    }
  }

  if (allPoints.length === 0) {
    allPoints = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
  }

  const minX = Math.min(...allPoints.map(p => p.x)) - 10;
  const minY = Math.min(...allPoints.map(p => p.y)) - 10;
  const maxX = Math.max(...allPoints.map(p => p.x)) + 10;
  const maxY = Math.max(...allPoints.map(p => p.y)) + 10;

  // Define layers with colors (AutoCAD color indices)
  const layerDefs = [
    { name: `${layerPrefix}AREAS`, color: 1 },      // Red
    { name: `${layerPrefix}LINES`, color: 3 },      // Green
    { name: `${layerPrefix}AXES`, color: 5 },       // Blue
    { name: `${layerPrefix}LABELS`, color: 7 },     // White
    { name: `${layerPrefix}DIMENSIONS`, color: 4 }, // Cyan
    { name: '0', color: 7 }                          // Default layer
  ];

  // Build DXF content - Using R12 format for maximum compatibility
  let dxf = '';

  // ===== HEADER SECTION =====
  dxf += `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
${formatDxfNumber(minX)}
20
${formatDxfNumber(minY)}
30
0.0
9
$EXTMAX
10
${formatDxfNumber(maxX)}
20
${formatDxfNumber(maxY)}
30
0.0
9
$LIMMIN
10
${formatDxfNumber(minX)}
20
${formatDxfNumber(minY)}
9
$LIMMAX
10
${formatDxfNumber(maxX)}
20
${formatDxfNumber(maxY)}
0
ENDSEC
`;

  // ===== TABLES SECTION =====
  dxf += `0
SECTION
2
TABLES
0
TABLE
2
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
0
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
0
TABLE
2
LAYER
70
${layerDefs.length}
`;

  for (const layer of layerDefs) {
    dxf += `0
LAYER
2
${layer.name}
70
0
62
${layer.color}
6
CONTINUOUS
`;
  }

  dxf += `0
ENDTAB
0
TABLE
2
STYLE
70
1
0
STYLE
2
STANDARD
70
0
40
0.0
41
1.0
50
0.0
71
0
42
0.2
3
txt
4

0
ENDTAB
0
ENDSEC
`;

  // ===== BLOCKS SECTION (required even if empty) =====
  dxf += `0
SECTION
2
BLOCKS
0
ENDSEC
`;

  // ===== ENTITIES SECTION =====
  dxf += `0
SECTION
2
ENTITIES
`;

  // Process shapes
  for (const shape of shapes) {
    const layer = `${layerPrefix}${getShapeLayer(shape.type)}`;

    if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle') {
      const points = shape.points.map(transformPoint);

      // Draw polyline (using 3D polyline for R12 compatibility)
      dxf += `0
POLYLINE
8
${layer}
66
1
70
1
`;

      for (const p of points) {
        dxf += `0
VERTEX
8
${layer}
10
${formatDxfNumber(p.x)}
20
${formatDxfNumber(p.y)}
30
0.0
`;
      }

      dxf += `0
SEQEND
8
${layer}
`;

      // Add label
      if (includeLabels && shape.label) {
        const centroid = getCentroid(shape.points);
        const tc = transformPoint(centroid);
        const textHeight = pixelsPerMeter ? 0.3 : 20;
        dxf += createDxfText(tc, shape.label, textHeight, `${layerPrefix}LABELS`);
      }

      // Add measurements
      if (includeMeasurements && pixelsPerMeter) {
        const centroid = getCentroid(shape.points);
        const tc = transformPoint(centroid);

        if (shape.showArea) {
          const areaPx = getPolygonArea(shape.points);
          const areaM2 = areaPx / (pixelsPerMeter * pixelsPerMeter);
          const textHeight = pixelsPerMeter ? 0.2 : 15;
          dxf += createDxfText({ x: tc.x, y: tc.y - textHeight * 2, z: 0 }, `${areaM2.toFixed(2)} m2`, textHeight, `${layerPrefix}DIMENSIONS`);
        }

        if (shape.showPerimeter) {
          const perimPx = getPolygonPerimeter(shape.points);
          const perimM = perimPx / pixelsPerMeter;
          const textHeight = pixelsPerMeter ? 0.2 : 15;
          dxf += createDxfText({ x: tc.x, y: tc.y - textHeight * 4, z: 0 }, `P: ${perimM.toFixed(2)} m`, textHeight, `${layerPrefix}DIMENSIONS`);
        }
      }
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      const [p1, p2] = shape.points.map(transformPoint);
      dxf += createDxfLine(p1, p2, layer);

      // Add measurement for lines
      if (includeMeasurements && pixelsPerMeter && shape.type === 'line') {
        const mid = getMidpoint(shape.points[0], shape.points[1]);
        const tm = transformPoint(mid);
        const dist = getDistance(shape.points[0], shape.points[1]) / pixelsPerMeter;
        const textHeight = pixelsPerMeter ? 0.15 : 10;
        dxf += createDxfText(tm, `${dist.toFixed(2)} m`, textHeight, `${layerPrefix}DIMENSIONS`);
      }
    } else if (shape.type === 'circle') {
      const center = transformPoint(shape.points[0]);
      const edge = transformPoint(shape.points[1]);
      const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
      dxf += createDxfCircle(center, radius, layer);
    } else if (shape.type === 'text') {
      const pos = transformPoint(shape.points[0]);
      const textHeight = (shape.fontSize || 24) / (pixelsPerMeter || 100);
      dxf += createDxfText(pos, shape.label, textHeight, `${layerPrefix}LABELS`);
    } else if (shape.type === 'axis' && shape.axisConfig) {
      const { lines, labels } = getAxisSystemPoints(shape.points[0], shape.points[1], shape.axisConfig, pixelsPerMeter);

      for (const [p1, p2] of lines) {
        const tp1 = transformPoint(p1);
        const tp2 = transformPoint(p2);
        dxf += createDxfLine(tp1, tp2, `${layerPrefix}AXES`);
      }

      if (includeLabels) {
        for (const label of labels) {
          const tp = transformPoint(label.pos);
          const textHeight = pixelsPerMeter ? 0.2 : 15;
          dxf += createDxfText(tp, label.text, textHeight, `${layerPrefix}LABELS`);
        }
      }
    } else if (shape.type === 'bullet') {
      const pos = transformPoint(shape.points[0]);
      const radius = ((shape.fontSize || 24) / 2) / (pixelsPerMeter || 100);
      dxf += createDxfCircle(pos, radius, layer);

      if (includeLabels && shape.bulletLabel) {
        const textHeight = ((shape.fontSize || 24) * 0.6) / (pixelsPerMeter || 100);
        dxf += createDxfText(pos, shape.bulletLabel, textHeight, `${layerPrefix}LABELS`);
      }
    }
  }

  // Add coordinate reference points if using world coordinates
  if (useWorldCoordinates && coordRefs.length === 2) {
    for (const ref of coordRefs) {
      const tp = transformPoint(ref.pixel);
      dxf += createDxfCircle(tp, 0.5, `${layerPrefix}DIMENSIONS`);
      dxf += createDxfText({ x: tp.x + 0.6, y: tp.y, z: 0 }, `REF${ref.id}: (${ref.world.x.toFixed(3)}, ${ref.world.y.toFixed(3)})`, 0.2, `${layerPrefix}DIMENSIONS`);
    }
  }

  // ===== END SECTION =====
  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
};

// Helper functions for DXF entities
const createDxfLine = (p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }, layer: string): string => {
  return `0
LINE
8
${layer}
10
${formatDxfNumber(p1.x)}
20
${formatDxfNumber(p1.y)}
30
${formatDxfNumber(p1.z || 0)}
11
${formatDxfNumber(p2.x)}
21
${formatDxfNumber(p2.y)}
31
${formatDxfNumber(p2.z || 0)}
`;
};

const createDxfCircle = (center: { x: number; y: number; z?: number }, radius: number, layer: string): string => {
  return `0
CIRCLE
8
${layer}
10
${formatDxfNumber(center.x)}
20
${formatDxfNumber(center.y)}
30
${formatDxfNumber(center.z || 0)}
40
${formatDxfNumber(radius)}
`;
};

const createDxfText = (pos: { x: number; y: number; z?: number }, text: string, height: number, layer: string): string => {
  // Escape special characters for DXF
  const escapedText = text.replace(/\\/g, '\\\\').replace(/\n/g, '\\P');

  return `0
TEXT
8
${layer}
10
${formatDxfNumber(pos.x)}
20
${formatDxfNumber(pos.y)}
30
${formatDxfNumber(pos.z || 0)}
40
${formatDxfNumber(height)}
1
${escapedText}
72
1
11
${formatDxfNumber(pos.x)}
21
${formatDxfNumber(pos.y)}
31
${formatDxfNumber(pos.z || 0)}
73
2
`;
};

const getShapeLayer = (type: string): string => {
  switch (type) {
    case 'polygon':
    case 'rectangle':
    case 'square':
    case 'triangle':
    case 'circle':
      return 'AREAS';
    case 'line':
    case 'arrow':
      return 'LINES';
    case 'axis':
      return 'AXES';
    case 'text':
    case 'bullet':
    case 'callout':
      return 'LABELS';
    default:
      return 'AREAS';
  }
};


// ============================================
// GeoJSON EXPORT (alternative for web GIS)
// ============================================

export interface GeoJsonExportOptions {
  sheet: Sheet;
  pixelsPerMeter: number | null;
  useWorldCoordinates: boolean;
}

export const exportToGeoJson = (options: GeoJsonExportOptions): object => {
  const { sheet, pixelsPerMeter, useWorldCoordinates } = options;
  const coordRefs = sheet.coordRefs;

  const transformPoint = (p: Point): [number, number] => {
    if (useWorldCoordinates && coordRefs.length === 2) {
      const world = transformPointToWorld(p, coordRefs[0], coordRefs[1]);
      return [world.x, world.y];
    } else if (pixelsPerMeter) {
      return [p.x / pixelsPerMeter, -p.y / pixelsPerMeter];
    } else {
      return [p.x, -p.y];
    }
  };

  const features: object[] = [];

  for (const shape of sheet.shapes) {
    if (shape.visible === false) continue;

    let geometry: object | null = null;
    const properties: Record<string, unknown> = {
      id: shape.id,
      type: shape.type,
      label: shape.label,
      color: shape.color
    };

    if (pixelsPerMeter) {
      if (shape.showArea && (shape.type === 'polygon' || shape.type === 'rectangle')) {
        const areaPx = getPolygonArea(shape.points);
        properties.area_m2 = areaPx / (pixelsPerMeter * pixelsPerMeter);
      }
      if (shape.showPerimeter && (shape.type === 'polygon' || shape.type === 'rectangle')) {
        const perimPx = getPolygonPerimeter(shape.points);
        properties.perimeter_m = perimPx / pixelsPerMeter;
      }
    }

    if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle') {
      const coords = shape.points.map(transformPoint);
      coords.push(coords[0]); // Close the polygon
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      };
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      geometry = {
        type: 'LineString',
        coordinates: shape.points.map(transformPoint)
      };

      if (pixelsPerMeter) {
        properties.length_m = getDistance(shape.points[0], shape.points[1]) / pixelsPerMeter;
      }
    } else if (shape.type === 'circle') {
      // GeoJSON doesn't have native circle, use center point with radius property
      geometry = {
        type: 'Point',
        coordinates: transformPoint(shape.points[0])
      };

      if (pixelsPerMeter) {
        const radiusPx = getDistance(shape.points[0], shape.points[1]);
        properties.radius_m = radiusPx / pixelsPerMeter;
      }
    } else if (shape.type === 'text' || shape.type === 'bullet' || shape.type === 'icon') {
      geometry = {
        type: 'Point',
        coordinates: transformPoint(shape.points[0])
      };

      if (shape.type === 'bullet') {
        properties.bulletLabel = shape.bulletLabel;
      }
      if (shape.type === 'icon') {
        properties.iconName = shape.iconName;
      }
    }

    if (geometry) {
      features.push({
        type: 'Feature',
        properties,
        geometry
      });
    }
  }

  return {
    type: 'FeatureCollection',
    name: sheet.title || 'Visual Mapper Export',
    crs: useWorldCoordinates && coordRefs.length === 2 ? {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:EPSG::3301' // Estonian coordinate system (L-EST97)
      }
    } : null,
    features
  };
};


// ============================================
// PNG EXPORT (improved)
// ============================================

export interface PngExportOptions {
  sheet: Sheet;
  image: HTMLImageElement;
  svgElement: SVGSVGElement;
  quality?: number;
}

export const exportToPng = async (options: PngExportOptions): Promise<Blob> => {
  const { sheet, image, svgElement, quality = 1 } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas konteksti loomine ebaonnestus'));
      return;
    }

    // Draw background image
    ctx.drawImage(image, 0, 0);

    // Clone and prepare SVG
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('width', image.naturalWidth.toString());
    svgClone.setAttribute('height', image.naturalHeight.toString());
    svgClone.setAttribute('viewBox', `0 0 ${image.naturalWidth} ${image.naturalHeight}`);

    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const svgImg = new Image();
    svgImg.onload = () => {
      ctx.drawImage(svgImg, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('PNG loomine ebaonnestus'));
        }
      }, 'image/png', quality);
    };

    svgImg.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG pildi laadimine ebaonnestus'));
    };

    svgImg.src = url;
  });
};


// ============================================
// IFC EXPORT (for Trimble Connect / BIM)
// ============================================

export interface IfcExportOptions {
  sheet: Sheet;
  pixelsPerMeter: number | null;
  useWorldCoordinates: boolean;
  projectName?: string;
  siteName?: string;
  buildingName?: string;
  floorName?: string;
  floorElevation?: number;
  imageFileName?: string; // Name of the background image file
  includeImage?: boolean;
}

const generateIfcGuid = (): string => {
  // Generate IFC-compatible GUID (22 character base64)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let result = '';
  for (let i = 0; i < 22; i++) {
    result += chars[Math.floor(Math.random() * 64)];
  }
  return result;
};

const formatIfcFloat = (n: number): string => n.toFixed(6);

// Convert hex color to RGB values (0-1 range)
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }
  return { r: 0.5, g: 0.5, b: 0.5 };
};

export const exportToIfc = (options: IfcExportOptions): string => {
  const {
    sheet,
    pixelsPerMeter,
    useWorldCoordinates,
    projectName = 'Visual Mapper Project',
    siteName = 'Site',
    buildingName = 'Building',
    floorName = sheet.floor || 'Floor',
    floorElevation = 0,
    imageFileName = 'background.png',
    includeImage = true
  } = options;

  const coordRefs = sheet.coordRefs;
  const shapes = sheet.shapes.filter(s => s.visible !== false);

  // Coordinate transformation
  const transformPoint = (p: Point): { x: number; y: number; z: number } => {
    if (useWorldCoordinates && coordRefs.length === 2) {
      const world = transformPointToWorld(p, coordRefs[0], coordRefs[1]);
      return { x: world.x, y: world.y, z: world.z || floorElevation };
    } else if (pixelsPerMeter) {
      return {
        x: p.x / pixelsPerMeter,
        y: -p.y / pixelsPerMeter,
        z: floorElevation
      };
    } else {
      return { x: p.x / 1000, y: -p.y / 1000, z: floorElevation };
    }
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = new Date().toISOString().split('T')[0];

  // Build IFC content
  let entityId = 1;
  const entities: string[] = [];

  // Header section
  const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${sheet.title || 'export'}.ifc','${dateStr}',('Visual Mapper'),(''),'',' ','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;

DATA;
`;

  // Add basic required entities
  const personId = entityId++;
  entities.push(`#${personId}=IFCPERSON($,$,'Visual Mapper',$,$,$,$,$);`);

  const orgId = entityId++;
  entities.push(`#${orgId}=IFCORGANIZATION($,'Visual Mapper','Visual Mapper Application',$,$);`);

  const personOrgId = entityId++;
  entities.push(`#${personOrgId}=IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);`);

  const appId = entityId++;
  entities.push(`#${appId}=IFCAPPLICATION(#${orgId},'1.0','Visual Mapper','VisualMapper');`);

  const ownerHistoryId = entityId++;
  entities.push(`#${ownerHistoryId}=IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,$,#${personOrgId},#${appId},${timestamp});`);

  // Unit assignments
  const lengthUnitId = entityId++;
  entities.push(`#${lengthUnitId}=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`);

  const areaUnitId = entityId++;
  entities.push(`#${areaUnitId}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);

  const volumeUnitId = entityId++;
  entities.push(`#${volumeUnitId}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);`);

  const angleUnitId = entityId++;
  entities.push(`#${angleUnitId}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);`);

  const unitAssignId = entityId++;
  entities.push(`#${unitAssignId}=IFCUNITASSIGNMENT((#${lengthUnitId},#${areaUnitId},#${volumeUnitId},#${angleUnitId}));`);

  // Geometric context
  const originId = entityId++;
  entities.push(`#${originId}=IFCCARTESIANPOINT((0.,0.,0.));`);

  const dirZId = entityId++;
  entities.push(`#${dirZId}=IFCDIRECTION((0.,0.,1.));`);

  const dirXId = entityId++;
  entities.push(`#${dirXId}=IFCDIRECTION((1.,0.,0.));`);

  const axis2PlacementId = entityId++;
  entities.push(`#${axis2PlacementId}=IFCAXIS2PLACEMENT3D(#${originId},#${dirZId},#${dirXId});`);

  const geomContextId = entityId++;
  entities.push(`#${geomContextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${axis2PlacementId},$);`);

  const geomSubContextId = entityId++;
  entities.push(`#${geomSubContextId}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${geomContextId},$,.MODEL_VIEW.,$);`);

  // Project
  const projectGuid = generateIfcGuid();
  const projectId = entityId++;
  entities.push(`#${projectId}=IFCPROJECT('${projectGuid}',#${ownerHistoryId},'${projectName}',$,$,$,$,(#${geomContextId}),#${unitAssignId});`);

  // Site placement
  const sitePlacementId = entityId++;
  entities.push(`#${sitePlacementId}=IFCLOCALPLACEMENT($,#${axis2PlacementId});`);

  // Site
  const siteGuid = generateIfcGuid();
  const siteId = entityId++;
  entities.push(`#${siteId}=IFCSITE('${siteGuid}',#${ownerHistoryId},'${siteName}',$,$,#${sitePlacementId},$,$,.ELEMENT.,$,$,$,$,$);`);

  // Building placement
  const buildingPlacementId = entityId++;
  entities.push(`#${buildingPlacementId}=IFCLOCALPLACEMENT(#${sitePlacementId},#${axis2PlacementId});`);

  // Building
  const buildingGuid = generateIfcGuid();
  const buildingId = entityId++;
  entities.push(`#${buildingId}=IFCBUILDING('${buildingGuid}',#${ownerHistoryId},'${buildingName}',$,$,#${buildingPlacementId},$,$,.ELEMENT.,$,$,$);`);

  // Storey placement
  const storeyOriginId = entityId++;
  entities.push(`#${storeyOriginId}=IFCCARTESIANPOINT((0.,0.,${formatIfcFloat(floorElevation * 1000)}));`);

  const storeyAxis2PlacementId = entityId++;
  entities.push(`#${storeyAxis2PlacementId}=IFCAXIS2PLACEMENT3D(#${storeyOriginId},#${dirZId},#${dirXId});`);

  const storeyPlacementId = entityId++;
  entities.push(`#${storeyPlacementId}=IFCLOCALPLACEMENT(#${buildingPlacementId},#${storeyAxis2PlacementId});`);

  // Building Storey
  const storeyGuid = generateIfcGuid();
  const storeyId = entityId++;
  entities.push(`#${storeyId}=IFCBUILDINGSTOREY('${storeyGuid}',#${ownerHistoryId},'${floorName}',$,$,#${storeyPlacementId},$,$,.ELEMENT.,${formatIfcFloat(floorElevation * 1000)});`);

  // Aggregation relationships
  const relSiteId = entityId++;
  entities.push(`#${relSiteId}=IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${projectId},(#${siteId}));`);

  const relBuildingId = entityId++;
  entities.push(`#${relBuildingId}=IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${siteId},(#${buildingId}));`);

  const relStoreyId = entityId++;
  entities.push(`#${relStoreyId}=IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerHistoryId},$,$,#${buildingId},(#${storeyId}));`);

  // ============================================
  // ADD BACKGROUND IMAGE AS DOCUMENT REFERENCE
  // ============================================
  if (includeImage && imageFileName) {
    const docInfoId = entityId++;
    entities.push(`#${docInfoId}=IFCDOCUMENTINFORMATION('${generateIfcGuid()}','${imageFileName}','Background floor plan image',$,$,$,$,$,$,$,$,$,$,$,$,$);`);

    const docRefId = entityId++;
    entities.push(`#${docRefId}=IFCDOCUMENTREFERENCE('./${imageFileName}',$,'${imageFileName}');`);

    // Link document to project
    const relDocId = entityId++;
    entities.push(`#${relDocId}=IFCRELASSOCIATESDOCUMENT('${generateIfcGuid()}',#${ownerHistoryId},'Floor Plan Image','Background image for ${floorName}',(#${storeyId}),#${docRefId});`);
  }

  // Create spaces for each polygon/rectangle area
  const spaceIds: number[] = [];
  const styledItemIds: number[] = [];

  for (const shape of shapes) {
    if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square') {
      const spaceGuid = generateIfcGuid();
      const spaceName = shape.label || `Space_${shape.id}`;

      // Transform points to meters (IFC uses mm internally)
      const points = shape.points.map(transformPoint);

      // Calculate area and perimeter
      let areaSqM = 0;
      let perimeterM = 0;
      if (pixelsPerMeter) {
        const areaPx = getPolygonArea(shape.points);
        areaSqM = areaPx / (pixelsPerMeter * pixelsPerMeter);
        const perimPx = getPolygonPerimeter(shape.points);
        perimeterM = perimPx / pixelsPerMeter;
      }

      // Create polyline for the space boundary
      const polylinePointIds: number[] = [];
      for (const pt of points) {
        const ptId = entityId++;
        entities.push(`#${ptId}=IFCCARTESIANPOINT((${formatIfcFloat(pt.x * 1000)},${formatIfcFloat(pt.y * 1000)}));`);
        polylinePointIds.push(ptId);
      }
      // Close the polyline
      polylinePointIds.push(polylinePointIds[0]);

      const polylineId = entityId++;
      entities.push(`#${polylineId}=IFCPOLYLINE((${polylinePointIds.map(id => '#' + id).join(',')}));`);

      // Create arbitrary closed profile
      const profileId = entityId++;
      entities.push(`#${profileId}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${polylineId});`);

      // Extrude direction (up)
      const extrudeDirId = entityId++;
      entities.push(`#${extrudeDirId}=IFCDIRECTION((0.,0.,1.));`);

      // Create extruded area solid (height = 100mm for visualization)
      const solidId = entityId++;
      entities.push(`#${solidId}=IFCEXTRUDEDAREASOLID(#${profileId},#${axis2PlacementId},#${extrudeDirId},100.);`);

      // ============================================
      // ADD COLOR STYLING (IFC2X3 compatible)
      // ============================================
      const rgb = hexToRgb(shape.color || '#888888');

      const colorId = entityId++;
      entities.push(`#${colorId}=IFCCOLOURRGB($,${formatIfcFloat(rgb.r)},${formatIfcFloat(rgb.g)},${formatIfcFloat(rgb.b)});`);

      // Surface style with shading (more compatible than rendering)
      const surfaceShadingId = entityId++;
      entities.push(`#${surfaceShadingId}=IFCSURFACESTYLESHADING(#${colorId});`);

      const surfaceStyleId = entityId++;
      entities.push(`#${surfaceStyleId}=IFCSURFACESTYLE('${spaceName}',.BOTH.,(#${surfaceShadingId}));`);

      // Presentation style assignment (required by many viewers)
      const presStyleId = entityId++;
      entities.push(`#${presStyleId}=IFCPRESENTATIONSTYLEASSIGNMENT((#${surfaceStyleId}));`);

      const styledItemId = entityId++;
      entities.push(`#${styledItemId}=IFCSTYLEDITEM(#${solidId},(#${presStyleId}),$);`);
      styledItemIds.push(styledItemId);

      // Shape representation
      const shapeRepId = entityId++;
      entities.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${geomSubContextId},'Body','SweptSolid',(#${solidId}));`);

      const prodDefShapeId = entityId++;
      entities.push(`#${prodDefShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`);

      // Space placement
      const spacePlacementId = entityId++;
      entities.push(`#${spacePlacementId}=IFCLOCALPLACEMENT(#${storeyPlacementId},#${axis2PlacementId});`);

      // Create space
      const spaceId = entityId++;
      entities.push(`#${spaceId}=IFCSPACE('${spaceGuid}',#${ownerHistoryId},'${spaceName}','${shape.label || ''}',$,#${spacePlacementId},#${prodDefShapeId},$,.ELEMENT.,.INTERNAL.,$);`);
      spaceIds.push(spaceId);

      // ============================================
      // ADD QUANTITIES (Area, Perimeter)
      // ============================================
      const quantities: number[] = [];

      if (areaSqM > 0) {
        const areaQtyId = entityId++;
        entities.push(`#${areaQtyId}=IFCQUANTITYAREA('GrossFloorArea','Gross floor area of the space',$,${formatIfcFloat(areaSqM)},$);`);
        quantities.push(areaQtyId);

        const netAreaQtyId = entityId++;
        entities.push(`#${netAreaQtyId}=IFCQUANTITYAREA('NetFloorArea','Net floor area of the space',$,${formatIfcFloat(areaSqM)},$);`);
        quantities.push(netAreaQtyId);
      }

      if (perimeterM > 0) {
        const perimQtyId = entityId++;
        entities.push(`#${perimQtyId}=IFCQUANTITYLENGTH('GrossPerimeter','Perimeter of the space',$,${formatIfcFloat(perimeterM)},$);`);
        quantities.push(perimQtyId);
      }

      if (quantities.length > 0) {
        const qtySetId = entityId++;
        entities.push(`#${qtySetId}=IFCELEMENTQUANTITY('${generateIfcGuid()}',#${ownerHistoryId},'Qto_SpaceBaseQuantities','Base quantities for space',$,(${quantities.map(id => '#' + id).join(',')}));`);

        const relQtyId = entityId++;
        entities.push(`#${relQtyId}=IFCRELDEFINESBYPROPERTIES('${generateIfcGuid()}',#${ownerHistoryId},$,$,(#${spaceId}),#${qtySetId});`);
      }

      // ============================================
      // ADD CUSTOM PROPERTIES (Label, Color, etc.)
      // ============================================
      const properties: number[] = [];

      // Label property
      const labelPropId = entityId++;
      entities.push(`#${labelPropId}=IFCPROPERTYSINGLEVALUE('Name','Space name',IFCTEXT('${shape.label || ''}'),$);`);
      properties.push(labelPropId);

      // Color property
      const colorPropId = entityId++;
      entities.push(`#${colorPropId}=IFCPROPERTYSINGLEVALUE('Color','Display color',IFCTEXT('${shape.color || ''}'),$);`);
      properties.push(colorPropId);

      // Area number property
      if (shape.areaNumber) {
        const areaNoPropId = entityId++;
        entities.push(`#${areaNoPropId}=IFCPROPERTYSINGLEVALUE('AreaNumber','Area reference number',IFCINTEGER(${shape.areaNumber}),$);`);
        properties.push(areaNoPropId);
      }

      // Area in m² as text property
      if (areaSqM > 0) {
        const areaTextPropId = entityId++;
        entities.push(`#${areaTextPropId}=IFCPROPERTYSINGLEVALUE('AreaText','Area as text',IFCTEXT('${areaSqM.toFixed(2)} m2'),$);`);
        properties.push(areaTextPropId);
      }

      // Perimeter as text property
      if (perimeterM > 0) {
        const perimTextPropId = entityId++;
        entities.push(`#${perimTextPropId}=IFCPROPERTYSINGLEVALUE('PerimeterText','Perimeter as text',IFCTEXT('${perimeterM.toFixed(2)} m'),$);`);
        properties.push(perimTextPropId);
      }

      const propSetId = entityId++;
      entities.push(`#${propSetId}=IFCPROPERTYSET('${generateIfcGuid()}',#${ownerHistoryId},'VisualMapper_SpaceProperties','Properties from Visual Mapper',(${properties.map(id => '#' + id).join(',')}));`);

      const relPropId = entityId++;
      entities.push(`#${relPropId}=IFCRELDEFINESBYPROPERTIES('${generateIfcGuid()}',#${ownerHistoryId},$,$,(#${spaceId}),#${propSetId});`);

      // ============================================
      // ADD TEXT ANNOTATION FOR SPACE LABEL & AREA
      // ============================================
      const centroid = getCentroid(shape.points);
      const centroidWorld = transformPoint(centroid);

      // Create text content: "Ala 1\n12.50 m²"
      const labelText = shape.label || `Space ${shape.id}`;
      const areaText = areaSqM > 0 ? `${areaSqM.toFixed(2)} m2` : '';
      const fullText = areaText ? `${labelText} - ${areaText}` : labelText;

      // Text literal placement at centroid
      const textPointId = entityId++;
      entities.push(`#${textPointId}=IFCCARTESIANPOINT((${formatIfcFloat(centroidWorld.x * 1000)},${formatIfcFloat(centroidWorld.y * 1000)},50.));`);

      const textAxisId = entityId++;
      entities.push(`#${textAxisId}=IFCAXIS2PLACEMENT3D(#${textPointId},$,$);`);

      const textLiteralId = entityId++;
      entities.push(`#${textLiteralId}=IFCTEXTLITERALWITHEXTENT('${fullText}',#${textAxisId},.LEFT.,(1000.,500.),.BOTTOM_LEFT.);`);

      // Text style
      const textStyleId = entityId++;
      const textRgb = hexToRgb(shape.textColor || '#000000');
      const textColorId = entityId++;
      entities.push(`#${textColorId}=IFCCOLOURRGB($,${formatIfcFloat(textRgb.r)},${formatIfcFloat(textRgb.g)},${formatIfcFloat(textRgb.b)});`);
      entities.push(`#${textStyleId}=IFCTEXTSTYLE($,$,$,#${textColorId});`);

      // Styled representation for text
      const textRepId = entityId++;
      entities.push(`#${textRepId}=IFCSHAPEREPRESENTATION(#${geomSubContextId},'Annotation','Annotation',(#${textLiteralId}));`);

      const textProdDefId = entityId++;
      entities.push(`#${textProdDefId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${textRepId}));`);

      // Create annotation element
      const annotId = entityId++;
      entities.push(`#${annotId}=IFCANNOTATION('${generateIfcGuid()}',#${ownerHistoryId},'${labelText}','${areaText}',$,#${spacePlacementId},#${textProdDefId});`);
    }
  }

  // ============================================
  // ADD MEASUREMENT LINES AS ANNOTATIONS
  // ============================================
  const annotationIds: number[] = [];

  for (const shape of shapes) {
    if (shape.type === 'line' && pixelsPerMeter) {
      const [p1, p2] = shape.points.map(transformPoint);
      const dist = getDistance(shape.points[0], shape.points[1]) / pixelsPerMeter;

      // Create line geometry
      const lineStartId = entityId++;
      entities.push(`#${lineStartId}=IFCCARTESIANPOINT((${formatIfcFloat(p1.x * 1000)},${formatIfcFloat(p1.y * 1000)},0.));`);

      const lineEndId = entityId++;
      entities.push(`#${lineEndId}=IFCCARTESIANPOINT((${formatIfcFloat(p2.x * 1000)},${formatIfcFloat(p2.y * 1000)},0.));`);

      const linePolylineId = entityId++;
      entities.push(`#${linePolylineId}=IFCPOLYLINE((#${lineStartId},#${lineEndId}));`);

      const curveRepId = entityId++;
      entities.push(`#${curveRepId}=IFCSHAPEREPRESENTATION(#${geomSubContextId},'Annotation','Curve2D',(#${linePolylineId}));`);

      const annotProdDefId = entityId++;
      entities.push(`#${annotProdDefId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${curveRepId}));`);

      const annotPlacementId = entityId++;
      entities.push(`#${annotPlacementId}=IFCLOCALPLACEMENT(#${storeyPlacementId},#${axis2PlacementId});`);

      const annotationId = entityId++;
      entities.push(`#${annotationId}=IFCANNOTATION('${generateIfcGuid()}',#${ownerHistoryId},'Measurement','${dist.toFixed(2)} m',$,#${annotPlacementId},#${annotProdDefId});`);
      annotationIds.push(annotationId);

      // Add length property
      const lengthPropId = entityId++;
      entities.push(`#${lengthPropId}=IFCPROPERTYSINGLEVALUE('Length','Measured length',IFCLENGTHMEASURE(${formatIfcFloat(dist * 1000)}),$);`);

      const lengthTextPropId = entityId++;
      entities.push(`#${lengthTextPropId}=IFCPROPERTYSINGLEVALUE('LengthText','Length as text',IFCTEXT('${dist.toFixed(2)} m'),$);`);

      const annotPropSetId = entityId++;
      entities.push(`#${annotPropSetId}=IFCPROPERTYSET('${generateIfcGuid()}',#${ownerHistoryId},'VisualMapper_MeasurementProperties','Measurement properties',(#${lengthPropId},#${lengthTextPropId}));`);

      const relAnnotPropId = entityId++;
      entities.push(`#${relAnnotPropId}=IFCRELDEFINESBYPROPERTIES('${generateIfcGuid()}',#${ownerHistoryId},$,$,(#${annotationId}),#${annotPropSetId});`);
    }
  }

  // Relate spaces to storey
  if (spaceIds.length > 0) {
    const relSpacesId = entityId++;
    entities.push(`#${relSpacesId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateIfcGuid()}',#${ownerHistoryId},'Spaces','Spaces in storey',(${spaceIds.map(id => '#' + id).join(',')}),#${storeyId});`);
  }

  // Relate annotations to storey
  if (annotationIds.length > 0) {
    const relAnnotId = entityId++;
    entities.push(`#${relAnnotId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateIfcGuid()}',#${ownerHistoryId},'Measurements','Measurement annotations',(${annotationIds.map(id => '#' + id).join(',')}),#${storeyId});`);
  }

  // Footer
  const footer = `ENDSEC;
END-ISO-10303-21;
`;

  return header + entities.join('\n') + '\n' + footer;
};
