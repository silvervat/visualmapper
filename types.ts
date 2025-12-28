
export type Point = {
  x: number;
  y: number;
};

export type ShapeType = 'rectangle' | 'polygon' | 'icon' | 'arrow' | 'text' | 'bullet' | 'image' | 'line' | 'circle' | 'triangle' | 'callout' | 'axis' | 'square' | 'crane';

// Crane lifting capacity at specific radius
export interface CraneCapacity {
  radiusM: number;  // Working radius in meters
  capacityKg: number;  // Lifting capacity in kg
}

// Crane model definition for database
export interface CraneModel {
  id: string;
  manufacturer: string;
  model: string;
  type: 'mobile' | 'tower' | 'crawler' | 'truck';  // Kraana tüüp

  // Physical dimensions (in meters)
  bodyLengthM: number;   // Masina pikkus
  bodyWidthM: number;    // Masina laius

  // Outrigger/stabilizer positions (käpad) - relative to center
  outriggers: {
    spreadFrontM: number;   // Eesmised käpad laius
    spreadRearM: number;    // Tagumised käpad laius
    spreadSideM: number;    // Külgmised käpad laius
  };

  // Boom configurations
  boomLengths: number[];  // Available boom lengths in meters

  // Lifting capacity chart (at different radii)
  capacityChart: CraneCapacity[];

  // Optional additional info
  maxRadius: number;      // Maximum working radius
  maxHeight: number;      // Maximum lifting height
  counterweightKg?: number;
  notes?: string;
}

export interface AxisConfig {
  spacingMm: number; // Step in mm
  count: number;
  startLabel: string; // "1" or "A"
  lengthMm: number; // Length of lines in mm
  bothEnds: boolean; // Bubbles on both ends
  reverse: boolean; // Count downwards/backwards
}

export interface Shape {
  id: string;
  type: ShapeType;
  points: Point[]; // Polygon/Rect: many points; Arrow: start/end; Icon/Text/Bullet: 1 point (position)
  color: string;
  label: string; 
  areaNumber: number; 
  
  // State properties
  locked?: boolean;
  visible?: boolean;

  // Style properties
  fontSizeMode?: 'auto' | 'manual';
  fontSize?: number;
  opacity?: number;
  strokeWidth?: number;
  blur?: number;
  
  // Typography
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  
  // Text Styling
  textStyle?: 'simple' | 'boxed' | 'shadow'; 
  textColor?: string; 
  textBgColor?: string; 
  textShadowColor?: string; 
  textPadding?: number; // Padding around text in box mode
  
  // Measurement & Info Display
  showArea?: boolean; // Per-shape area toggle
  showPerimeter?: boolean; // Per-shape perimeter toggle
  showSideLengths?: boolean; // Show length of each side inside the shape
  measureUnit?: 'm' | 'mm'; 
  measureDecimals?: 0 | 1 | 2; 
  
  // Specific properties
  iconName?: string; 
  iconStyle?: 'simple' | 'circle' | 'square'; 
  iconBackgroundColor?: string; 
  iconBackgroundOpacity?: number; 
  
  bulletShape?: 'circle' | 'square' | 'triangle'; 
  bulletLabel?: string; 
  bulletType?: 'numbers' | 'letters' | 'roman';
  
  arrowStyle?: 'straight' | 'curved'; 
  
  // Callout Specific
  calloutShape?: 'box' | 'rounded' | 'circle' | 'none';
  calloutArrowHead?: 'arrow' | 'dot' | 'line' | 'none';
  
  imageUrl?: string; 
  
  // Axis System Specific
  axisConfig?: AxisConfig;
  axisDirection?: 'x' | 'y'; // Useful if we split them

  // Crane Specific (Kraana andmed)
  craneModelId?: string;           // Link to CraneModel database
  craneConfig?: {
    modelName: string;             // Kraana mudel (nt "LTM 1090-4.2")
    manufacturer: string;          // Tootja

    // Dimensions in meters
    bodyLengthM: number;           // Masina keha pikkus
    bodyWidthM: number;            // Masina keha laius
    cabinOffsetM: number;          // Kabiini asukoht eest (m)

    // Outriggers (Käpad) - distance from center
    outriggerSpreadM: number;      // Käppade laius (total width when extended)
    outriggerLengthM: number;      // Käppade pikkus

    // Wheel configuration
    wheelBaseM: number;            // Teljevahe (m)
    wheelAxles: number;            // Telgede arv (2, 3, 4, 5)

    // Working radius
    currentRadiusM: number;        // Praegune tööraadius
    showRadiusCircle: boolean;     // Näita tööraadius ringi
    radiusCircles: number[];       // Multiple radius circles to show

    // Boom
    boomLengthM: number;           // Noole pikkus
    boomAngleDeg: number;          // Noole suund (0 = paremal, 90 = üleval, -90 = all jne)

    // Rotation
    rotationDeg: number;           // Kraana keha pööre (0 = nool paremale)

    // Visual options
    showDimensions: boolean;       // Näita mõõtjooni
    showOutriggers: boolean;       // Näita käpasid
    showBoom: boolean;             // Näita noolt
    showWheels: boolean;           // Näita rattaid
  };
}

export interface SavedStyle {
  id: string;
  name: string;
  style: Partial<Shape>;
}

export interface RecentTool {
  type: ToolType;
  style: Partial<Shape>;
  label: string;
  timestamp: number;
}

export type ToolType = 'select' | 'rectangle' | 'polygon' | 'calibrate' | 'measure_line' | 'crop' | 'coords' | 'arrow' | 'icon' | 'text' | 'bullet' | 'circle' | 'triangle' | 'callout' | 'axis_tool' | 'grid_tool' | 'square' | 'crane';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  shapeId?: string; 
  handleIndex?: number;
  mode?: 'move' | 'resize' | 'resize_rect_corner' | 'resize_rect_side' | 'pan' | 'draw_rect' | 'draw_calibrate' | 'draw_measure_line' | 'draw_crop' | 'draw_rotate_line' | 'draw_arrow' | 'move_coord' | 'draw_circle' | 'draw_triangle' | 'move_callout_target' | 'draw_axis' | 'resize_axis_len' | 'move_grid' | 'draw_callout' | 'draw_square';
  initialPoints?: Point[]; 
  initialShapesMap?: Record<string, Point[]>; 
  isOverlappingAtStart?: boolean;
}

export interface PolygonDrawState {
  isActive: boolean;
  points: Point[];
}

export interface CoordinateReference {
  pixel: Point;
  world: { x: number; y: number; z?: number };
  id: 1 | 2;
}

export interface GridConfig {
  visible: boolean;
  sizeMm: number; // Grid step in mm
  offsetX: number; // Pixels
  offsetY: number; // Pixels
  color: string;
  opacity: number;
}

// Page / Export Settings
export interface PageConfig {
  headerHeight: number;
  footerHeight: number;
  fontSizeScale: number; // 1.0 is default
  showLogo: boolean;
}

// Sheet/Page definition for Tabs
export interface Sheet {
    id: string;
    name: string;
    imageData: string | null;
    thumbnailData?: string | null; // For hover preview
    imageDimensions: { width: number, height: number };
    shapes: Shape[];
    calibrationData: {pixels: number, meters: number}[];
    coordRefs: CoordinateReference[];
    viewport: Viewport;
    scale: number;
    floor: string;
    title: string;
    description: string;
    gridConfig?: GridConfig;
    pdfId?: string;  // For dynamic PDF re-rendering at different zoom levels
    currentPdfResolution?: number;  // Current render resolution
    pdfAspectRatio?: number;  // Original PDF aspect ratio (width/height)
}

// Project File Structure for Save/Load
export interface ProjectFile {
  version: number;
  sheets: Sheet[]; // Multi-page support
  activeSheetId: string;
  pageConfig?: PageConfig;
  savedStyles?: SavedStyle[];
  customColors?: string[]; // Persist custom colors
  // Legacy support
  title?: string;
  description?: string;
  floor?: string;
  imageData?: string;
  shapes?: Shape[];
  calibrationData?: {pixels: number, meters: number}[];
  coordRefs?: CoordinateReference[];
}
