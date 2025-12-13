
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Shape, Point, ToolType, DragState, PolygonDrawState, Viewport, CoordinateReference, PageConfig, AxisConfig, GridConfig, RecentTool } from '../types';
import { getPolygonLabelStats, constrainPoint, getDistance, getAlignmentGuides, doPolygonsIntersect, getPolygonArea, getPolygonPerimeter, getClosestSnapPoint, getMidpoint, getCentroid, transformPointToWorld, getBoundingBox, getPolygonPrimaryAngle, rotatePolygon, calculateSnapCorrection, getArrowHeadPoints, isPointInPolygon, pointToLineDistance, getAxisSystemPoints, checkPolygonSelfIntersection, wrapText } from '../utils/geometry';
import { COLORS, HANDLE_RADIUS, SNAP_THRESHOLD } from '../constants';
import { ContextMenu } from './ContextMenu';
import { Crop, HelpCircle } from 'lucide-react';
import { getIconComponent } from '../utils/icons';

interface CanvasProps {
  image: HTMLImageElement | null;
  shapes: Shape[];
  tool: ToolType;
  scale: number;
  setScale: (s: number) => void;
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
  onShapeAdd: (shape: Shape) => void;
  onShapesAdd?: (shapes: Shape[]) => void;
  onShapeUpdate: (id: string, shape: Partial<Shape>) => void;
  onShapesUpdate: (updates: { id: string; points: Point[] }[]) => void; 
  onShapeUpdateEnd: () => void;
  onShapeDelete: (ids: string[]) => void;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onReorder: (id: string, direction: 'front' | 'back') => void;
  pixelsPerMeter: number | null;
  onMeasure: (pixels: number) => void;
  onApplyCrop: (rect: { x: number, y: number, w: number, h: number }) => void;
  showArea: boolean;
  onToolChange: (tool: ToolType) => void;
  allowOutsideDraw: boolean;
  onCoordClick: (p: Point) => void;
  onCoordEdit: (index: number) => void;
  onCoordMove?: (index: number, newPos: Point) => void;
  coordRefs: CoordinateReference[];
  showCoords: boolean;
  showDimensions: boolean;
  title?: string;
  description?: string;
  floor?: string;
  preventOverlap: boolean;
  bulletCounter: number;
  incrementBullet: () => void;
  pageConfig?: PageConfig;
  snapToBackground?: boolean;
  gridConfig?: GridConfig;
  onUpdateGridConfig?: (config: GridConfig) => void;
  recentTools?: RecentTool[];
  onUseRecentTool?: (tool: RecentTool) => void;
  defaultStyles?: Record<string, Partial<Shape>>;
  axisCreationConfig?: {type: 'x'|'y'|'both', configX: AxisConfig, configY?: AxisConfig} | null;
}

const DEFAULT_ICON = 'Elekter';

const Canvas: React.FC<CanvasProps> = ({
  image, shapes, tool, scale, setScale, viewport, setViewport, onShapeAdd, onShapesAdd, onShapeUpdate, onShapesUpdate, onShapeUpdateEnd, onShapeDelete,
  selectedIds, onSelect, onDuplicate, onReorder, pixelsPerMeter, onMeasure, onApplyCrop, showArea, onToolChange, allowOutsideDraw,
  onCoordClick, onCoordEdit, onCoordMove, coordRefs, showCoords, showDimensions, title, description, floor, preventOverlap,
  bulletCounter, incrementBullet, pageConfig = { headerHeight: 60, footerHeight: 100, fontSizeScale: 1.0, showLogo: true }, snapToBackground,
  gridConfig, onUpdateGridConfig, recentTools, onUseRecentTool, defaultStyles, axisCreationConfig
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, startX: 0, startY: 0 });
  const [polyDraw, setPolyDraw] = useState<PolygonDrawState>({ isActive: false, points: [] });
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  
  const [measurePoints, setMeasurePoints] = useState<[Point, Point] | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [rotateRefLine, setRotateRefLine] = useState<[Point, Point] | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  const [arrowPreview, setArrowPreview] = useState<[Point, Point] | null>(null);
  const [axisPreview, setAxisPreview] = useState<{ start: Point, end: Point } | null>(null);
  const [calloutPreview, setCalloutPreview] = useState<{ start: Point, end: Point } | null>(null);

  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'x' | 'y'; pos: number }[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; shapeId: string } | null>(null);

  const nextAreaNumber = shapes.length > 0 ? Math.max(...shapes.map(s => s.areaNumber), 0) + 1 : 1;
  const nextColor = COLORS[(nextAreaNumber - 1) % COLORS.length];
  const headerHeight = image ? Math.max(pageConfig.headerHeight, image.naturalHeight * 0.05) : 0;
  
  useEffect(() => {
    setMeasurePoints(null); setCropRect(null); setRotateRefLine(null); setSnapIndicator(null); setArrowPreview(null); setAxisPreview(null); setCalloutPreview(null);
    setDragState({ isDragging: false, startX: 0, startY: 0 }); setEditingLabelId(null); setPolyDraw({ isActive: false, points: [] });
  }, [tool]);

  // Handle Global Keys (Delete, ESC, Shift)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Shift') setIsShiftDown(true);
          if (editingLabelId) return; 
          if (e.key === 'Escape') {
              if (polyDraw.isActive) setPolyDraw({ isActive: false, points: [] });
              if (dragState.isDragging) setDragState({ isDragging: false, startX: 0, startY: 0 });
              onSelect([]);
              onToolChange('select'); 
          }
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
              onShapeDelete(selectedIds);
          }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Shift') setIsShiftDown(false);
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [polyDraw.isActive, dragState.isDragging, selectedIds, editingLabelId, onShapeDelete, onSelect, onToolChange]);

  useEffect(() => { if (image) { const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (ctx) { ctx.drawImage(image, 0, 0); offscreenCanvasRef.current = canvas; } } else { offscreenCanvasRef.current = null; } }, [image]);
  useEffect(() => { const container = containerRef.current; if (!container) return; const handleWheel = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); const zoomSensitivity = 0.001; const delta = Math.max(-0.5, Math.min(0.5, -e.deltaY * zoomSensitivity)); const newScale = Math.max(0.1, Math.min(20, scale * (1 + delta))); const rect = container.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top; const newViewportX = mouseX - (mouseX - viewport.x) * (newScale / scale); const newViewportY = mouseY - (mouseY - viewport.y) * (newScale / scale); setScale(newScale); setViewport({ ...viewport, x: newViewportX, y: newViewportY }); } }; container.addEventListener('wheel', handleWheel, { passive: false }); return () => container.removeEventListener('wheel', handleWheel); }, [scale, viewport, setScale, setViewport]);

  const toWorld = useCallback((clientX: number, clientY: number): Point => { if (!containerRef.current) return { x: 0, y: 0 }; const rect = containerRef.current.getBoundingClientRect(); let x = (clientX - rect.left - viewport.x) / scale; let y = (clientY - rect.top - viewport.y) / scale; if (!allowOutsideDraw && image) { x = Math.max(0, Math.min(image.naturalWidth, x)); y = Math.max(0, Math.min(image.naturalHeight, y)); } return { x, y }; }, [scale, viewport, allowOutsideDraw, image]);
  const toScreen = useCallback((x: number, y: number): Point => { return { x: x * scale + viewport.x, y: y * scale + viewport.y }; }, [scale, viewport]);

  const findImageEdge = (x: number, y: number): Point | null => { if (!offscreenCanvasRef.current) return null; const ctx = offscreenCanvasRef.current.getContext('2d'); if (!ctx) return null; const range = 10; const ix = Math.floor(x); const iy = Math.floor(y); const width = offscreenCanvasRef.current.width; const height = offscreenCanvasRef.current.height; if (ix < range || iy < range || ix >= width - range || iy >= height - range) return null; try { const imgData = ctx.getImageData(ix - range, iy - range, range * 2 + 1, range * 2 + 1); const data = imgData.data; let maxGradX = 0; let snapX = -1; let maxGradY = 0; let snapY = -1; const center = range; for (let i = 1; i < range * 2; i++) { const prev = (center * (range * 2 + 1) + (i - 1)) * 4; const curr = (center * (range * 2 + 1) + i) * 4; const diff = Math.abs((data[prev] + data[prev+1] + data[prev+2]) - (data[curr] + data[curr+1] + data[curr+2])); if (diff > maxGradX) { maxGradX = diff; snapX = i; } } for (let i = 1; i < range * 2; i++) { const prev = ((i - 1) * (range * 2 + 1) + center) * 4; const curr = (i * (range * 2 + 1) + center) * 4; const diff = Math.abs((data[prev] + data[prev+1] + data[prev+2]) - (data[curr] + data[curr+1] + data[curr+2])); if (diff > maxGradY) { maxGradY = diff; snapY = i; } } const threshold = 100; let resultX = x; let resultY = y; let snapped = false; if (maxGradX > threshold) { resultX = ix - range + snapX; snapped = true; } if (maxGradY > threshold) { resultY = iy - range + snapY; snapped = true; } return snapped ? { x: resultX, y: resultY } : null; } catch (e) { return null; } };
  const resolveCollision = (newShape: Shape) => { if (!preventOverlap || (newShape.type !== 'polygon' && newShape.type !== 'rectangle' && newShape.type !== 'square')) return true; const collisions = shapes.filter(s => s.id !== newShape.id && (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(newShape.points, s.points)); if (collisions.length > 0) return false; return true; };
  
  const finishPolygon = (points: Point[]) => { 
      if (points.length < 3) return; 
      if (checkPolygonSelfIntersection(points, points[0])) {
          alert("Jooned ei tohi ristuda!");
          return;
      }

      const potentialShape = { points }; 
      if (preventOverlap) { 
          const hasCollision = shapes.some(s => (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(potentialShape.points, s.points)); 
          if (hasCollision) { alert("Kujundid ei tohi kattuda!"); return; } 
      } 
      const newShape: Shape = { id: Date.now().toString(), type: 'polygon', points: points, color: nextColor, label: `Ala ${nextAreaNumber}`, areaNumber: nextAreaNumber, fontSizeMode: 'auto', opacity: 0.4, strokeWidth: 2, textStyle: 'boxed', textColor: '#000000', textBgColor: '#ffffff' }; 
      onShapeAdd(newShape); 
      onSelect([newShape.id]); 
      setPolyDraw({ isActive: false, points: [] }); 
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingLabelId) return;
    if (contextMenu) setContextMenu(null);
    if (e.button === 2) return; 
    if (e.button === 1) { 
        if (tool === 'grid_tool' && gridConfig) {
            setDragState({ isDragging: true, startX: e.clientX, startY: e.clientY, mode: 'move_grid' });
            return;
        }
        setDragState({ isDragging: true, startX: e.clientX, startY: e.clientY, mode: 'pan' }); return; 
    }
    const worldPos = toWorld(e.clientX, e.clientY);
    const hitThreshold = (HANDLE_RADIUS + 8) / scale; 

    // 1. Handle Coordinate Reference Moving
    if (showCoords && (tool === 'select' || tool === 'coords')) {
        const clickedCoordIdx = coordRefs.findIndex(ref => getDistance(worldPos, ref.pixel) < (15/scale));
        if (clickedCoordIdx !== -1) {
            setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'move_coord', handleIndex: clickedCoordIdx });
            return;
        }
    }

    if (tool === 'select') {
        // 2. CHECK HANDLES (Priority)
        for (const id of selectedIds) {
            const s = shapes.find(sh => sh.id === id);
            if (!s || s.locked) continue;

            let handleIdx = -1;
            let isMidpoint = false;
            let isAxisLen = false;
            let isCalloutTarget = false;
            
            // SPECIAL HANDLES (Icons/Text/Bullets/Axes/Callouts)
            if (['icon', 'bullet'].includes(s.type)) {
                const center = s.points[0];
                const size = s.fontSize || 32;
                const half = size / 2;
                const corners = [
                    { x: center.x - half, y: center.y - half },
                    { x: center.x + half, y: center.y - half },
                    { x: center.x - half, y: center.y + half },
                    { x: center.x + half, y: center.y + half }
                ];
                for (let i = 0; i < 4; i++) {
                    if (getDistance(worldPos, corners[i]) < hitThreshold) { handleIdx = i; break; }
                }
            } 
            else if (s.type === 'text') {
                if (s.points.length === 4) {
                    for(let i=0; i<4; i++) {
                        if (getDistance(worldPos, s.points[i]) < hitThreshold) { handleIdx = i; break; }
                    }
                } else {
                    const center = s.points[0];
                    const size = s.fontSize || 32;
                    if (getDistance(worldPos, center) < hitThreshold + size/2) handleIdx = 0;
                }
            }
            else if (s.type === 'callout') {
                // Point 0 is TextBox, Point 1 is Target
                if (getDistance(worldPos, s.points[0]) < hitThreshold) handleIdx = 0; // Box
                else if (getDistance(worldPos, s.points[1]) < hitThreshold) { handleIdx = 1; isCalloutTarget = true; } // Target
            }
            else if (s.type === 'axis') {
                // Handle 0 = Origin (Move whole object)
                // Handle 1 = Direction/Width Vector (Usually rotation, but we will lock it)
                // Handle 2 = Length (calculated endpoint)
                if (getDistance(worldPos, s.points[0]) < hitThreshold) handleIdx = 0;
                else if (getDistance(worldPos, s.points[1]) < hitThreshold) handleIdx = 1;
                
                const angle = Math.atan2(s.points[1].y - s.points[0].y, s.points[1].x - s.points[0].x);
                const pxPerMm = pixelsPerMeter ? pixelsPerMeter / 1000 : 1;
                const config = s.axisConfig || { lengthMm: 10000 };
                const lenPx = config.lengthMm * pxPerMm;
                const endP = { x: s.points[0].x + Math.cos(angle) * lenPx, y: s.points[0].y + Math.sin(angle) * lenPx };
                
                if (getDistance(worldPos, endP) < hitThreshold) { isAxisLen = true; handleIdx = 2; }
            }
            // POLYGON/RECT/SQUARE/IMAGE HANDLES
            else if (['polygon', 'rectangle', 'square', 'image'].includes(s.type)) {
                for(let i=0; i<s.points.length; i++) {
                    if (getDistance(worldPos, s.points[i]) < hitThreshold) { handleIdx = i; break; }
                }
                if (handleIdx === -1 && s.type !== 'square' && s.type !== 'image') {
                    for(let i=0; i<s.points.length; i++) {
                        const next = (i + 1) % s.points.length;
                        const mid = getMidpoint(s.points[i], s.points[next]);
                        if (getDistance(worldPos, mid) < hitThreshold) { handleIdx = i; isMidpoint = true; break; }
                    }
                }
            } else {
                for(let i=0; i<s.points.length; i++) {
                    if (getDistance(worldPos, s.points[i]) < hitThreshold) { handleIdx = i; break; }
                }
            }

            if (handleIdx !== -1) {
                if (['icon', 'bullet'].includes(s.type)) {
                    setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: handleIdx, mode: 'resize', initialPoints: [...s.points] });
                }
                else if (isAxisLen && s.type === 'axis') {
                    setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, mode: 'resize_axis_len' });
                }
                else if (s.type === 'axis' && handleIdx === 1) {
                    // Axis rotation/spacing handle
                    setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: 1, mode: 'resize', initialPoints: [...s.points] });
                }
                else if (s.type === 'callout') {
                    // Callout dragging - move either point independently
                    setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: handleIdx, mode: 'move_callout_target', initialPoints: [...s.points] });
                }
                else if (isMidpoint) {
                    if (s.type === 'rectangle') {
                        setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: handleIdx, mode: 'resize_rect_side', initialPoints: [...s.points] });
                    } else if (s.type === 'polygon') {
                        const newPoints = [...s.points];
                        const nextIdx = (handleIdx + 1) % s.points.length;
                        const newPt = getMidpoint(s.points[handleIdx], s.points[nextIdx]);
                        newPoints.splice(handleIdx + 1, 0, newPt);
                        onShapeUpdate(s.id, { points: newPoints });
                        setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: handleIdx + 1, mode: 'resize', initialPoints: newPoints });
                    }
                } else {
                    let mode: any = 'resize';
                    if (s.type === 'rectangle' || s.type === 'image' || s.type === 'square') mode = 'resize_rect_corner';
                    if (s.type === 'text') mode = 'resize_rect_corner'; 
                    setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: s.id, handleIndex: handleIdx, mode, initialPoints: [...s.points] });
                }
                return; 
            }
        }

        // 3. CHECK SHAPE BODIES
        let clickedShapeId: string | null = null;
        for (let i = shapes.length - 1; i >= 0; i--) {
            const s = shapes[i];
            if (!s.visible || s.locked) continue;
            let isHit = false;
            
            if (['icon', 'text', 'bullet'].includes(s.type)) {
                 const center = s.points[0];
                 const size = s.fontSize || 32;
                 if (s.type === 'text') {
                     if (s.points.length === 4) isHit = isPointInPolygon(worldPos, s.points);
                     else if (Math.abs(worldPos.x - center.x) < size*2 && Math.abs(worldPos.y - center.y) < size) isHit = true; 
                 } else {
                     if (Math.abs(worldPos.x - center.x) < size/1.5 && Math.abs(worldPos.y - center.y) < size/1.5) isHit = true;
                 }
            } else if (['polygon', 'rectangle', 'image', 'circle', 'triangle', 'square'].includes(s.type)) {
                 if (isPointInPolygon(worldPos, s.points)) isHit = true;
            } else if (s.type === 'callout') {
                 // Check box area
                 const [boxPos] = s.points;
                 if (getDistance(worldPos, boxPos) < 20/scale) isHit = true; 
            }
            else if (['arrow', 'line'].includes(s.type)) {
                 if (pointToLineDistance(worldPos, s.points[0], s.points[1]) < (s.strokeWidth || 4) + 5) isHit = true;
            } else if (s.type === 'axis') {
                const { lines } = getAxisSystemPoints(s.points[0], s.points[1], s.axisConfig!, pixelsPerMeter);
                for (const [p1, p2] of lines) {
                    if (pointToLineDistance(worldPos, p1, p2) < 10/scale) { isHit = true; break; }
                }
            }

            if (isHit) { clickedShapeId = s.id; break; }
        }

        if (clickedShapeId) {
            onSelect([clickedShapeId]);
            const s = shapes.find(sh => sh.id === clickedShapeId);
            const initialShapesMap: Record<string, Point[]> = { [s!.id]: [...s!.points] };
            setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'move', initialShapesMap, isOverlappingAtStart: false });
            return;
        }
        
        if (e.target === containerRef.current || (e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'image') { if (!e.ctrlKey) onSelect([]); }
    }

    // ... (Creation tools) ...
    if (tool === 'icon') { const id = Date.now().toString(); const newShape: Shape = { id, type: 'icon', points: [worldPos], color: '#ef4444', label: 'Ikoon', areaNumber: 0, iconName: DEFAULT_ICON, fontSize: 32, opacity: 1, strokeWidth: 0, iconBackgroundColor: '#ffffff', iconBackgroundOpacity: 0.8 }; onShapeAdd(newShape); onSelect([id]); return; }
    
    if (tool === 'text') { 
        const id = Date.now().toString(); 
        const newShape: Shape = { id, type: 'text', points: [worldPos, worldPos, worldPos, worldPos], color: 'black', label: 'Tekst', areaNumber: 0, fontSize: 24, opacity: 1, strokeWidth: 0, textStyle: 'simple' }; 
        onShapeAdd(newShape); onSelect([id]); 
        setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: id, mode: 'draw_rect' }); 
        return;
    }

    if (tool === 'bullet') { const id = Date.now().toString(); const newShape: Shape = { id, type: 'bullet', points: [worldPos], color: '#ef4444', label: '', areaNumber: 0, bulletShape: 'circle', bulletLabel: bulletCounter.toString(), fontSize: 24, opacity: 1 }; onShapeAdd(newShape); onSelect([id]); incrementBullet(); return; }
    
    // NEW CALLOUT INTERACTION
    if (tool === 'callout') { 
        setCalloutPreview({ start: worldPos, end: worldPos });
        setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'draw_callout' });
        return; 
    }

    if (tool === 'circle') { const id = Date.now().toString(); const newShape: Shape = { id, type: 'circle', points: [worldPos, {x: worldPos.x+1, y: worldPos.y}], color: nextColor, label: '', areaNumber: 0, opacity: 0.5, strokeWidth: 2 }; onShapeAdd(newShape); onSelect([id]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: id, mode: 'draw_circle' }); return; }
    if (tool === 'triangle') { const id = Date.now().toString(); const newShape: Shape = { id, type: 'triangle', points: [worldPos, worldPos, worldPos], color: nextColor, label: '', areaNumber: 0, opacity: 0.5, strokeWidth: 2 }; onShapeAdd(newShape); onSelect([id]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: id, mode: 'draw_triangle' }); return; }
    if (dragState.mode === 'draw_rotate_line') { setRotateRefLine([worldPos, worldPos]); setDragState({ ...dragState, isDragging: true, startX: worldPos.x, startY: worldPos.y }); return; }
    if (tool === 'coords') { onCoordClick(worldPos); return; }
    if (tool === 'calibrate') { setMeasurePoints([worldPos, worldPos]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'draw_calibrate' }); return; }
    if (tool === 'measure_line') { if (!pixelsPerMeter) { alert("Palun kalibreeri joonis esmalt!"); return; } setArrowPreview([worldPos, worldPos]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'draw_measure_line' }); return; }
    if (tool === 'crop') { setCropRect({ x: worldPos.x, y: worldPos.y, w: 0, h: 0 }); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'draw_crop' }); return; }
    if (tool === 'arrow') { setArrowPreview([worldPos, worldPos]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, mode: 'draw_arrow' }); return; }
    
    // SQUARE TOOL - MODIFIED TO BE SIMPLE SHAPE
    if (tool === 'square') {
        const id = Date.now().toString(); 
        const newShape: Shape = { 
            id, 
            type: 'square', 
            points: [worldPos, worldPos, worldPos, worldPos], 
            color: '#ef4444', 
            label: '', // Empty label
            areaNumber: 0, // No area counting for simple square
            fontSizeMode: 'auto', 
            opacity: 0.5, 
            strokeWidth: 2 
        }; 
        onShapeAdd(newShape); onSelect([id]); 
        setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: id, mode: 'draw_square' }); 
    }
    else if (tool === 'rectangle') { const id = Date.now().toString(); const newShape: Shape = { id, type: 'rectangle', points: [worldPos, worldPos, worldPos, worldPos], color: nextColor, label: `Ala ${nextAreaNumber}`, areaNumber: nextAreaNumber, fontSizeMode: 'auto', opacity: 0.4, strokeWidth: 2, textStyle: 'boxed', textColor: '#000000', textBgColor: '#ffffff' }; onShapeAdd(newShape); onSelect([id]); setDragState({ isDragging: true, startX: worldPos.x, startY: worldPos.y, shapeId: id, mode: 'draw_rect' }); } 
    else if (tool === 'polygon') { 
        const clickPos = snapIndicator || worldPos; 
        
        // Single click closes if clicked on start point
        if (polyDraw.isActive && polyDraw.points.length > 2) {
            const start = polyDraw.points[0];
            // Increase click area for closing polygon
            if (getDistance(clickPos, start) < 20 / scale) {
                finishPolygon(polyDraw.points);
                return;
            }
        }

        if (!polyDraw.isActive) { 
            setPolyDraw({ isActive: true, points: [clickPos] }); 
        } else { 
            const start = polyDraw.points[0]; 
            const prev = polyDraw.points[polyDraw.points.length - 1]; 
            
            // DEBOUNCE: Check distance to previous point to avoid double-click issues
            if (getDistance(clickPos, prev) < 5 / scale) {
                return;
            }

            const next = constrainPoint(prev, clickPos, isShiftDown); 
            
            if (checkPolygonSelfIntersection(polyDraw.points, next)) {
                return;
            }

            setPolyDraw(prev => ({ ...prev, points: [...prev.points, next] })); 
        } 
    } 
    // AXIS TOOL
    else if (tool === 'axis_tool') {
        if (!axisCreationConfig) return;

        const shapesToAdd: Shape[] = [];

        if (axisCreationConfig.type === 'x' || axisCreationConfig.type === 'both') {
            const id = Date.now().toString();
            const start = worldPos;
            const end = { x: start.x, y: start.y + 100 }; // Down for vertical axis
            
            shapesToAdd.push({
                id, type: 'axis', points: [start, end], 
                color: '#4b5563', label: '', areaNumber: 0,
                strokeWidth: 1, opacity: 1,
                axisConfig: axisCreationConfig.configX,
                axisDirection: 'x' // Vertical lines
            });
        }
        
        if (axisCreationConfig.type === 'y' || axisCreationConfig.type === 'both') {
            // Ensure unique ID for second shape if creating both rapidly
            const id = (Date.now() + 1).toString();
            const start = worldPos;
            const end = { x: start.x + 100, y: start.y }; // Right for horizontal axis
            
            shapesToAdd.push({
                id, type: 'axis', points: [start, end], 
                color: '#4b5563', label: '', areaNumber: 0,
                strokeWidth: 1, opacity: 1,
                axisConfig: axisCreationConfig.configY || axisCreationConfig.configX, // Fallback
                axisDirection: 'y' // Horizontal lines
            });
        }
        
        if (shapesToAdd.length > 0) {
            if (onShapesAdd) {
                onShapesAdd(shapesToAdd);
            } else {
                // Fallback for single additions if prop not provided (though App.tsx handles it now)
                shapesToAdd.forEach(s => onShapeAdd(s));
            }
        }
        
        // Reset tool after creation
        onToolChange('select');
    }
    // GRID TOOL (if clicked on map, maybe pan grid?)
    else if (tool === 'grid_tool' && gridConfig) {
        setDragState({ isDragging: true, startX: e.clientX, startY: e.clientY, mode: 'move_grid' });
    }
  };

  // Add double click handler for polygon closing
  const handleDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (tool === 'polygon' && polyDraw.isActive && polyDraw.points.length > 2) {
          finishPolygon(polyDraw.points);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    let worldPos = toWorld(e.clientX, e.clientY);
    if (snapToBackground) { 
        const edgeSnap = findImageEdge(worldPos.x, worldPos.y); 
        if (edgeSnap) { worldPos = edgeSnap; } 
    }
    setCursorPos(worldPos);
    
    // Snapping Logic
    if (tool === 'polygon' && !dragState.isDragging) { 
        const snapped = getClosestSnapPoint(worldPos, shapes, 15 / scale, gridConfig, pixelsPerMeter); 
        setSnapIndicator(snapped); 
        
        if (polyDraw.isActive && polyDraw.points.length > 0) { 
            const startPoint = polyDraw.points[0]; 
            const lastPoint = polyDraw.points[polyDraw.points.length - 1]; 
            const guides: { type: 'x' | 'y'; pos: number }[] = []; 
            let snappedPos = snapped || worldPos; 
            
            if (isShiftDown) {
                snappedPos = constrainPoint(lastPoint, snappedPos, true);
            }

            if (Math.abs(snappedPos.x - startPoint.x) < SNAP_THRESHOLD / scale) { guides.push({ type: 'x', pos: startPoint.x }); snappedPos = { ...snappedPos, x: startPoint.x }; } 
            if (Math.abs(snappedPos.y - startPoint.y) < SNAP_THRESHOLD / scale) { guides.push({ type: 'y', pos: startPoint.y }); snappedPos = { ...snappedPos, y: startPoint.y }; } 
            
            if (!isShiftDown) { 
                if (Math.abs(snappedPos.x - lastPoint.x) < SNAP_THRESHOLD / scale) { guides.push({ type: 'x', pos: lastPoint.x }); snappedPos = { ...snappedPos, x: lastPoint.x }; } 
                if (Math.abs(snappedPos.y - lastPoint.y) < SNAP_THRESHOLD / scale) { guides.push({ type: 'y', pos: lastPoint.y }); snappedPos = { ...snappedPos, y: lastPoint.y }; } 
            } 
            setAlignmentGuides(guides); 
            if (guides.length > 0) { 
                setCursorPos(snappedPos); 
                if (!snapped) setSnapIndicator(snappedPos); 
            } else { 
                if (!dragState.isDragging) setAlignmentGuides([]); 
            } 
        } 
        if (snapped) setCursorPos(snapped); 
    } else { 
        if (!dragState.isDragging) setSnapIndicator(null); 
    }

    if (dragState.isDragging) {
        if (dragState.mode === 'resize' && dragState.handleIndex !== undefined) {
             setAlignmentGuides([]); 
             const shape = shapes.find(s => s.id === dragState.shapeId); 
             if (!shape) return;
             
             if (['icon', 'bullet'].includes(shape.type)) { 
                 const center = shape.points[0];
                 const dist = getDistance(center, worldPos);
                 const newSize = Math.max(10, dist * 1.5); 
                 onShapeUpdate(dragState.shapeId!, { fontSize: newSize });
                 return;
             }
             
             // AXIS ANGLE LOCK LOGIC
             // If we are resizing handle 1 of an Axis (the direction vector), default to 90deg steps unless Shift is held.
             if (shape.type === 'axis' && dragState.handleIndex === 1 && !isShiftDown) {
                 const origin = shape.points[0];
                 const rawAngle = Math.atan2(worldPos.y - origin.y, worldPos.x - origin.x);
                 // Snap to nearest 90 degrees (PI/2)
                 const snapStep = Math.PI / 2;
                 const snappedAngle = Math.round(rawAngle / snapStep) * snapStep;
                 
                 const dist = getDistance(origin, worldPos);
                 const snappedPos = {
                     x: origin.x + Math.cos(snappedAngle) * dist,
                     y: origin.y + Math.sin(snappedAngle) * dist
                 };
                 
                 const newPoints = [...shape.points];
                 newPoints[1] = snappedPos;
                 onShapeUpdate(dragState.shapeId!, { points: newPoints });
                 return;
             }
             
             const snappedPos = getClosestSnapPoint(worldPos, shapes, 15 / scale, gridConfig, pixelsPerMeter) || worldPos;
             const newPoints = [...shape.points]; 
             newPoints[dragState.handleIndex] = snappedPos;
             let hasCollision = false; 
             if (preventOverlap && (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square')) { const otherShapes = shapes.filter(s => s.id !== dragState.shapeId); hasCollision = otherShapes.some(s => (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(newPoints, s.points)); }
             if (!hasCollision) onShapeUpdate(dragState.shapeId!, { points: newPoints });
        }
        else if (dragState.mode === 'pan') { const dx = e.clientX - dragState.startX; const dy = e.clientY - dragState.startY; setViewport({ ...viewport, x: viewport.x + dx, y: viewport.y + dy }); setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY })); }
        else if (dragState.mode === 'move_coord' && dragState.handleIndex !== undefined && onCoordMove) { onCoordMove(dragState.handleIndex, worldPos); }
        else if (dragState.mode === 'draw_calibrate') { setMeasurePoints([{ x: dragState.startX, y: dragState.startY }, worldPos]); }
        else if (dragState.mode === 'draw_crop') { const x = Math.min(dragState.startX, worldPos.x); const y = Math.min(dragState.startY, worldPos.y); const w = Math.abs(worldPos.x - dragState.startX); const h = Math.abs(worldPos.y - dragState.startY); setCropRect({ x, y, w, h }); }
        else if (dragState.mode === 'draw_rotate_line' && dragState.shapeId) { setRotateRefLine([{ x: dragState.startX, y: dragState.startY }, worldPos]); }
        else if (dragState.mode === 'draw_arrow') { setArrowPreview([{ x: dragState.startX, y: dragState.startY }, worldPos]); }
        else if (dragState.mode === 'draw_measure_line') { 
            const start = { x: dragState.startX, y: dragState.startY };
            const next = constrainPoint(start, worldPos, isShiftDown);
            setArrowPreview([start, next]); 
        }
        else if (dragState.mode === 'draw_circle' && dragState.shapeId) { const center = { x: dragState.startX, y: dragState.startY }; onShapeUpdate(dragState.shapeId, { points: [center, worldPos] }); }
        else if (dragState.mode === 'draw_triangle' && dragState.shapeId) { const center = { x: dragState.startX, y: dragState.startY }; const dx = worldPos.x - center.x; const dy = worldPos.y - center.y; const p1 = { x: center.x, y: center.y - Math.abs(dy) }; const p2 = { x: center.x - Math.abs(dx), y: center.y + Math.abs(dy) }; const p3 = { x: center.x + Math.abs(dx), y: center.y + Math.abs(dy) }; onShapeUpdate(dragState.shapeId, { points: [p1, p2, p3] }); }
        else if (dragState.mode === 'draw_rect') { 
            const start = { x: dragState.startX, y: dragState.startY }; const current = worldPos; const minX = Math.min(start.x, current.x); const maxX = Math.max(start.x, current.x); const minY = Math.min(start.y, current.y); const maxY = Math.max(start.y, current.y); const newPoints = [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }]; onShapeUpdate(dragState.shapeId!, { points: newPoints }); 
        }
        else if (dragState.mode === 'draw_square') {
            const start = { x: dragState.startX, y: dragState.startY };
            const current = worldPos;
            const w = current.x - start.x;
            const h = current.y - start.y;
            let sideX = w;
            let sideY = h;
            if (isShiftDown) {
                const maxSide = Math.max(Math.abs(w), Math.abs(h));
                sideX = maxSide * (w < 0 ? -1 : 1);
                sideY = maxSide * (h < 0 ? -1 : 1);
            }
            const p2 = { x: start.x + sideX, y: start.y };
            const p3 = { x: start.x + sideX, y: start.y + sideY };
            const p4 = { x: start.x, y: start.y + sideY };
            const newPoints = [start, p2, p3, p4];
            onShapeUpdate(dragState.shapeId!, { points: newPoints });
        }
        else if (dragState.mode === 'draw_callout') { setCalloutPreview({ start: { x: dragState.startX, y: dragState.startY }, end: worldPos }); }
        else if (dragState.mode === 'resize_axis_len' && dragState.shapeId) {
            const shape = shapes.find(s => s.id === dragState.shapeId);
            if (shape && shape.axisConfig) {
                const origin = shape.points[0];
                const directionP = shape.points[1];
                const angle = Math.atan2(directionP.y - origin.y, directionP.x - origin.x);
                const vCursor = { x: worldPos.x - origin.x, y: worldPos.y - origin.y };
                const dot = vCursor.x * Math.cos(angle) + vCursor.y * Math.sin(angle);
                const pxPerMm = pixelsPerMeter ? pixelsPerMeter / 1000 : 1;
                const newLenMm = Math.max(100, dot / pxPerMm);
                onShapeUpdate(dragState.shapeId, { axisConfig: { ...shape.axisConfig, lengthMm: newLenMm } });
            }
        }
        else if (dragState.mode === 'move_callout_target' && dragState.handleIndex !== undefined) {
            const newPoints = [...dragState.initialPoints!];
            newPoints[dragState.handleIndex] = worldPos;
            onShapeUpdate(dragState.shapeId!, { points: newPoints });
        }
        else if (dragState.mode === 'move_grid' && gridConfig && onUpdateGridConfig) {
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            const worldDx = dx / scale;
            const worldDy = dy / scale;
            onUpdateGridConfig({ ...gridConfig, offsetX: gridConfig.offsetX + worldDx, offsetY: gridConfig.offsetY + worldDy });
            setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
        }
        else if (dragState.mode === 'move' && dragState.initialShapesMap) { const rawDx = worldPos.x - dragState.startX; const rawDy = worldPos.y - dragState.startY; const movingShapeIds = Object.keys(dragState.initialShapesMap); const staticShapes = shapes.filter(s => !movingShapeIds.includes(s.id)); const tentativeMovingPoints: Point[] = []; for (const id in dragState.initialShapesMap) { dragState.initialShapesMap[id].forEach(p => { tentativeMovingPoints.push({ x: p.x + rawDx, y: p.y + rawDy }); }); } const snap = calculateSnapCorrection(tentativeMovingPoints, staticShapes, SNAP_THRESHOLD / scale); setSnapIndicator(snap.snapPoint); const finalDx = rawDx + snap.delta.x; const finalDy = rawDy + snap.delta.y; const newShapesData: { id: string; points: Point[] }[] = []; let outOfBounds = false; let hasCollision = false; for (const id in dragState.initialShapesMap) { const points = dragState.initialShapesMap[id].map(p => ({ x: p.x + finalDx, y: p.y + finalDy })); newShapesData.push({ id, points }); if (!allowOutsideDraw && image) { for(const p of points) { if (p.x < 0 || p.x > image.naturalWidth || p.y < 0 || p.y > image.naturalHeight) outOfBounds = true; } } if (preventOverlap && !dragState.isOverlappingAtStart) { const movingShape = shapes.find(s => s.id === id); if (movingShape && (movingShape.type === 'polygon' || movingShape.type === 'rectangle' || movingShape.type === 'square')) { const otherShapes = shapes.filter(s => !movingShapeIds.includes(s.id)); if (otherShapes.some(s => (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(points, s.points))) { hasCollision = true; } } } } if (!outOfBounds && !hasCollision) onShapesUpdate(newShapesData); }
        else if (dragState.mode === 'resize_rect_side' && dragState.initialPoints && dragState.handleIndex !== undefined) { const idx = dragState.handleIndex; const p1 = dragState.initialPoints[idx]; const p2 = dragState.initialPoints[(idx + 1) % 4]; const edgeDx = p2.x - p1.x; const edgeDy = p2.y - p1.y; let nx = -edgeDy; let ny = edgeDx; const len = Math.sqrt(nx*nx + ny*ny); if (len > 0) { nx /= len; ny /= len; } const mDx = worldPos.x - dragState.startX; const mDy = worldPos.y - dragState.startY; const projection = mDx * nx + mDy * ny; const moveX = nx * projection; const moveY = ny * projection; const newPoints = [...dragState.initialPoints]; newPoints[idx] = { x: p1.x + moveX, y: p1.y + moveY }; newPoints[(idx + 1) % 4] = { x: p2.x + moveX, y: p2.y + moveY }; let hasCollision = false; if (preventOverlap) { const otherShapes = shapes.filter(s => s.id !== dragState.shapeId); hasCollision = otherShapes.some(s => (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(newPoints, s.points)); } if (!hasCollision) onShapeUpdate(dragState.shapeId!, { points: newPoints }); }
        else if (dragState.mode === 'resize_rect_corner' && dragState.initialPoints && dragState.handleIndex !== undefined) { const idx = dragState.handleIndex; const newPoints = [...dragState.initialPoints]; newPoints[idx] = { x: worldPos.x, y: worldPos.y }; const neighbor1Idx = (idx + 1) % 4; const neighbor2Idx = (idx + 3) % 4; const pInit = dragState.initialPoints[idx]; const pN1Init = dragState.initialPoints[neighbor1Idx]; if (Math.abs(pInit.x - pN1Init.x) < 1) { newPoints[neighbor1Idx] = { x: worldPos.x, y: pN1Init.y }; newPoints[neighbor2Idx] = { x: dragState.initialPoints[neighbor2Idx].x, y: worldPos.y }; } else { newPoints[neighbor1Idx] = { x: pN1Init.x, y: worldPos.y }; newPoints[neighbor2Idx] = { x: worldPos.x, y: dragState.initialPoints[neighbor2Idx].y }; } let hasCollision = false; if (preventOverlap) { const otherShapes = shapes.filter(s => s.id !== dragState.shapeId); hasCollision = otherShapes.some(s => (s.type === 'polygon' || s.type === 'rectangle' || s.type === 'square') && doPolygonsIntersect(newPoints, s.points)); } if (!hasCollision) onShapeUpdate(dragState.shapeId!, { points: newPoints }); }
    } else { if (alignmentGuides.length > 0) setAlignmentGuides([]); }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (dragState.isDragging) {
          if (dragState.mode === 'draw_calibrate' && measurePoints) {
               const dist = getDistance(measurePoints[0], measurePoints[1]);
               onMeasure(dist);
          } else if (dragState.mode === 'draw_crop' && cropRect && cropRect.w > 10 && cropRect.h > 10) {
               onApplyCrop(cropRect);
          } else if (dragState.mode === 'draw_measure_line' && arrowPreview) {
               const id = Date.now().toString();
               const dist = getDistance(arrowPreview[0], arrowPreview[1]);
               const newShape: Shape = {
                   id, type: 'line', points: arrowPreview, 
                   color: '#2563eb', label: '', areaNumber: 0,
                   strokeWidth: 2, opacity: 1, 
                   measureUnit: 'm', measureDecimals: 2
               };
               onShapeAdd(newShape);
          } else if (dragState.mode === 'draw_arrow' && arrowPreview) {
               const id = Date.now().toString();
               const newShape: Shape = {
                   id, type: 'arrow', points: arrowPreview, 
                   color: '#ef4444', label: '', areaNumber: 0,
                   strokeWidth: 4, opacity: 1, arrowStyle: 'straight'
               };
               onShapeAdd(newShape);
          } else if (dragState.mode === 'draw_axis' && axisPreview) {
               const id = Date.now().toString();
               const newShape: Shape = {
                   id, type: 'axis', points: [axisPreview.start, axisPreview.end], 
                   color: '#4b5563', label: '', areaNumber: 0,
                   strokeWidth: 1, opacity: 1,
                   axisConfig: { spacingMm: 6000, count: 5, startLabel: "1", lengthMm: 10000, bothEnds: false, reverse: false }
               };
               onShapeAdd(newShape);
          } else if (dragState.mode === 'draw_callout' && calloutPreview) {
               const id = Date.now().toString();
               const newShape: Shape = {
                   id, type: 'callout', points: [calloutPreview.start, calloutPreview.end], 
                   color: 'black', label: 'Info', areaNumber: 0,
                   fontSize: 16, opacity: 1, strokeWidth: 1, textStyle: 'boxed', textBgColor: '#ffffff',
                   calloutShape: 'box', calloutArrowHead: 'arrow'
               };
               onShapeAdd(newShape);
          }
          
          onShapeUpdateEnd();
      }
      setDragState({ isDragging: false, startX: 0, startY: 0 });
  };

  const handleContextMenu = (e: React.MouseEvent, shapeId?: string) => {
      e.preventDefault();
      if (shapeId) {
          onSelect([shapeId]);
          setContextMenu({ visible: true, x: e.clientX, y: e.clientY, shapeId });
      } else {
          setContextMenu(null);
      }
  };

  return (
    <div 
        ref={containerRef}
        className={`absolute inset-0 overflow-hidden bg-gray-100 ${tool === 'select' ? 'cursor-default' : 'cursor-crosshair'} touch-none select-none`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => handleContextMenu(e)}
    >
       <div 
          style={{ 
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange: 'transform'
          }}
          className="relative"
       >
          {image && (
             <img 
                src={image.src} 
                alt="Background" 
                className="absolute top-0 left-0 pointer-events-none select-none"
                style={{ width: image.naturalWidth, height: image.naturalHeight }}
             />
          )}

          {/* Grid Layer */}
          {gridConfig && gridConfig.visible && (
              <svg 
                  width={image ? image.naturalWidth : 5000} 
                  height={image ? image.naturalHeight : 5000} 
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ opacity: gridConfig.opacity }}
              >
                  <defs>
                      <pattern 
                          id="gridPattern" 
                          width={(gridConfig.sizeMm * (pixelsPerMeter ? pixelsPerMeter/1000 : 1))} 
                          height={(gridConfig.sizeMm * (pixelsPerMeter ? pixelsPerMeter/1000 : 1))} 
                          patternUnits="userSpaceOnUse"
                          x={gridConfig.offsetX}
                          y={gridConfig.offsetY}
                      >
                          <path d={`M ${(gridConfig.sizeMm * (pixelsPerMeter ? pixelsPerMeter/1000 : 1))} 0 L 0 0 0 ${(gridConfig.sizeMm * (pixelsPerMeter ? pixelsPerMeter/1000 : 1))}`} fill="none" stroke={gridConfig.color} strokeWidth="1"/>
                      </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gridPattern)" />
              </svg>
          )}
          
          {/* Main SVG Layer */}
          <svg
             width={image ? image.naturalWidth : 20000}
             height={image ? image.naturalHeight : 20000}
             className="absolute top-0 left-0 overflow-visible"
          >
             {shapes.map(shape => {
                 const isSelected = selectedIds.includes(shape.id);
                 const isEditing = editingLabelId === shape.id;
                 if (!shape.visible) return null;

                 if (shape.type === 'polygon' || shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle') {
                     // Text Rendering Logic
                     let displayLines: {text: string, size: number, weight: string}[] = [];
                     const bbox = getBoundingBox(shape.points);
                     const { x, y, rotation, maxFontSize } = getPolygonLabelStats(shape.points);
                     
                     let fontSize = shape.fontSizeMode === 'manual' && shape.fontSize ? shape.fontSize : Math.min(maxFontSize, 32);
                     fontSize *= pageConfig.fontSizeScale; 
                     
                     const paddingMultiplier = shape.textPadding ?? 0.6;
                     const textStyle = shape.textStyle || 'boxed';
                     const textColor = shape.textColor || (textStyle === 'boxed' ? '#000000' : shape.color || '#000000');
                     const textBgColor = shape.textBgColor || '#ffffff';
                     
                     if (shape.label) {
                        const maxWidth = bbox.width * 0.8;
                        let wrappedLabel = wrapText(shape.label, fontSize, maxWidth);
                        if(wrappedLabel.length * fontSize > bbox.height) { fontSize *= 0.8; wrappedLabel = wrapText(shape.label, fontSize, maxWidth); }
                        wrappedLabel.forEach(l => displayLines.push({ text: l, size: fontSize, weight: shape.fontWeight || 'normal' }));
                     }
                     if (showArea && shape.showArea !== false && pixelsPerMeter && shape.type !== 'square') { 
                        const areaPx = getPolygonArea(shape.points); const areaM2 = areaPx / (pixelsPerMeter * pixelsPerMeter); 
                        displayLines.push({ text: `${areaM2.toFixed(1)} m²`, size: fontSize * 0.7, weight: 'medium' });
                     }
                     if (shape.showPerimeter && pixelsPerMeter) { 
                        const perimPx = getPolygonPerimeter(shape.points); const perimM = perimPx / pixelsPerMeter; 
                        displayLines.push({ text: `${perimM.toFixed(1)} m`, size: fontSize * 0.7, weight: 'medium' });
                     }

                     let boxWidth = 0, boxHeight = 0;
                     if (displayLines.length > 0) {
                        const widths = displayLines.map(l => l.text.length * l.size * 0.6);
                        boxWidth = Math.max(...widths) + fontSize * paddingMultiplier * 2;
                        boxHeight = displayLines.reduce((sum, l) => sum + (l.size * 1.2), 0) + fontSize * paddingMultiplier * 2;
                     }

                     return (
                         <g key={shape.id} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, shape.id); }}>
                             <polygon
                                points={shape.points.map(p => `${p.x},${p.y}`).join(' ')}
                                fill={shape.color}
                                stroke={isSelected ? '#2563eb' : shape.color}
                                strokeWidth={(shape.strokeWidth || 2) / scale}
                                fillOpacity={shape.opacity}
                             />
                             {/* Label Rendering */}
                             {!isEditing && displayLines.length > 0 && (shape.type === 'polygon' || shape.type === 'rectangle' || shape.label) && (
                                <g transform={`translate(${x},${y}) rotate(${rotation})`} style={{ pointerEvents: 'none' }}>
                                    {textStyle === 'boxed' && <rect x={-boxWidth/2} y={-boxHeight/2} width={boxWidth} height={boxHeight} fill={textBgColor} rx={4/scale} opacity={0.8} />}
                                    <g transform={`translate(0, ${-(boxHeight - fontSize * paddingMultiplier * 2)/2})`}>
                                        {displayLines.map((line, i) => {
                                            let yOffset = 0; for(let j=0; j<i; j++) yOffset += displayLines[j].size * 1.2;
                                            yOffset += line.size * 0.4;
                                            return <text key={i} y={yOffset} textAnchor="middle" dominantBaseline="central" fill={textColor} fontSize={line.size} fontWeight={line.weight} style={{fontFamily: shape.fontFamily, fontStyle: shape.fontStyle}}>{line.text}</text>;
                                        })}
                                    </g>
                                </g>
                             )}
                             {/* Side Lengths */}
                             {shape.showSideLengths && pixelsPerMeter && (shape.type === 'polygon' || shape.type === 'rectangle') && (
                                 <g pointerEvents="none">
                                     {shape.points.map((p1, i) => {
                                         const p2 = shape.points[(i + 1) % shape.points.length];
                                         const distM = getDistance(p1, p2) / pixelsPerMeter;
                                         const mid = getMidpoint(p1, p2);
                                         const center = getCentroid(shape.points);
                                         const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                                         let nx = -dy; let ny = dx;
                                         const len = Math.sqrt(nx*nx + ny*ny); if(len > 0) { nx /= len; ny /= len; }
                                         if (nx * (center.x - mid.x) + ny * (center.y - mid.y) < 0) { nx = -nx; ny = -ny; }
                                         const offset = 15 / scale;
                                         return <text key={i} x={mid.x + nx * offset} y={mid.y + ny * offset} fontSize={10/scale} fill={shape.textColor || 'black'} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{distM.toFixed(2)}</text>;
                                     })}
                                 </g>
                             )}
                         </g>
                     );
                 } else if (shape.type === 'circle') {
                     const r = getDistance(shape.points[0], shape.points[1]);
                     return (
                         <g key={shape.id} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, shape.id); }}>
                             <circle cx={shape.points[0].x} cy={shape.points[0].y} r={r} fill={shape.color} stroke={isSelected ? '#2563eb' : shape.color} strokeWidth={(shape.strokeWidth || 2) / scale} fillOpacity={shape.opacity} />
                         </g>
                     );
                 } else if (shape.type === 'icon' && shape.iconName) {
                     const Icon = getIconComponent(shape.iconName);
                     const size = (shape.fontSize || 32) / scale;
                     return (
                         <foreignObject key={shape.id} x={shape.points[0].x - size/2} y={shape.points[0].y - size/2} width={size} height={size} className="pointer-events-none">
                             <div className={`flex items-center justify-center w-full h-full rounded-full`} style={{ color: shape.color, backgroundColor: shape.iconStyle !== 'simple' ? shape.iconBackgroundColor : 'transparent', opacity: shape.opacity }}>
                                 <Icon size={size * 0.7} />
                             </div>
                         </foreignObject>
                     );
                 } else if (shape.type === 'image' && shape.imageUrl) {
                     const p0 = shape.points[0]; const p2 = shape.points[2];
                     return (
                         <image key={shape.id} href={shape.imageUrl} x={Math.min(p0.x, p2.x)} y={Math.min(p0.y, p2.y)} width={Math.abs(p2.x - p0.x)} height={Math.abs(p2.y - p0.y)} opacity={shape.opacity} preserveAspectRatio="none" />
                     );
                 } else if (shape.type === 'text') {
                     const p = shape.points[0]; const fontSize = (shape.fontSize || 24) / scale;
                     return (
                         <text key={shape.id} x={p.x} y={p.y} fill={shape.color} fontSize={fontSize} textAnchor="middle" style={{fontFamily: shape.fontFamily, fontWeight: shape.fontWeight, fontStyle: shape.fontStyle}}>{shape.label}</text>
                     );
                 } else if (shape.type === 'arrow') {
                     const [start, end] = shape.points;
                     const headPoints = getArrowHeadPoints(start, end, (shape.strokeWidth || 4) * 4 / scale);
                     return (
                         <g key={shape.id}>
                             <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={shape.color} strokeWidth={(shape.strokeWidth || 4)/scale} />
                             <polygon points={`${headPoints[0].x},${headPoints[0].y} ${headPoints[1].x},${headPoints[1].y} ${headPoints[2].x},${headPoints[2].y}`} fill={shape.color} />
                         </g>
                     );
                 } else if (shape.type === 'line') {
                     const [start, end] = shape.points;
                     const mid = getMidpoint(start, end);
                     const dist = getDistance(start, end);
                     const label = pixelsPerMeter ? `${(dist/pixelsPerMeter).toFixed(2)} m` : '';
                     return (
                         <g key={shape.id}>
                             <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={shape.color} strokeWidth={(shape.strokeWidth || 2)/scale} />
                             <rect x={mid.x - 20/scale} y={mid.y - 10/scale} width={40/scale} height={20/scale} fill={shape.color} rx={4/scale} />
                             <text x={mid.x} y={mid.y} fill="white" fontSize={10/scale} textAnchor="middle" dominantBaseline="middle">{label}</text>
                         </g>
                     );
                 } else if (shape.type === 'callout') {
                     const [box, target] = shape.points;
                     return (
                         <g key={shape.id}>
                             <line x1={box.x} y1={box.y} x2={target.x} y2={target.y} stroke={shape.color} strokeWidth={2/scale} />
                             <circle cx={target.x} cy={target.y} r={3/scale} fill={shape.color} />
                             <rect x={box.x - 40/scale} y={box.y - 15/scale} width={80/scale} height={30/scale} fill={shape.textBgColor || 'white'} stroke={shape.color} strokeWidth={2/scale} />
                             <text x={box.x} y={box.y} fill={shape.color} fontSize={12/scale} textAnchor="middle" dominantBaseline="middle">{shape.label}</text>
                         </g>
                     );
                 } else if (shape.type === 'axis' && shape.axisConfig) {
                     const { lines, labels } = getAxisSystemPoints(shape.points[0], shape.points[1], shape.axisConfig, pixelsPerMeter);
                     return (
                         <g key={shape.id}>
                             {lines.map(([p1, p2], i) => <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={shape.color} strokeWidth={1/scale} strokeDasharray="5,5" />)}
                             {labels.map((l, i) => (
                                 <g key={i} transform={`translate(${l.pos.x},${l.pos.y})`}>
                                     <circle r={10/scale} fill="white" stroke={shape.color} strokeWidth={1/scale} />
                                     <text fontSize={10/scale} textAnchor="middle" dominantBaseline="middle" fill={shape.color}>{l.text}</text>
                                 </g>
                             ))}
                         </g>
                     );
                 } else if (shape.type === 'bullet') {
                     const p = shape.points[0]; const size = (shape.fontSize || 24)/scale;
                     return (
                         <g key={shape.id} transform={`translate(${p.x},${p.y})`}>
                             <circle r={size/2} fill={shape.color} />
                             <text fontSize={size*0.6} fill="white" textAnchor="middle" dominantBaseline="middle">{shape.bulletLabel}</text>
                         </g>
                     );
                 }
                 return null;
             })}

             {/* Drawing Previews */}
             {polyDraw.isActive && (
                 <>
                    <polyline
                        points={polyDraw.points.map(p => `${p.x},${p.y}`).join(' ') + (cursorPos ? ` ${cursorPos.x},${cursorPos.y}` : '')}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={2 / scale}
                        strokeDasharray="5,5"
                    />
                    {/* Vertices for polygon being drawn */}
                    {polyDraw.points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={4/scale} fill="white" stroke="#2563eb" strokeWidth={2/scale} />
                    ))}
                 </>
             )}
             
             {/* Handles for selected */}
             {selectedIds.map(id => {
                 const s = shapes.find(sh => sh.id === id);
                 if (!s) return null;
                 return s.points.map((p, i) => (
                     <circle
                        key={`${id}-handle-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={HANDLE_RADIUS / scale}
                        fill="white"
                        stroke="#2563eb"
                        strokeWidth={1.5 / scale}
                     />
                 ));
             })}
          </svg>
       </div>

       {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onDuplicate={() => onDuplicate([contextMenu.shapeId])}
            onDelete={() => onShapeDelete([contextMenu.shapeId])}
            onClose={() => setContextMenu(null)}
            onMoveToFront={() => onReorder(contextMenu.shapeId, 'front')}
            onMoveToBack={() => onReorder(contextMenu.shapeId, 'back')}
            onEdit={() => onSelect([contextMenu.shapeId])}
            onRotateAlign={() => {}}
            recentTools={recentTools}
            onUseRecentTool={onUseRecentTool}
          />
       )}
    </div>
  );
};

export default Canvas;
