
import { Point, Shape, CoordinateReference, AxisConfig, GridConfig } from '../types';

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getMidpoint = (p1: Point, p2: Point): Point => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
};

export const toRoman = (num: number): string => {
  const lookup: {value: number, symbol: string}[] = [
    {value: 1000, symbol: 'M'}, {value: 900, symbol: 'CM'}, {value: 500, symbol: 'D'},
    {value: 400, symbol: 'CD'}, {value: 100, symbol: 'C'}, {value: 90, symbol: 'XC'},
    {value: 50, symbol: 'L'}, {value: 40, symbol: 'XL'}, {value: 10, symbol: 'X'},
    {value: 9, symbol: 'IX'}, {value: 5, symbol: 'V'}, {value: 4, symbol: 'IV'}, {value: 1, symbol: 'I'}
  ];
  let roman = '';
  for (const i of lookup) {
    while (num >= i.value) {
      roman += i.symbol;
      num -= i.value;
    }
  }
  return roman;
};

// Check if line segment p1-q1 intersects with p2-q2
const onSegment = (p: Point, q: Point, r: Point) => {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
};

const orientation = (p: Point, q: Point, r: Point) => {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0;
  return (val > 0) ? 1 : 2;
};

export const doLineSegmentsIntersect = (p1: Point, q1: Point, p2: Point, q2: Point): boolean => {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
};

export const checkPolygonSelfIntersection = (points: Point[], nextPoint: Point): boolean => {
    if (points.length < 3) return false;

    // Check if the new segment (points[last] -> nextPoint) intersects any existing segments
    const lastIdx = points.length - 1;
    const p1 = points[lastIdx];
    const q1 = nextPoint;

    // Check if we're closing the polygon (nextPoint is the first point)
    const isClosing = (Math.abs(nextPoint.x - points[0].x) < 0.1 && Math.abs(nextPoint.y - points[0].y) < 0.1);

    // When closing: skip segment 0-1 (shares vertex with closing segment) and last segment
    // When not closing: skip only the last segment (shares vertex with new segment)
    const startIdx = isClosing ? 1 : 0;
    const endIdx = points.length - 2;

    for (let i = startIdx; i < endIdx; i++) {
        const p2 = points[i];
        const q2 = points[i + 1];

        // True intersection test - segments must cross, not just touch at endpoints
        if (segmentsCross(p1, q1, p2, q2)) return true;
    }

    return false;
};

// Check if two segments truly cross (not just touch at endpoints)
const segmentsCross = (a1: Point, a2: Point, b1: Point, b2: Point): boolean => {
    const o1 = orientation(a1, a2, b1);
    const o2 = orientation(a1, a2, b2);
    const o3 = orientation(b1, b2, a1);
    const o4 = orientation(b1, b2, a2);

    // General case: segments cross if orientations differ
    if (o1 !== o2 && o3 !== o4) {
        // But exclude cases where they just touch at a shared vertex
        const eps = 0.1;
        if (Math.abs(a1.x - b1.x) < eps && Math.abs(a1.y - b1.y) < eps) return false;
        if (Math.abs(a1.x - b2.x) < eps && Math.abs(a1.y - b2.y) < eps) return false;
        if (Math.abs(a2.x - b1.x) < eps && Math.abs(a2.y - b1.y) < eps) return false;
        if (Math.abs(a2.x - b2.x) < eps && Math.abs(a2.y - b2.y) < eps) return false;
        return true;
    }

    return false;
};

export const getArrowHeadPoints = (start: Point, end: Point, headSize: number = 20): Point[] => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const p1 = {
    x: end.x - headSize * Math.cos(angle - Math.PI / 6),
    y: end.y - headSize * Math.sin(angle - Math.PI / 6)
  };
  const p2 = {
    x: end.x - headSize * Math.cos(angle + Math.PI / 6),
    y: end.y - headSize * Math.sin(angle + Math.PI / 6)
  };
  return [end, p1, p2];
};

// Find the closest point on a line segment AB from point P
export const getClosestPointOnSegment = (p: Point, a: Point, b: Point): Point => {
  const atob = { x: b.x - a.x, y: b.y - a.y };
  const atop = { x: p.x - a.x, y: p.y - a.y };
  const lenSq = atob.x * atob.x + atob.y * atob.y;
  
  let dot = atop.x * atob.x + atop.y * atob.y;
  let t = lenSq === 0 ? 0 : dot / lenSq;
  
  // Clamp t to segment [0, 1]
  t = Math.max(0, Math.min(1, t));
  
  return {
    x: a.x + atob.x * t,
    y: a.y + atob.y * t
  };
};

// Find closes grid intersection
export const getClosestGridPoint = (p: Point, gridConfig: GridConfig, pixelsPerMeter: number | null): Point | null => {
    if (!gridConfig.visible) return null;
    
    const pxPerMm = pixelsPerMeter ? pixelsPerMeter / 1000 : 1;
    const stepPx = gridConfig.sizeMm * pxPerMm;
    
    if (stepPx < 2) return null; // Avoid tiny grids

    const relX = p.x - gridConfig.offsetX;
    const relY = p.y - gridConfig.offsetY;

    const snapX = Math.round(relX / stepPx) * stepPx + gridConfig.offsetX;
    const snapY = Math.round(relY / stepPx) * stepPx + gridConfig.offsetY;

    return { x: snapX, y: snapY };
};

// Enhanced closest point finder (vertices + edges + grid + axes)
export const getClosestSnapPoint = (
  target: Point, 
  shapes: Shape[], 
  threshold: number,
  gridConfig?: GridConfig,
  pixelsPerMeter?: number | null
): Point | null => {
  let closest: Point | null = null;
  let minDst = threshold;

  // 1. GRID SNAP (Medium Priority)
  if (gridConfig) {
      const gridPoint = getClosestGridPoint(target, gridConfig, pixelsPerMeter || null);
      if (gridPoint) {
          const dGrid = getDistance(target, gridPoint);
          if (dGrid < minDst) {
              minDst = dGrid;
              closest = gridPoint;
          }
      }
  }

  for (const shape of shapes) {
    if (shape.visible === false || shape.locked) continue;

    // Handle Polygons/Rectangles
    if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square') {
        // Vertices & Midpoints (High Priority)
        for (let i = 0; i < shape.points.length; i++) {
            const p1 = shape.points[i];
            const p2 = shape.points[(i + 1) % shape.points.length];
            
            const d1 = getDistance(target, p1);
            if (d1 < minDst) { minDst = d1; closest = p1; }
            
            const mid = getMidpoint(p1, p2);
            const dMid = getDistance(target, mid);
            if (dMid < minDst) { minDst = dMid; closest = mid; }

            // Edges (Low Priority)
            const pEdge = getClosestPointOnSegment(target, p1, p2);
            const dEdge = getDistance(target, pEdge);
            if (dEdge < minDst) { minDst = dEdge; closest = pEdge; }
        }
    }
    
    // Handle Axis Systems (Snap to lines)
    if (shape.type === 'axis' && shape.axisConfig) {
        const { lines } = getAxisSystemPoints(shape.points[0], shape.points[1], shape.axisConfig, pixelsPerMeter || null);
        for (const [p1, p2] of lines) {
            // Check snap to line segment
            const pEdge = getClosestPointOnSegment(target, p1, p2);
            const dEdge = getDistance(target, pEdge);
            if (dEdge < minDst) { minDst = dEdge; closest = pEdge; }
            
            // Check endpoints of axis lines
            const dEnd = getDistance(target, p2);
            if (dEnd < minDst) { minDst = dEnd; closest = p2; }
            const dStart = getDistance(target, p1);
            if (dStart < minDst) { minDst = dStart; closest = p1; }
        }
    }
  }
  
  return closest;
};

// Calculates the delta (dx, dy) needed to snap a set of moving points to static shapes
export const calculateSnapCorrection = (
  movingPoints: Point[],
  staticShapes: Shape[],
  threshold: number
): { delta: Point, snapPoint: Point | null } => {
  let snapX = 0;
  let snapY = 0;
  let minDst = threshold;
  let snapPoint: Point | null = null;
  let foundVertexSnap = false;

  const validStaticShapes = staticShapes.filter(s => s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square');

  // 1. Vertex to Vertex Snapping (Highest Priority)
  for (const mp of movingPoints) {
    for (const shape of validStaticShapes) {
      for (const sp of shape.points) {
        const d = getDistance(mp, sp);
        if (d < minDst) {
          minDst = d;
          snapX = sp.x - mp.x;
          snapY = sp.y - mp.y;
          snapPoint = sp;
          foundVertexSnap = true;
        }
      }
    }
  }

  if (foundVertexSnap) {
    return { delta: { x: snapX, y: snapY }, snapPoint };
  }

  // 2. Vertex to Edge Snapping
  for (const mp of movingPoints) {
    for (const shape of validStaticShapes) {
      for (let i = 0; i < shape.points.length; i++) {
         const p1 = shape.points[i];
         const p2 = shape.points[(i + 1) % shape.points.length];
         
         const closestOnSegment = getClosestPointOnSegment(mp, p1, p2);
         const d = getDistance(mp, closestOnSegment);
         
         if (d < minDst) {
            minDst = d;
            snapX = closestOnSegment.x - mp.x;
            snapY = closestOnSegment.y - mp.y;
            snapPoint = closestOnSegment;
         }
      }
    }
  }

  return { delta: { x: snapX, y: snapY }, snapPoint };
};


export const getSnapCandidates = (shapes: Shape[]): Point[] => {
  const points: Point[] = [];
  for (const shape of shapes) {
    if (shape.type !== 'polygon' && shape.type !== 'rectangle') continue;
    for (let i = 0; i < shape.points.length; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[(i + 1) % shape.points.length];
      points.push(p1);
      points.push(getMidpoint(p1, p2));
    }
  }
  return points;
};

// Shoelace formula for polygon area
export const getPolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

export const getPolygonPerimeter = (points: Point[]): number => {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
        perimeter += getDistance(points[i], points[(i + 1) % points.length]);
    }
    return perimeter;
};

export const getCentroid = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (points.length === 2) return getMidpoint(points[0], points[1]);

  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
};

// --- ROTATION HELPERS ---

export const rotatePoint = (p: Point, center: Point, angleRad: number): Point => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos)
  };
};

export const rotatePolygon = (points: Point[], angleRad: number): Point[] => {
  const center = getCentroid(points);
  return points.map(p => rotatePoint(p, center, angleRad));
};

export const getPolygonPrimaryAngle = (points: Point[]): number => {
  let maxLen = 0;
  let angle = 0;
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const len = getDistance(p1, p2);
    if (len > maxLen) {
      maxLen = len;
      angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
  }
  return angle;
};

export const getBoundingBox = (points: Point[]) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

export const pointToLineDistance = (point: Point, start: Point, end: Point) => {
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = start.x;
    yy = start.y;
  } else if (param > 1) {
    xx = end.x;
    yy = end.y;
  } else {
    xx = start.x + param * C;
    yy = start.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getPolygonLabelStats = (points: Point[]) => {
  if (points.length < 3) {
      const c = getCentroid(points);
      return { x: c.x, y: c.y, rotation: 0, maxFontSize: 16, safeWidth: 100, safeHeight: 100 };
  }

  const centroid = getCentroid(points);
  
  let minDistToEdge = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const d = pointToLineDistance(centroid, p1, p2);
    if (d < minDistToEdge) minDistToEdge = d;
  }

  const bbox = getBoundingBox(points);
  const isVertical = bbox.height > bbox.width * 1.2; 
  
  let rotation = 0;
  if (isVertical) {
    rotation = -90; 
  }

  if (points.length >= 3) {
      const angle = getPolygonPrimaryAngle(points) * 180 / Math.PI;
      let normAngle = angle;
      while (normAngle > 90) normAngle -= 180;
      while (normAngle < -90) normAngle += 180;
      
      if (Math.abs(normAngle) < 10) rotation = 0;
      else if (Math.abs(Math.abs(normAngle) - 90) < 10) rotation = -90;
      else rotation = normAngle;
  }

  const padding = 6;
  const safeRadius = Math.max(0, minDistToEdge - padding);
  const maxFontSize = Math.max(8, safeRadius * 1.5); 
  
  return {
    x: centroid.x,
    y: centroid.y,
    rotation,
    maxFontSize,
    safeWidth: safeRadius * 3,
    safeHeight: safeRadius * 1.6
  };
};

export const getAlignmentGuides = (
  activePoints: Point[],
  otherShapes: Shape[],
  threshold: number = 8
) => {
  const activeBBox = getBoundingBox(activePoints);
  const guides: { type: 'x' | 'y'; pos: number }[] = [];
  const delta = { x: 0, y: 0 };

  const validShapes = otherShapes.filter(s => s.type === 'rectangle' || s.type === 'polygon' || s.type === 'square');

  const checkSnap = (val: number, type: 'x' | 'y') => {
    for (const shape of validShapes) {
      const bbox = getBoundingBox(shape.points);
      const targets = type === 'x' 
        ? [bbox.minX, bbox.maxX, bbox.minX + bbox.width / 2] 
        : [bbox.minY, bbox.maxY, bbox.minY + bbox.height / 2];
      
      for (const t of targets) {
        if (Math.abs(val - t) < threshold) {
          guides.push({ type, pos: t });
          return t - val;
        }
      }
    }
    return 0;
  };

  delta.x = checkSnap(activeBBox.minX, 'x') || checkSnap(activeBBox.maxX, 'x') || 0;
  delta.y = checkSnap(activeBBox.minY, 'y') || checkSnap(activeBBox.maxY, 'y') || 0;

  return { delta, guides };
};

export const constrainPoint = (start: Point, current: Point, isShift: boolean) => {
  if (!isShift) return current;
  const dx = Math.abs(current.x - start.x);
  const dy = Math.abs(current.y - start.y);
  
  // Also support diagonal 45 degrees
  if (Math.abs(dx - dy) < Math.max(dx, dy) * 0.2) {
      const dist = (dx + dy) / 2;
      const signX = current.x > start.x ? 1 : -1;
      const signY = current.y > start.y ? 1 : -1;
      return { x: start.x + dist * signX, y: start.y + dist * signY };
  }

  if (dx > dy) {
    return { x: current.x, y: start.y };
  } else {
    return { x: start.x, y: current.y };
  }
};

export const transformPointToWorld = (
    pixelPoint: Point, 
    ref1: CoordinateReference, 
    ref2: CoordinateReference
): { x: number, y: number, z?: number } => {
    
    const dPx = ref2.pixel.x - ref1.pixel.x;
    const dPy = ref2.pixel.y - ref1.pixel.y;
    const distPx = Math.sqrt(dPx*dPx + dPy*dPy);

    const dWx = ref2.world.x - ref1.world.x;
    const dWy = ref2.world.y - ref1.world.y;
    const distW = Math.sqrt(dWx*dWx + dWy*dWy);

    if (distPx === 0) return { x: 0, y: 0 };

    const scale = distW / distPx;

    const anglePx = Math.atan2(dPy, dPx);
    const angleW = Math.atan2(dWy, dWx);
    const rotation = angleW - anglePx;

    const relX = pixelPoint.x - ref1.pixel.x;
    const relY = pixelPoint.y - ref1.pixel.y;

    const rotatedX = (relX * Math.cos(rotation) - relY * Math.sin(rotation)) * scale;
    const rotatedY = (relX * Math.sin(rotation) + relY * Math.cos(rotation)) * scale;

    let z: number | undefined;
    if (ref1.world.z !== undefined && ref2.world.z !== undefined) {
        const dot = relX * dPx + relY * dPy;
        const lenSq = dPx*dPx + dPy*dPy;
        const t = lenSq > 0 ? dot / lenSq : 0;
        z = ref1.world.z + t * (ref2.world.z - ref1.world.z);
    } else if (ref1.world.z !== undefined) {
        z = ref1.world.z;
    } else if (ref2.world.z !== undefined) {
        z = ref2.world.z;
    }

    return {
        x: rotatedX + ref1.world.x,
        y: rotatedY + ref1.world.y,
        z
    };
};

export const isPointInPolygon = (p: Point, polygon: Point[]) => {
  let isInside = false;
  let minX = polygon[0].x, maxX = polygon[0].x;
  let minY = polygon[0].y, maxY = polygon[0].y;
  for (const q of polygon) {
    minX = Math.min(q.x, minX);
    maxX = Math.max(q.x, maxX);
    minY = Math.min(q.y, minY);
    maxY = Math.max(q.y, maxY);
  }

  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
    return false;
  }

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if ( (polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
        p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
      isInside = !isInside;
    }
  }
  return isInside;
};

export const scalePolygon = (points: Point[], scale: number): Point[] => {
  const center = getCentroid(points);
  return points.map(p => ({
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale
  }));
};

export const doPolygonsIntersect = (poly1: Point[], poly2: Point[]) => {
  // Use a slight shrink to allow shared edges (touching) but catch actual overlap
  const p1 = scalePolygon(poly1, 0.999);
  const p2 = scalePolygon(poly2, 0.999);

  for (let i = 0; i < p1.length; i++) {
    const a = p1[i];
    const b = p1[(i + 1) % p1.length];
    for (let j = 0; j < p2.length; j++) {
      const c = p2[j];
      const d = p2[(j + 1) % p2.length];
      
      const o1 = orientation(a, b, c);
      const o2 = orientation(a, b, d);
      const o3 = orientation(c, d, a);
      const o4 = orientation(c, d, b);

      // Strict intersection test - excludes touching endpoints
      if (o1 !== o2 && o3 !== o4) {
          // Double check if it's just a vertex touch (rare with shrink, but possible)
          return true;
      }
    }
  }
  
  if (isPointInPolygon(p1[0], p2)) return true;
  if (isPointInPolygon(p2[0], p1)) return true;

  return false;
};

// Calculate Minimum Translation Vector to separate overlapping polygons
// Uses Separating Axis Theorem (SAT) to find the smallest displacement
export const calculateMTV = (movingPoly: Point[], staticPoly: Point[]): Point | null => {
  const getEdges = (poly: Point[]): Point[] => {
    const edges: Point[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      edges.push({ x: p2.x - p1.x, y: p2.y - p1.y });
    }
    return edges;
  };

  const normalize = (v: Point): Point => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  };

  const perpendicular = (v: Point): Point => ({ x: -v.y, y: v.x });

  const projectPolygon = (poly: Point[], axis: Point): { min: number; max: number } => {
    let min = poly[0].x * axis.x + poly[0].y * axis.y;
    let max = min;
    for (let i = 1; i < poly.length; i++) {
      const proj = poly[i].x * axis.x + poly[i].y * axis.y;
      if (proj < min) min = proj;
      if (proj > max) max = proj;
    }
    return { min, max };
  };

  const edges1 = getEdges(movingPoly);
  const edges2 = getEdges(staticPoly);
  const allEdges = [...edges1, ...edges2];

  let minOverlap = Infinity;
  let mtvAxis: Point | null = null;

  for (const edge of allEdges) {
    const axis = normalize(perpendicular(edge));
    if (axis.x === 0 && axis.y === 0) continue;

    const proj1 = projectPolygon(movingPoly, axis);
    const proj2 = projectPolygon(staticPoly, axis);

    // Check for gap (no overlap on this axis means no collision)
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
      return null; // No overlap, polygons are separated
    }

    // Calculate overlap amount
    const overlap = Math.min(proj1.max - proj2.min, proj2.max - proj1.min);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }

  if (!mtvAxis) return null;

  // Determine direction: MTV should push movingPoly away from staticPoly
  const movingCenter = getCentroid(movingPoly);
  const staticCenter = getCentroid(staticPoly);
  const centerToCenter = { x: movingCenter.x - staticCenter.x, y: movingCenter.y - staticCenter.y };
  const dot = centerToCenter.x * mtvAxis.x + centerToCenter.y * mtvAxis.y;

  // No buffer - areas should touch exactly at their edges
  if (dot < 0) {
    return { x: -mtvAxis.x * minOverlap, y: -mtvAxis.y * minOverlap };
  } else {
    return { x: mtvAxis.x * minOverlap, y: mtvAxis.y * minOverlap };
  }
};

// Snap polygon vertices to nearby edges of static polygons for precise alignment
const snapVerticesToEdges = (poly: Point[], staticPolygons: Point[][], threshold: number = 3): Point[] => {
  return poly.map(vertex => {
    let closestDist = threshold;
    let snappedPoint = vertex;

    for (const staticPoly of staticPolygons) {
      // Check snap to vertices
      for (const staticVertex of staticPoly) {
        const dist = Math.sqrt(Math.pow(vertex.x - staticVertex.x, 2) + Math.pow(vertex.y - staticVertex.y, 2));
        if (dist < closestDist) {
          closestDist = dist;
          snappedPoint = { ...staticVertex };
        }
      }

      // Check snap to edges
      for (let i = 0; i < staticPoly.length; i++) {
        const p1 = staticPoly[i];
        const p2 = staticPoly[(i + 1) % staticPoly.length];
        const closestOnEdge = getClosestPointOnSegment(vertex, p1, p2);
        const dist = Math.sqrt(Math.pow(vertex.x - closestOnEdge.x, 2) + Math.pow(vertex.y - closestOnEdge.y, 2));
        if (dist < closestDist) {
          closestDist = dist;
          snappedPoint = closestOnEdge;
        }
      }
    }

    return snappedPoint;
  });
};

// Resolve all overlaps by calculating combined MTV for a polygon against multiple static polygons
export const resolveAllOverlaps = (movingPoly: Point[], staticPolygons: Point[][]): Point[] => {
  let currentPoly = [...movingPoly.map(p => ({ ...p }))];
  const maxIterations = 10; // Prevent infinite loops

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasOverlap = false;

    for (const staticPoly of staticPolygons) {
      if (doPolygonsIntersect(currentPoly, staticPoly)) {
        hasOverlap = true;
        const mtv = calculateMTV(currentPoly, staticPoly);
        if (mtv) {
          // Apply translation
          currentPoly = currentPoly.map(p => ({
            x: p.x + mtv.x,
            y: p.y + mtv.y
          }));
        }
      }
    }

    if (!hasOverlap) break;
  }

  // After resolving overlaps, snap vertices to nearby edges for precise alignment
  currentPoly = snapVerticesToEdges(currentPoly, staticPolygons, 5);

  return currentPoly;
};

export const getNextLabel = (startLabel: string, index: number, reverse: boolean) => {
    const isNumber = !isNaN(parseInt(startLabel));
    const step = reverse ? -index : index;
    
    if (isNumber) {
        return (parseInt(startLabel) + step).toString();
    } else {
        const charCode = startLabel.charCodeAt(0);
        return String.fromCharCode(charCode + step);
    }
};

export const getAxisSystemPoints = (
    start: Point,
    directionPoint: Point,
    config: AxisConfig | undefined, // Allow undefined
    pixelsPerMeter: number | null
): { lines: [Point, Point][], labels: { pos: Point, text: string }[] } => {
    // Robust null check
    if (!config || typeof config.count !== 'number' || typeof config.spacingMm !== 'number') {
        return { lines: [], labels: [] };
    }

    if (config.count <= 0 || config.spacingMm <= 0 || config.lengthMm <= 0) {
        return { lines: [], labels: [] };
    }

    const angle = Math.atan2(directionPoint.y - start.y, directionPoint.x - start.x);
    const perpAngle = angle + Math.PI / 2;
    
    // Default to 1 pixel = 1mm if not calibrated, just for visual feedback during draw
    const pxPerMm = pixelsPerMeter ? pixelsPerMeter / 1000 : 1; 
    
    const lengthPx = config.lengthMm * pxPerMm;
    const spacingPx = config.spacingMm * pxPerMm;

    // Safety check for extreme values to prevent freezing
    if (Math.abs(spacingPx) < 0.1 || Math.abs(lengthPx) > 50000) {
         return { lines: [], labels: [] };
    }

    const lines: [Point, Point][] = [];
    const labels: { pos: Point, text: string }[] = [];

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    const pdx = Math.cos(perpAngle);
    const pdy = Math.sin(perpAngle);

    const safeCount = Math.min(config.count, 100);

    for (let i = 0; i < safeCount; i++) {
        const ox = start.x + (pdx * spacingPx * i);
        const oy = start.y + (pdy * spacingPx * i);
        
        const p1 = { x: ox, y: oy };
        const p2 = { x: ox + dx * lengthPx, y: oy + dy * lengthPx };
        
        lines.push([p1, p2]);
        
        const labelText = getNextLabel(config.startLabel || "1", i, config.reverse);
        
        // Remove arbitrary offset so bubble is exactly at end
        labels.push({ pos: p1, text: labelText }); 
        
        if (config.bothEnds) {
             labels.push({ pos: p2, text: labelText }); 
        }
    }

    return { lines, labels };
};

// Text Wrapping Helper
export const wrapText = (text: string, fontSize: number, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    // Approximation of char width (0.6 * fontSize is roughly average for sans-serif)
    const charWidth = fontSize * 0.6; 

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = (currentLine.length + 1 + word.length) * charWidth;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
};
