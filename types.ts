
export type Point = {
  x: number;
  y: number;
};

export type ShapeType = 'rectangle' | 'polygon' | 'icon' | 'arrow' | 'text' | 'bullet' | 'image' | 'line' | 'circle' | 'triangle' | 'callout' | 'axis' | 'square';

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

export type ToolType = 'select' | 'rectangle' | 'polygon' | 'calibrate' | 'measure_line' | 'crop' | 'coords' | 'arrow' | 'icon' | 'text' | 'bullet' | 'circle' | 'triangle' | 'callout' | 'axis_tool' | 'grid_tool' | 'square';

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
