
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Minimap from './components/Minimap';
import CalibrationModal from './components/CalibrationModal';
import CoordinateModal from './components/CoordinateModal';
import CalibrationListModal from './components/CalibrationListModal';
import IconPickerModal from './components/IconPickerModal';
import PageSettingsModal from './components/PageSettingsModal';
import NewSheetModal from './components/NewSheetModal';
import AxisCreationModal from './components/AxisCreationModal';
import CranePickerModal from './components/CranePickerModal';
import AlertModal, { useAlert } from './components/AlertModal';
import ExportModal, { ExportOptions } from './components/ExportModal';
import { Shape, ToolType, Viewport, CoordinateReference, Point, ProjectFile, ShapeType, PageConfig, SavedStyle, Sheet, RecentTool, AxisConfig, CraneModel } from './types';
import { loadPdfPage } from './utils/pdf';
import { doPolygonsIntersect, toRoman } from './utils/geometry';
import { exportToPdf, exportToDxf, exportToGeoJson, exportToPng, exportToIfc } from './utils/export';
import { COLORS } from './constants';
import { Plus, X } from 'lucide-react';

const App = () => {
  // --- MULTI-PAGE STATE ---
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

  const [customColors, setCustomColors] = useState<string[]>([]);
  // Open new sheet modal if no sheets exist
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);

  const [recentTools, setRecentTools] = useState<RecentTool[]>([]);

  // Alert and Export modals
  const { alertState, hideAlert, showError, showWarning, showSuccess } = useAlert();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Crane picker
  const [showCranePicker, setShowCranePicker] = useState(false);
  const [customCranes, setCustomCranes] = useState<CraneModel[]>([]);

  // Load saved data from localStorage on mount only
  useEffect(() => {
      const savedColors = localStorage.getItem('vm_customColors');
      if (savedColors) setCustomColors(JSON.parse(savedColors));

      const savedStylesLocal = localStorage.getItem('vm_savedStyles');
      if (savedStylesLocal) {
          try {
              setSavedStyles(JSON.parse(savedStylesLocal));
          } catch(e) { console.error("Error loading styles", e); }
      }

      // Show new sheet modal on initial load if no sheets
      setShowNewSheetModal(true);
  }, []);

  // Show new sheet modal when all sheets are deleted
  useEffect(() => {
      if (sheets.length === 0) {
          setShowNewSheetModal(true);
      }
  }, [sheets.length]);

  // Persistence (Save)
  useEffect(() => {
      localStorage.setItem('vm_customColors', JSON.stringify(customColors));
  }, [customColors]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const updateActiveSheet = (updates: Partial<Sheet>) => {
      setSheets(prev => prev.map(s => s.id === activeSheetId ? { ...s, ...updates } : s));
  };

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [tool, setTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<Shape[]>([]);
  
  // Saved Styles
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);

  // Default Styles
  const [defaultStyles, setDefaultStyles] = useState<Record<string, Partial<Shape>>>({
    polygon: { opacity: 0.4, strokeWidth: 2, fontSizeMode: 'auto', textStyle: 'boxed', textColor: '#000000', textBgColor: '#ffffff', fontFamily: 'Arial', fontWeight: 'bold', showArea: true, showPerimeter: false, showSideLengths: false, textPadding: 0.6 },
    rectangle: { opacity: 0.4, strokeWidth: 2, fontSizeMode: 'auto', textStyle: 'boxed', textColor: '#000000', textBgColor: '#ffffff', fontFamily: 'Arial', fontWeight: 'bold', showArea: true, showPerimeter: false, showSideLengths: false, textPadding: 0.6 },
    square: { opacity: 0.5, strokeWidth: 2, color: '#ef4444', label: '', showArea: false, showPerimeter: false, showSideLengths: false }, 
    icon: { opacity: 1, fontSize: 32, iconStyle: 'circle', iconBackgroundColor: '#ffffff', iconBackgroundOpacity: 0.8, iconName: 'Elekter' },
    text: { color: 'black', fontSize: 24, opacity: 1, textStyle: 'simple', fontFamily: 'Arial', fontWeight: 'normal' },
    arrow: { color: '#ef4444', strokeWidth: 4, opacity: 1, arrowStyle: 'straight' },
    line: { color: '#2563eb', strokeWidth: 2, opacity: 1, measureUnit: 'm', measureDecimals: 2, fontFamily: 'Arial', fontWeight: 'normal' },
    bullet: { color: '#ef4444', fontSize: 24, opacity: 1, bulletShape: 'circle', fontFamily: 'Arial', fontWeight: 'bold', bulletType: 'numbers' },
    callout: { color: 'black', fontSize: 16, opacity: 1, textStyle: 'boxed', textBgColor: '#ffffff', fontFamily: 'Arial', fontWeight: 'normal', calloutShape: 'box', calloutArrowHead: 'arrow' },
    circle: { color: '#ef4444', opacity: 0.5, strokeWidth: 2, label: '', showArea: false, showPerimeter: false },
    triangle: { color: '#ef4444', opacity: 0.5, strokeWidth: 2, label: '', showArea: false, showPerimeter: false },
    image: { opacity: 1 },
    axis: { strokeWidth: 1, color: '#4b5563', axisConfig: { spacingMm: 6000, count: 5, startLabel: '1', lengthMm: 10000, bothEnds: false, reverse: false } }
  });

  const [pageConfig, setPageConfig] = useState<PageConfig>({
      headerHeight: 60, footerHeight: 100, fontSizeScale: 1.0, showLogo: true
  });
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [bulletCounter, setBulletCounter] = useState(1); 
  const [showArea, setShowArea] = useState(true); 
  const [pendingMeasurementPixels, setPendingMeasurementPixels] = useState<number | null>(null);
  const [showCalibrationList, setShowCalibrationList] = useState(false);
  const [pendingCoordPoint, setPendingCoordPoint] = useState<Point | null>(null);
  const [editingCoordIndex, setEditingCoordIndex] = useState<number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerTargetId, setIconPickerTargetId] = useState<string | null>(null);
  const [showAxisModal, setShowAxisModal] = useState(false);
  
  const [allowOutsideDraw, setAllowOutsideDraw] = useState(false);
  const [preventOverlap, setPreventOverlap] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [autoIncrementLabels, setAutoIncrementLabels] = useState(true);
  const [snapToBackground, setSnapToBackground] = useState(false);

  // --- INITIALIZATION & EFFECTS ---

  useEffect(() => {
      if (activeSheet && activeSheet.imageData) {
          const img = new Image();
          img.src = activeSheet.imageData;
          img.onload = () => setImage(img);
      } else {
          setImage(null);
      }
      if (activeSheet) {
          setHistory([activeSheet.shapes]);
          setHistoryIndex(0);
      } else {
          setHistory([[]]);
          setHistoryIndex(0);
      }
      setSelectedIds([]);
  }, [activeSheetId]);

  useEffect(() => {
      const updateDimensions = () => {
          if (containerRef.current) {
              setContainerDimensions({
                  width: containerRef.current.offsetWidth,
                  height: containerRef.current.offsetHeight
              });
          }
      };
      window.addEventListener('resize', updateDimensions);
      updateDimensions();
      return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // GRID TOOL AUTO-INIT Logic
  useEffect(() => {
    if (tool === 'grid_tool' && activeSheet) {
        if (!activeSheet.gridConfig) {
            updateActiveSheet({
                gridConfig: { visible: true, sizeMm: 1000, offsetX: 0, offsetY: 0, color: '#000000', opacity: 0.1 }
            });
        } else if (!activeSheet.gridConfig.visible) {
             updateActiveSheet({
                gridConfig: { ...activeSheet.gridConfig, visible: true }
            });
        }
    }
  }, [tool, activeSheetId]);

  // Compute Scale
  const pixelsPerMeter = useMemo(() => {
    if (!activeSheet) return null;
    const { coordRefs, calibrationData } = activeSheet;
    if (coordRefs.length === 2) {
        const p1 = coordRefs[0]; const p2 = coordRefs[1];
        const dPx = Math.sqrt(Math.pow(p2.pixel.x - p1.pixel.x, 2) + Math.pow(p2.pixel.y - p1.pixel.y, 2));
        const dWorld = Math.sqrt(Math.pow(p2.world.x - p1.world.x, 2) + Math.pow(p2.world.y - p1.world.y, 2));
        if (dWorld > 0) return dPx / dWorld;
    }
    if (calibrationData.length > 0) {
        const totalPixels = calibrationData.reduce((sum, item) => sum + item.pixels, 0);
        const totalMeters = calibrationData.reduce((sum, item) => sum + item.meters, 0);
        return totalMeters > 0 ? totalPixels / totalMeters : null;
    }
    return null;
  }, [activeSheet]);

  const isCalibrated = !!pixelsPerMeter;

  // --- ACTIONS ---
  
  const addToHistory = (shapes: Shape[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(shapes)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          updateActiveSheet({ shapes: history[newIndex] });
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          updateActiveSheet({ shapes: history[newIndex] });
      }
  };

  // --- COPY / PASTE LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (selectedIds.length > 0 && activeSheet) {
                const shapesToCopy = activeSheet.shapes.filter(s => selectedIds.includes(s.id));
                if (shapesToCopy.length > 0) {
                    setClipboard(shapesToCopy);
                }
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            if (clipboard.length > 0 && activeSheet) {
                const newShapes: Shape[] = [];
                const newIds: string[] = [];
                const offset = 20 / activeSheet.scale;

                clipboard.forEach(s => {
                    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    const newPoints = s.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
                    
                    const newShape: Shape = {
                        ...s,
                        id: newId,
                        points: newPoints,
                    };
                    newShapes.push(newShape);
                    newIds.push(newId);
                });

                const updatedShapes = [...activeSheet.shapes, ...newShapes];
                updateActiveSheet({ shapes: updatedShapes });
                addToHistory(updatedShapes);
                setSelectedIds(newIds);
            }
        }
    };

    const handlePaste = (e: ClipboardEvent) => {
        if (!activeSheet) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imgData = event.target?.result as string;
                        const img = new Image();
                        img.src = imgData;
                        img.onload = () => {
                            const centerX = (-activeSheet.viewport.x + containerDimensions.width / 2) / activeSheet.scale;
                            const centerY = (-activeSheet.viewport.y + containerDimensions.height / 2) / activeSheet.scale;
                            const w = 200 / activeSheet.scale;
                            const h = (w * img.height) / img.width;
                            
                            const newShape: Shape = {
                                id: Date.now().toString(),
                                type: 'image',
                                points: [
                                    { x: centerX - w/2, y: centerY - h/2 },
                                    { x: centerX + w/2, y: centerY - h/2 },
                                    { x: centerX + w/2, y: centerY + h/2 },
                                    { x: centerX - w/2, y: centerY + h/2 }
                                ],
                                color: 'transparent',
                                label: 'Pilt',
                                areaNumber: 0,
                                imageUrl: imgData,
                                opacity: 1
                            };
                            
                            const newShapes = [...activeSheet.shapes, newShape];
                            updateActiveSheet({ shapes: newShapes });
                            addToHistory(newShapes);
                            setSelectedIds([newShape.id]);
                        };
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('paste', handlePaste);
    };
  }, [selectedIds, activeSheet, clipboard, containerDimensions]);


  const handleCreateSheet = (type: 'blank' | 'upload' | 'paste', data?: any) => {
      const id = Date.now().toString();
      const newSheet: Sheet = {
          id,
          name: `Leht ${sheets.length + 1}`,
          imageData: null,
          imageDimensions: { width: 0, height: 0 },
          shapes: [], calibrationData: [], coordRefs: [],
          viewport: { x: 20, y: 20, scale: 1 }, scale: 1,
          floor: "Korrus 1", title: "Uus Projekt", description: ""
      };

      if (type === 'blank' && data) {
          const aspectRatio = data.width / data.height;
          // Increased maxDim from 3000 to 14000 to allow high-precision zooming (mm level)
          // 14000px / 100m = 140px/m.
          const maxDim = 14000;
          let canvasW = maxDim;
          let canvasH = maxDim;

          if (aspectRatio > 1) {
              canvasH = maxDim / aspectRatio;
              canvasW = maxDim;
          } else {
              canvasW = maxDim * aspectRatio;
              canvasH = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(canvasW);
          canvas.height = Math.round(canvasH);
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

          newSheet.imageData = canvas.toDataURL('image/png');
          newSheet.imageDimensions = { width: canvas.width, height: canvas.height };

          if (data.unit === 'm' || data.unit === 'mm') {
              const metersW = data.unit === 'm' ? data.width : data.width / 1000;
              newSheet.calibrationData = [{
                  pixels: canvas.width,
                  meters: metersW
              }];
          }

          // Calculate fit-to-screen scale (same as for uploaded images)
          const vw = window.innerWidth - 320; // Account for sidebar
          const vh = window.innerHeight - 60; // Account for toolbar
          const fitScale = Math.min(vw / canvas.width, vh / canvas.height) * 0.9;
          newSheet.scale = fitScale;
          newSheet.viewport = { x: (vw - canvas.width * fitScale) / 2, y: 20, scale: fitScale };

          setSheets(prev => [...prev, newSheet]);
          setActiveSheetId(id);
      } else if (type === 'upload' && data) {
          processFileForSheet(data, newSheet);
      }
      setShowNewSheetModal(false);
  };

  const processFileForSheet = async (file: File, sheet: Sheet) => {
    setIsLoading(true);
    try {
        let imgData = ''; let w = 0, h = 0;
        if (file.type === 'application/pdf') {
            const result = await loadPdfPage(file);
            if (result) { imgData = result.image.src; w = result.image.width; h = result.image.height; }
        } else {
             imgData = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(file); });
             const tempImg = new Image(); tempImg.src = imgData; await new Promise(r => tempImg.onload = r); w = tempImg.width; h = tempImg.height;
        }
        const vw = window.innerWidth - 320; const vh = window.innerHeight - 60; const fitScale = Math.min(vw / w, vh / h) * 0.9;
        const updatedSheet = { ...sheet, imageData: imgData, imageDimensions: { width: w, height: h }, scale: fitScale, viewport: { x: (vw - w * fitScale) / 2, y: 20, scale: fitScale }, title: file.name.replace(/\.[^/.]+$/, "") };
        setSheets(prev => [...prev, updatedSheet]);
        setActiveSheetId(sheet.id);
    } catch (err) { console.error(err); showError('Viga', 'Viga faili laadimisel.'); } finally { setIsLoading(false); }
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) { setShowNewSheetModal(true); } 
  };

  const addToRecentTools = (toolType: ToolType, style: Partial<Shape>, label: string) => {
      setRecentTools(prev => {
          const newTool: RecentTool = { type: toolType, style, label, timestamp: Date.now() };
          const updated = [newTool, ...prev].slice(0, 3);
          return updated;
      });
  };

  const handleUseRecentTool = (rt: RecentTool) => {
      setTool(rt.type);
      const typeMap: Record<string, string> = { 
          'circle': 'circle', 'triangle': 'triangle', 'rectangle': 'rectangle', 'polygon': 'polygon', 'square': 'square',
          'arrow': 'arrow', 'line': 'line', 'icon': 'icon', 'text': 'text', 'bullet': 'bullet', 'callout': 'callout'
      };
      const key = typeMap[rt.type] || rt.type;
      
      setDefaultStyles(prev => ({
          ...prev,
          [key]: { ...prev[key], ...rt.style }
      }));
  };

  // --- SHAPE MANAGEMENT (Proxied to activeSheet) ---

  const handleShapeAdd = (shape: Shape) => {
      handleShapesAdd([shape]);
  };

  // Improved Shape Adder that handles batches (essential for Axis system which adds 2 shapes)
  const handleShapesAdd = (shapesToAdd: Shape[]) => {
      if (!activeSheet) return;
      let currentShapes = [...activeSheet.shapes];
      
      shapesToAdd.forEach(shape => {
          const defaults = defaultStyles[shape.type] || {};
          let label = shape.label;
          
          if (autoIncrementLabels) {
              const typeNameMap: Record<string, string> = {
                  'triangle': 'Kolmnurk',
                  'circle': 'Ring',
                  'arrow': 'Nool',
                  'text': 'Tekst',
                  'rectangle': 'Kast',
                  'square': 'Ruut',
                  'polygon': 'Ala',
                  'line': 'Mõõt',
                  'axis': 'Telg'
              };
              
              if (shape.type === 'square') {
                  const count = currentShapes.filter(s => s.type === 'square').length + 1;
                  label = `Ruut ${count}`;
              } else if (!label) {
                  const baseName = typeNameMap[shape.type] || shape.type;
                  const count = currentShapes.filter(s => s.type === shape.type).length + 1;
                  label = `${baseName} ${count}`;
              } else if (['polygon', 'rectangle'].includes(shape.type)) {
                  // UNIFY COUNTING FOR POLYGON & RECTANGLE -> "Alad"
                  const count = currentShapes.filter(s => ['polygon', 'rectangle'].includes(s.type)).length + 1;
                  const baseLabel = label.replace(/\d+$/, '').trim();
                  label = `${baseLabel} ${count}`;
              }
          }

          if (shape.type === 'bullet') {
              const bullets = currentShapes.filter(s => s.type === 'bullet');
              const nextIndex = bullets.length + 1;
              const bType = defaults.bulletType || 'numbers';
              
              let bLabel = nextIndex.toString();
              if (bType === 'letters') {
                  bLabel = String.fromCharCode(64 + nextIndex);
              } else if (bType === 'roman') {
                  bLabel = toRoman(nextIndex);
              }
              shape.bulletLabel = bLabel;
          }

          const newShape = { ...shape, ...defaults, label, visible: true, locked: false };
          
          if (shape.type === 'polygon' || shape.type === 'rectangle') {
              const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
              newShape.color = randomColor;
              if(defaults.showArea !== undefined) newShape.showArea = defaults.showArea;
              if(defaults.showPerimeter !== undefined) newShape.showPerimeter = defaults.showPerimeter;
              if(defaults.showSideLengths !== undefined) newShape.showSideLengths = defaults.showSideLengths;
              if(defaults.textPadding !== undefined) newShape.textPadding = defaults.textPadding;
          } else if (defaults.color) {
              newShape.color = defaults.color;
          }
          
          currentShapes.push(newShape);

          // Only add to recent tools if it's a single user action (or the last one of batch)
          if (shapesToAdd.length === 1 || shape === shapesToAdd[shapesToAdd.length-1]) {
              addToRecentTools(tool, { 
                  color: newShape.color, 
                  strokeWidth: newShape.strokeWidth, 
                  opacity: newShape.opacity,
                  bulletType: newShape.bulletType,
                  iconName: newShape.iconName,
                  calloutShape: newShape.calloutShape,
                  calloutArrowHead: newShape.calloutArrowHead,
                  axisConfig: newShape.axisConfig
              }, newShape.type === 'icon' ? (newShape.iconName || 'Ikoon') : (newShape.type === 'bullet' ? 'Samm' : newShape.label));
          }
      });

      updateActiveSheet({ shapes: currentShapes });
      addToHistory(currentShapes);
  };

  const handleShapeUpdate = (id: string, updates: Partial<Shape>) => {
      if (!activeSheet) return;
      const newShapes = activeSheet.shapes.map(s => s.id === id ? { ...s, ...updates } : s);
      updateActiveSheet({ shapes: newShapes });
  };
  
  const handleShapesUpdate = (updates: { id: string; points: Point[] }[]) => {
      if (!activeSheet) return;
      const newShapes = activeSheet.shapes.map(s => { const u = updates.find(up => up.id === s.id); return u ? { ...s, points: u.points } : s; });
      updateActiveSheet({ shapes: newShapes });
  };

  const handleShapeDelete = (ids: string[]) => {
      if (!activeSheet) return;
      const newShapes = activeSheet.shapes.filter(s => !ids.includes(s.id));
      updateActiveSheet({ shapes: newShapes });
      setSelectedIds([]);
      addToHistory(newShapes);
  };

  const handleDefaultStyleUpdate = (type: string, updates: Partial<Shape>) => {
    setDefaultStyles(prev => ({ ...prev, [type]: { ...prev[type], ...updates } }));
  };

  const handleSaveStyle = (style: Partial<Shape>) => {
    const name = prompt("Sisesta stiili nimi:", "Uus Stiil");
    if (name) {
        const cleanStyle: Partial<Shape> = {
            color: style.color, opacity: style.opacity, strokeWidth: style.strokeWidth,
            fontSize: style.fontSize, fontFamily: style.fontFamily, fontWeight: style.fontWeight,
            fontStyle: style.fontStyle, textStyle: style.textStyle, textColor: style.textColor,
            textBgColor: style.textBgColor, showArea: style.showArea, showPerimeter: style.showPerimeter,
            showSideLengths: style.showSideLengths, textPadding: style.textPadding,
            iconName: style.iconName, iconStyle: style.iconStyle, bulletShape: style.bulletShape,
            arrowStyle: style.arrowStyle, calloutShape: style.calloutShape, calloutArrowHead: style.calloutArrowHead,
            axisConfig: style.axisConfig,
        };
        const newStyle = { id: Date.now().toString(), name, style: cleanStyle };
        setSavedStyles(prev => {
            const updated = [...prev, newStyle];
            localStorage.setItem('vm_savedStyles', JSON.stringify(updated));
            return updated;
        });
    }
  };

  const handleDeleteStyle = (id: string) => {
    if(confirm("Kas oled kindel?")) { 
        setSavedStyles(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('vm_savedStyles', JSON.stringify(updated));
            return updated;
        });
    }
  };

  const handleAxisCreateStart = (type: 'x' | 'y' | 'both', configX: AxisConfig, configY?: AxisConfig, fullExtent?: boolean) => {
      setShowAxisModal(false);
      
      // Calculate length based on Full Extent if requested
      if (fullExtent && activeSheet) {
          const pxPerMm = pixelsPerMeter ? pixelsPerMeter / 1000 : 1;
          const wMm = activeSheet.imageDimensions.width / pxPerMm;
          const hMm = activeSheet.imageDimensions.height / pxPerMm;
          
          // For Vertical axes (X), the length is the Height of the image
          configX.lengthMm = hMm * 0.9; // 90% of height for safety margin
          
          // For Horizontal axes (Y), the length is the Width of the image
          if (configY) configY.lengthMm = wMm * 0.9;
      }

      setDefaultStyles(prev => ({
          ...prev,
          axis: { ...prev.axis, axisConfig: configX }
      }));
      setAxisCreationConfig({ type, configX, configY });
      setTool('axis_tool');
  };

  const [axisCreationConfig, setAxisCreationConfig] = useState<{type: 'x'|'y'|'both', configX: AxisConfig, configY?: AxisConfig} | null>(null);

  // --- SAVE / LOAD / EXPORT ---
  const handleSaveProject = () => {
      const projectData: ProjectFile = { version: 2, sheets, activeSheetId: activeSheetId || '', pageConfig, savedStyles, customColors };
      const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `projekt.json`; link.click(); URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target?.result as string) as ProjectFile;
            if (data.sheets) { setSheets(data.sheets); setActiveSheetId(data.activeSheetId || data.sheets[0].id); } 
            else if (data.imageData) { const sheet: Sheet = { id: 'legacy', name: 'Leht 1', imageData: data.imageData, imageDimensions: { width: 0, height: 0 }, shapes: data.shapes || [], calibrationData: data.calibrationData || [], coordRefs: data.coordRefs || [], scale: 1, viewport: { x: 0, y: 0, scale: 1 }, floor: data.floor || '', title: data.title || '', description: data.description || '' }; setSheets([sheet]); setActiveSheetId('legacy'); }
            if (data.savedStyles) setSavedStyles(data.savedStyles);
            if (data.pageConfig) setPageConfig(data.pageConfig);
            if (data.customColors) setCustomColors(data.customColors);
        } catch (e) { showError('Viga', 'Viga faili lugemisel'); }
    };
    reader.readAsText(file);
  };

  const handleExport = async (options: ExportOptions) => {
    if (!activeSheet) {
      showError('Ekspordi viga', 'Aktiivne leht puudub');
      return;
    }

    setIsExporting(true);

    try {
      const filename = activeSheet.title || 'joonis';

      if (options.format === 'png') {
        if (!image) {
          showError('Ekspordi viga', 'Pilt puudub');
          setIsExporting(false);
          return;
        }

        const svgEl = document.querySelector('#canvas-layer svg') as SVGSVGElement;
        if (!svgEl) {
          showError('Ekspordi viga', 'SVG element puudub');
          setIsExporting(false);
          return;
        }

        const blob = await exportToPng({ sheet: activeSheet, image, svgElement: svgEl });
        downloadBlob(blob, `${filename}.png`);
        showSuccess('Eksport onnestus', 'PNG fail on allalaaditud');
      } else if (options.format === 'pdf') {
        if (!image) {
          showError('Ekspordi viga', 'Pilt puudub PDF loomiseks');
          setIsExporting(false);
          return;
        }

        const blob = await exportToPdf({
          sheet: activeSheet,
          image,
          pixelsPerMeter,
          pageConfig,
          includeHeader: options.includeHeader,
          includeFooter: options.includeFooter
        });
        downloadBlob(blob, `${filename}.pdf`);
        showSuccess('Eksport onnestus', 'PDF fail on allalaaditud');
      } else if (options.format === 'dxf') {
        const dxfContent = exportToDxf({
          sheet: activeSheet,
          pixelsPerMeter,
          useWorldCoordinates: options.useWorldCoordinates,
          includeLabels: options.includeLabels,
          includeMeasurements: options.includeMeasurements,
          layerPrefix: options.layerPrefix
        });
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        downloadBlob(blob, `${filename}.dxf`);
        showSuccess('Eksport onnestus', 'DXF fail on allalaaditud.\nFail on uhilduv Trimble Connect, AutoCAD jt rakendustega.');
      } else if (options.format === 'geojson') {
        const geojson = exportToGeoJson({
          sheet: activeSheet,
          pixelsPerMeter,
          useWorldCoordinates: options.useWorldCoordinates
        });
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
        downloadBlob(blob, `${filename}.geojson`);
        showSuccess('Eksport onnestus', 'GeoJSON fail on allalaaditud');
      } else if (options.format === 'ifc') {
        const ifcContent = exportToIfc({
          sheet: activeSheet,
          pixelsPerMeter,
          useWorldCoordinates: options.useWorldCoordinates,
          projectName: activeSheet.title || 'Visual Mapper Project',
          floorName: activeSheet.floor || 'Korrus 1',
          floorElevation: 0
        });
        const blob = new Blob([ifcContent], { type: 'application/x-step' });
        downloadBlob(blob, `${filename}.ifc`);
        showSuccess('Eksport onnestus', 'IFC fail on allalaaditud.\nFail on uhilduv Trimble Connect, Revit, ArchiCAD jt BIM rakendustega.');
      }

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      showError('Ekspordi viga', error instanceof Error ? error.message : 'Tundmatu viga eksportimisel');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickExportPng = async () => {
    if (!activeSheet || !image) {
      showError('Ekspordi viga', 'Pilt puudub');
      return;
    }

    const svgEl = document.querySelector('#canvas-layer svg') as SVGSVGElement;
    if (!svgEl) {
      showError('Ekspordi viga', 'SVG element puudub');
      return;
    }

    try {
      const blob = await exportToPng({ sheet: activeSheet, image, svgElement: svgEl });
      downloadBlob(blob, `${activeSheet.title || 'joonis'}.png`);
    } catch (error) {
      showError('Ekspordi viga', error instanceof Error ? error.message : 'PNG loomine ebaonnestus');
    }
  };

  return (
    <div className="flex flex-col h-screen" onDragOver={(e) => e.preventDefault()} onDrop={handleGlobalDrop}>
      <Toolbar 
        currentTool={tool} setTool={(t) => {
            if (t === 'axis_tool') {
                setShowAxisModal(true);
            } else {
                setTool(t);
                setAxisCreationConfig(null);
            }
        }} 
        scale={activeSheet?.scale || 1} 
        setScale={(s) => updateActiveSheet({ scale: s })} 
        onUpload={(e) => { if(e.target.files?.[0]) handleCreateSheet('upload', e.target.files[0]); }}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExport={handleQuickExportPng}
        onExportPdf={() => setShowExportModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        title={activeSheet?.title || "Projekt"} 
        setTitle={(t) => updateActiveSheet({ title: t })}
        description={activeSheet?.description || ""} 
        setDescription={(d) => updateActiveSheet({ description: d })}
        floor={activeSheet?.floor || ""} 
        setFloor={(f) => updateActiveSheet({ floor: f })}
        pixelsPerMeter={pixelsPerMeter}
        showArea={showArea} setShowArea={setShowArea}
        calibrationCount={activeSheet?.calibrationData.length || 0}
        allowOutsideDraw={allowOutsideDraw} setAllowOutsideDraw={setAllowOutsideDraw}
        preventOverlap={preventOverlap} setPreventOverlap={setPreventOverlap}
        onUndo={undo} onRedo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
        showCoords={showCoords} setShowCoords={setShowCoords}
        showDimensions={showDimensions} setShowDimensions={setShowDimensions}
        onManageCalibrations={() => setShowCalibrationList(true)}
        onManageCoords={() => { setTool('coords'); setShowCoords(true); }}
        autoIncrementLabels={autoIncrementLabels} setAutoIncrementLabels={setAutoIncrementLabels}
        onOpenPageSettings={() => setShowPageSettings(true)}
        snapToBackground={snapToBackground} setSnapToBackground={setSnapToBackground}
        isCalibrated={isCalibrated}
        onNewPage={() => setShowNewSheetModal(true)}
        onOpenCranePicker={() => setShowCranePicker(true)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 relative bg-gray-200 flex flex-col" ref={containerRef} id="canvas-layer">
          {!activeSheet && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
              <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100 max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Alusta</h3>
                <div className="flex gap-4 justify-center mt-4">
                    <button onClick={() => setShowNewSheetModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Loo Uus Leht</button>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && (<div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>)}
          
          {activeSheet && (
            <>
                <Canvas 
                    image={image} shapes={activeSheet.shapes} tool={tool} scale={activeSheet.scale}
                    setScale={(s) => updateActiveSheet({ scale: s })} viewport={activeSheet.viewport}
                    setViewport={(v) => updateActiveSheet({ viewport: v })} 
                    onShapeAdd={handleShapeAdd}
                    onShapesAdd={handleShapesAdd}
                    onShapeUpdate={handleShapeUpdate} onShapesUpdate={handleShapesUpdate}
                    onShapeUpdateEnd={() => { if(activeSheet) addToHistory(activeSheet.shapes); }}
                    onShapeDelete={handleShapeDelete} selectedIds={selectedIds} onSelect={setSelectedIds}
                    onDuplicate={(ids) => {/* duplicate logic */}} onReorder={(id, dir) => {/* reorder logic */}}
                    pixelsPerMeter={pixelsPerMeter} onMeasure={(pixels) => setPendingMeasurementPixels(pixels)} 
                    onApplyCrop={() => {}} showArea={showArea} onToolChange={setTool} 
                    allowOutsideDraw={allowOutsideDraw} preventOverlap={preventOverlap}
                    coordRefs={activeSheet.coordRefs} onCoordClick={(p) => { if (activeSheet.coordRefs.length < 2) setPendingCoordPoint(p); }}
                    onCoordEdit={(idx) => setEditingCoordIndex(idx)} onCoordMove={(idx, p) => { const newRefs = [...activeSheet.coordRefs]; if(newRefs[idx]) newRefs[idx].pixel = p; updateActiveSheet({ coordRefs: newRefs }); }}
                    showCoords={showCoords} showDimensions={showDimensions} title={activeSheet.title} description={activeSheet.description}
                    floor={activeSheet.floor} bulletCounter={bulletCounter} incrementBullet={() => setBulletCounter(c => c + 1)}
                    pageConfig={pageConfig} snapToBackground={snapToBackground}
                    gridConfig={activeSheet.gridConfig} onUpdateGridConfig={(gc) => updateActiveSheet({ gridConfig: gc })}
                    recentTools={recentTools} onUseRecentTool={handleUseRecentTool}
                    defaultStyles={defaultStyles}
                    axisCreationConfig={axisCreationConfig}
                    onShowAlert={(type, title, message) => {
                      if (type === 'error') showError(title, message);
                      else if (type === 'warning') showWarning(title, message);
                      else showSuccess(title, message);
                    }}
                />
                
                {/* MINIMAP RESTORED */}
                {image && (
                    <Minimap 
                        image={image} 
                        viewport={activeSheet.viewport} 
                        setViewport={(v) => updateActiveSheet({ viewport: v })} 
                        scale={activeSheet.scale} 
                        setScale={(s) => updateActiveSheet({ scale: s })}
                        containerWidth={containerDimensions.width}
                        containerHeight={containerDimensions.height}
                    />
                )}
                
                {/* BOTTOM TAB BAR */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-white border-t border-gray-200 flex items-center px-2 gap-1 z-30">
                    {sheets.map(sheet => (
                        <div 
                            key={sheet.id}
                            onClick={() => setActiveSheetId(sheet.id)}
                            onDoubleClick={() => setEditingTabId(sheet.id)}
                            className={`
                                group relative px-3 py-1.5 text-xs font-medium rounded-t-lg cursor-pointer border-t-2 flex items-center gap-2 select-none
                                ${activeSheetId === sheet.id ? 'bg-gray-100 border-blue-500 text-blue-700' : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'}
                            `}
                            title={sheet.name}
                        >
                            {editingTabId === sheet.id ? (
                                <input 
                                    autoFocus
                                    className="w-20 bg-transparent outline-none border-b border-blue-500"
                                    value={sheet.name}
                                    onChange={(e) => setSheets(prev => prev.map(s => s.id === sheet.id ? {...s, name: e.target.value} : s))}
                                    onBlur={() => setEditingTabId(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingTabId(null)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span>{sheet.name}</span>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSheets(prev => prev.filter(s => s.id !== sheet.id)); if(activeSheetId===sheet.id) setActiveSheetId(sheets[0]?.id || null); }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-gray-200"
                            >
                                <X size={10} />
                            </button>
                            
                            {/* Thumbnail Preview */}
                            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white shadow-xl border p-1 rounded hidden group-hover:block z-50 pointer-events-none">
                                {sheet.imageData ? (
                                    <img src={sheet.imageData} alt="" className="w-full h-auto" />
                                ) : (
                                    <div className="w-full h-20 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">Tühi</div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setShowNewSheetModal(true)}
                        className="px-2 py-1 hover:bg-gray-100 rounded text-gray-500" title="Uus Leht"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </>
          )}

           {/* Modals */}
           {showNewSheetModal && <NewSheetModal onClose={() => setShowNewSheetModal(false)} onCreate={handleCreateSheet} />}
           {showAxisModal && <AxisCreationModal onConfirm={handleAxisCreateStart} onCancel={() => { setShowAxisModal(false); setTool('select'); }} />}
           {pendingMeasurementPixels !== null && activeSheet && (<CalibrationModal pixelLength={pendingMeasurementPixels} existingScale={pixelsPerMeter} onConfirm={(meters) => { updateActiveSheet({ calibrationData: [...activeSheet.calibrationData, { pixels: pendingMeasurementPixels, meters }] }); setPendingMeasurementPixels(null); }} onCancel={() => setPendingMeasurementPixels(null)} />)}
           {(pendingCoordPoint !== null || editingCoordIndex !== null) && activeSheet && (<CoordinateModal pointIndex={editingCoordIndex !== null ? (activeSheet.coordRefs[editingCoordIndex].id) : (activeSheet.coordRefs.length === 0 ? 1 : 2)} initialValues={editingCoordIndex !== null ? activeSheet.coordRefs[editingCoordIndex].world : undefined} onConfirm={(x,y,z) => { if (pendingCoordPoint) { const id = (activeSheet.coordRefs.length + 1) as 1|2; updateActiveSheet({ coordRefs: [...activeSheet.coordRefs, { id, pixel: pendingCoordPoint, world: {x,y,z} }]}); setPendingCoordPoint(null); } else if (editingCoordIndex !== null) { const newRefs = [...activeSheet.coordRefs]; newRefs[editingCoordIndex].world = {x,y,z}; updateActiveSheet({ coordRefs: newRefs }); setEditingCoordIndex(null); } }} onDelete={editingCoordIndex !== null ? () => { updateActiveSheet({ coordRefs: activeSheet.coordRefs.filter((_, i) => i !== editingCoordIndex) }); setEditingCoordIndex(null); } : undefined} onCancel={() => { setPendingCoordPoint(null); setEditingCoordIndex(null); }} />)}
           {showCalibrationList && activeSheet && (<CalibrationListModal calibrations={activeSheet.calibrationData} onUpdate={(index, meters) => { const newData = [...activeSheet.calibrationData]; newData[index].meters = meters; updateActiveSheet({ calibrationData: newData }); }} onDelete={(index) => { const newData = activeSheet.calibrationData.filter((_, i) => i !== index); updateActiveSheet({ calibrationData: newData }); }} onClose={() => setShowCalibrationList(false)} />)}
           {showIconPicker && (<IconPickerModal onSelect={(iconName) => { if (iconPickerTargetId) { handleShapeUpdate(iconPickerTargetId, { iconName }); } else { handleDefaultStyleUpdate('icon', { iconName }); } setShowIconPicker(false); setIconPickerTargetId(null); }} onClose={() => { setShowIconPicker(false); setIconPickerTargetId(null); }} />)}
           {showPageSettings && (<PageSettingsModal config={pageConfig} onSave={setPageConfig} onClose={() => setShowPageSettings(false)} />)}

           {/* Crane Picker Modal */}
           <CranePickerModal
             isOpen={showCranePicker}
             onClose={() => setShowCranePicker(false)}
             onSelectCrane={(crane, config) => {
               if (!activeSheet || !pixelsPerMeter) return;
               // Add crane at center of current viewport
               const viewport = activeSheet.viewport;
               const centerX = (-viewport.x + (containerDimensions.width / 2)) / activeSheet.scale;
               const centerY = (-viewport.y + (containerDimensions.height / 2)) / activeSheet.scale;

               const newShape: Shape = {
                 id: Date.now().toString(),
                 type: 'crane',
                 points: [{ x: centerX, y: centerY }],
                 color: '#f97316', // Orange for crane
                 label: config?.modelName || crane.model,
                 areaNumber: 0,
                 opacity: 0.9,
                 craneConfig: config,
               };
               handleShapeAdd(newShape);
               setShowCranePicker(false);
             }}
             customCranes={customCranes}
             onAddCustomCrane={(crane) => setCustomCranes([...customCranes, crane])}
             onDeleteCustomCrane={(id) => setCustomCranes(customCranes.filter(c => c.id !== id))}
           />

           {/* Alert Modal */}
           <AlertModal
             isOpen={alertState.isOpen}
             type={alertState.type}
             title={alertState.title}
             message={alertState.message}
             onClose={hideAlert}
             onConfirm={alertState.onConfirm}
             showCancel={alertState.showCancel}
           />

           {/* Export Modal */}
           <ExportModal
             isOpen={showExportModal}
             onClose={() => setShowExportModal(false)}
             onExport={handleExport}
             hasCalibration={isCalibrated}
             hasCoordRefs={(activeSheet?.coordRefs?.length || 0) >= 2}
             isExporting={isExporting}
           />
        </div>

        <Sidebar 
          shapes={activeSheet?.shapes || []}
          selectedId={selectedIds.length === 1 ? selectedIds[0] : null} selectedIds={selectedIds}
          onSelect={(id) => setSelectedIds([id])} onMultiSelect={setSelectedIds}
          onDelete={(id) => handleShapeDelete([id])} onMultiDelete={handleShapeDelete}
          onUpdate={handleShapeUpdate} onMultiUpdate={(ids, u) => {
              if(!activeSheet) return;
              const newShapes = activeSheet.shapes.map(s => ids.includes(s.id) ? { ...s, ...u } : s);
              updateActiveSheet({ shapes: newShapes });
          }}
          onDuplicate={() => {}}
          pixelsPerMeter={pixelsPerMeter} 
          onOpenIconPicker={(id) => { setIconPickerTargetId(id); setShowIconPicker(true); }}
          savedStyles={savedStyles} onSaveStyle={handleSaveStyle} onDeleteStyle={handleDeleteStyle}
          currentTool={tool} defaultStyles={defaultStyles} onUpdateDefaultStyle={handleDefaultStyleUpdate}
          coordRefs={activeSheet?.coordRefs}
          onSelectCoord={(idx) => setEditingCoordIndex(idx)}
          customColors={customColors}
          onAddCustomColor={(c) => setCustomColors(prev => [...prev, c])}
          gridConfig={activeSheet?.gridConfig} onUpdateGridConfig={(gc) => updateActiveSheet({ gridConfig: gc })}
        />
      </div>
    </div>
  );
};

export default App;
