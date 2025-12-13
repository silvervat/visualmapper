
import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Square, Hexagon, ZoomIn, ZoomOut, Upload, Download, Ruler, Crop, Eye, EyeOff, Globe, Lock, Unlock, Undo2, Redo2, MapPin, Tag, FileText, SquareStack, Save, FolderOpen, ArrowRight, Zap, Type, ListOrdered, Hash, LayoutTemplate, Magnet, Scale, Table2, Circle, Triangle, MessageSquare, PlusCircle, Grid } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
  scale: number;
  setScale: (s: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onExportPdf: () => void;
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  floor: string;
  setFloor: (f: string) => void;
  pixelsPerMeter: number | null;
  showArea: boolean;
  setShowArea: (b: boolean) => void;
  calibrationCount?: number;
  allowOutsideDraw: boolean;
  setAllowOutsideDraw: (b: boolean) => void;
  preventOverlap: boolean;
  setPreventOverlap: (b: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showCoords: boolean;
  setShowCoords: (b: boolean) => void;
  showDimensions: boolean;
  setShowDimensions: (b: boolean) => void;
  onManageCalibrations?: () => void;
  onManageCoords?: () => void;
  autoIncrementLabels: boolean;
  setAutoIncrementLabels: (b: boolean) => void;
  onOpenPageSettings: () => void;
  snapToBackground?: boolean;
  setSnapToBackground?: (b: boolean) => void;
  isCalibrated?: boolean;
  onNewPage: () => void;
}

const ToolButton = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label, 
    disabled = false,
    className,
    onMouseEnter,
    onMouseLeave,
    buttonRef,
    title
}: { 
    active?: boolean, 
    onClick: () => void, 
    icon: any, 
    label: string, 
    disabled?: boolean,
    className?: string,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
    buttonRef?: React.RefObject<HTMLButtonElement | null>,
    title?: string
}) => (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all w-16 h-14 gap-0.5 relative
        ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-100'}
        ${active ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-600'}
        ${className || ''}
      `}
      title={title || label}
    >
      <Icon size={20} className={active ? 'stroke-[2.5px]' : ''} />
      <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
      {disabled && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-px bg-gray-400 rotate-45 opacity-50"></div></div>}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ 
  currentTool, setTool, scale, setScale, onUpload, onSaveProject, onLoadProject, onExport, onExportPdf,
  title, setTitle, description, setDescription, floor, setFloor, pixelsPerMeter, showArea, setShowArea, calibrationCount = 0,
  allowOutsideDraw, setAllowOutsideDraw, preventOverlap, setPreventOverlap, onUndo, onRedo, canUndo, canRedo,
  showCoords, setShowCoords, showDimensions, setShowDimensions, onManageCalibrations, onManageCoords,
  autoIncrementLabels, setAutoIncrementLabels, onOpenPageSettings, snapToBackground, setSnapToBackground, isCalibrated, onNewPage
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const areasRef = useRef<HTMLButtonElement>(null);
  const shapesRef = useRef<HTMLButtonElement>(null);
  const calibrationRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLButtonElement>(null);

  const openDropdown = (key: string, ref: React.RefObject<HTMLButtonElement | null>) => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setDropdownPos({ top: rect.bottom + 4, left: rect.left });
          setActiveDropdown(key);
      }
  };

  const scheduleClose = () => {
      closeTimeoutRef.current = setTimeout(() => {
          setActiveDropdown(null);
      }, 300); // 300ms delay to allow moving mouse to menu
  };

  const cancelClose = () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  // Close dropdown on scroll or resize
  useEffect(() => {
      const handleScroll = () => setActiveDropdown(null);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
          window.removeEventListener('scroll', handleScroll, true);
          window.removeEventListener('resize', handleScroll);
      };
  }, []);

  return (
    <>
    <div className="h-20 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm z-20 relative gap-2 overflow-x-auto">
      
      {/* Brand & File Ops */}
      <div className="flex flex-col gap-1 mr-2 min-w-[140px] flex-shrink-0">
         <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary text-white px-1.5 py-0.5 rounded text-xs font-bold">VM</span>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm font-bold text-gray-800 bg-transparent border-none outline-none w-28 truncate hover:bg-gray-50 rounded px-1"
              placeholder="Projekti Nimi"
            />
         </div>
         <div className="flex items-center gap-1">
             <label className="p-1 hover:bg-gray-100 rounded cursor-pointer text-gray-600" title="Ava Fail">
                <Upload size={14} />
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={onUpload} />
             </label>
             <button onClick={onSaveProject} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Salvesta Projekt">
                <Save size={14} />
             </button>
             <label className="p-1 hover:bg-gray-100 rounded cursor-pointer text-gray-600" title="Lae Projekt">
                <FolderOpen size={14} />
                <input type="file" className="hidden" accept=".json" onChange={onLoadProject} />
             </label>
             <div className="h-3 w-px bg-gray-300 mx-1"></div>
             <button onClick={onExport} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="PNG Eksport"><Download size={14} /></button>
             <button onClick={onExportPdf} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="PDF Eksport"><FileText size={14} /></button>
         </div>
      </div>

      <div className="h-10 w-px bg-gray-200 mx-1 flex-shrink-0" />

      {/* History */}
      <div className="flex flex-col gap-1">
        <button onClick={onUndo} disabled={!canUndo} className={`p-1 ${!canUndo ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'} rounded`}><Undo2 size={16} /></button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1 ${!canRedo ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'} rounded`}><Redo2 size={16} /></button>
      </div>

      <div className="h-10 w-px bg-gray-200 mx-1 flex-shrink-0" />

      {/* Select */}
      <ToolButton active={currentTool === 'select'} onClick={() => setTool('select')} icon={MousePointer2} label="Vali" />

      {/* Group: Alad (Areas) */}
      <div 
        onMouseEnter={() => openDropdown('areas', areasRef)} 
        onMouseLeave={scheduleClose}
      >
          <ToolButton 
             buttonRef={areasRef}
             active={['rectangle', 'polygon'].includes(currentTool)} 
             onClick={() => setTool('rectangle')} 
             icon={SquareStack} 
             label="Alad" 
          />
      </div>

      {/* Group: Kujundid (Shapes) */}
      <div
        onMouseEnter={() => openDropdown('shapes', shapesRef)}
        onMouseLeave={scheduleClose}
      >
          <ToolButton 
             buttonRef={shapesRef}
             active={['circle', 'triangle', 'arrow', 'callout', 'square'].includes(currentTool)} 
             onClick={() => setTool('circle')} 
             icon={Circle} 
             label="Kujundid" 
          />
      </div>
      
      <ToolButton active={currentTool === 'text'} onClick={() => setTool('text')} icon={Type} label="Tekst" />
      <ToolButton active={currentTool === 'icon'} onClick={() => setTool('icon')} icon={Zap} label="Ikoon" />
      <ToolButton active={currentTool === 'bullet'} onClick={() => setTool('bullet')} icon={ListOrdered} label="Sammud" />

      <div className="h-10 w-px bg-gray-200 mx-1 flex-shrink-0" />

      {/* Calibration Group */}
      <div
        onMouseEnter={() => openDropdown('calibrate', calibrationRef)}
        onMouseLeave={scheduleClose}
      >
        <ToolButton 
            buttonRef={calibrationRef}
            active={currentTool === 'calibrate' || currentTool === 'coords'} 
            onClick={() => setTool('calibrate')} 
            icon={Scale} 
            label="Kalibreeri" 
        />
      </div>

      <ToolButton 
        active={currentTool === 'measure_line'} 
        onClick={() => setTool('measure_line')} 
        icon={Ruler} 
        label="Mõõdulint" 
        disabled={!isCalibrated} 
        title={!isCalibrated ? "Nõuab kalibreerimist" : ""}
      />
      
      {/* Grid & Axes Group */}
      <div
        onMouseEnter={() => isCalibrated && openDropdown('grid', gridRef)}
        onMouseLeave={scheduleClose}
      >
        <ToolButton 
            buttonRef={gridRef}
            active={currentTool === 'axis_tool' || currentTool === 'grid_tool'} 
            onClick={() => setTool('axis_tool')} 
            icon={Grid} 
            label="Süsteemid"
            disabled={!isCalibrated}
            title={!isCalibrated ? "Nõuab kalibreerimist" : ""}
        />
      </div>

      <ToolButton active={currentTool === 'crop'} onClick={() => setTool('crop')} icon={Crop} label="Kärbi" />
      
      <div className="h-10 w-px bg-gray-200 mx-1 flex-shrink-0" />

      {/* Toggles */}
      <div className="flex items-center gap-1">
          <ToolButton active={!allowOutsideDraw} onClick={() => setAllowOutsideDraw(!allowOutsideDraw)} icon={allowOutsideDraw ? Unlock : Lock} label={allowOutsideDraw ? "Lukus" : "Lahti"} />
          <ToolButton active={showArea} onClick={() => setShowArea(!showArea)} icon={Eye} label="Pindala" disabled={!pixelsPerMeter} />
          <ToolButton active={showCoords} onClick={() => setShowCoords(!showCoords)} icon={showCoords ? Eye : EyeOff} label="Ref" />
          <ToolButton active={snapToBackground} onClick={() => setSnapToBackground && setSnapToBackground(!snapToBackground)} icon={Magnet} label="Magnet" />
          <ToolButton active={autoIncrementLabels} onClick={() => setAutoIncrementLabels(!autoIncrementLabels)} icon={Hash} label="Auto Nr" />
      </div>

      <div className="h-10 w-px bg-gray-200 mx-1 flex-shrink-0" />
      
      <ToolButton onClick={onOpenPageSettings} icon={LayoutTemplate} label="Lehe Seaded" />

      <div className="flex-1" />

      {/* Zoom */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1 hidden lg:flex">
          <button onClick={() => setScale(Math.max(0.1, scale - 0.1))} className="p-1 hover:bg-white rounded text-gray-600"><ZoomOut size={16} /></button>
          <span className="text-xs font-medium w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(5, scale + 0.1))} className="p-1 hover:bg-white rounded text-gray-600"><ZoomIn size={16} /></button>
      </div>

    </div>

    {/* FIXED DROPDOWNS OUTSIDE TOOLBAR */}
    {activeDropdown === 'areas' && (
        <div 
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg p-1 flex flex-col gap-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
        >
             <button onClick={() => { setTool('rectangle'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><Square size={14}/> Kast</button>
             <button onClick={() => { setTool('polygon'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><Hexagon size={14}/> Hulknurk</button>
        </div>
    )}

    {activeDropdown === 'shapes' && (
        <div 
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg p-1 flex flex-col gap-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
        >
             <button onClick={() => { setTool('square'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><Square size={14}/> Ruut</button>
             <button onClick={() => { setTool('circle'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><Circle size={14}/> Ring</button>
             <button onClick={() => { setTool('triangle'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><Triangle size={14}/> Kolmnurk</button>
             <div className="h-px bg-gray-100"/>
             <button onClick={() => { setTool('arrow'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><ArrowRight size={14}/> Nool</button>
             <button onClick={() => { setTool('callout'); setActiveDropdown(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 rounded text-left"><MessageSquare size={14}/> Viiktekst</button>
        </div>
    )}

    {activeDropdown === 'grid' && isCalibrated && (
        <div 
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg p-1.5 flex flex-col gap-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
        >
            <button 
                onClick={() => { setTool('axis_tool'); setActiveDropdown(null); }}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md w-full text-left hover:bg-gray-50 ${currentTool === 'axis_tool' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
                <Grid size={14} /> Teljed
            </button>
            <button 
                onClick={() => { setTool('grid_tool'); setActiveDropdown(null); }}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md w-full text-left hover:bg-gray-50 ${currentTool === 'grid_tool' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
                <Table2 size={14} /> Ruudustik
            </button>
        </div>
    )}

    {activeDropdown === 'calibrate' && (
        <div 
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg p-1.5 flex flex-col gap-1 z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
        >
            <button 
                onClick={() => { setTool('calibrate'); setActiveDropdown(null); }}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md w-full text-left hover:bg-gray-50 ${currentTool === 'calibrate' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
                <Ruler size={14} /> Mõõdulindiga
            </button>
            <button 
                onClick={() => { setTool('coords'); setShowCoords(true); setActiveDropdown(null); }}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md w-full text-left hover:bg-gray-50 ${currentTool === 'coords' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
                <MapPin size={14} /> Koordinaatidega
            </button>
            <div className="h-px bg-gray-100 my-0.5"></div>
            <button 
                onClick={() => { if(onManageCalibrations) onManageCalibrations(); setActiveDropdown(null); }}
                className="flex items-center gap-2 px-3 py-2 text-xs rounded-md w-full text-left text-gray-700 hover:bg-gray-50"
            >
                <Table2 size={14} /> Mõõtmiste tabel
                {calibrationCount > 0 && <span className="ml-auto bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{calibrationCount}</span>}
            </button>
        </div>
    )}
    </>
  );
};

export default Toolbar;
