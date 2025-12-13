
import React, { useState, useMemo, useEffect } from 'react';
import { Shape, SavedStyle, ToolType, CoordinateReference, GridConfig } from '../types';
import { Trash2, Copy, Sliders, Type, Layers, ArrowRight, Star, ListOrdered, Image as ImageIcon, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight, Zap, X, PaintBucket, Circle, Square, Minus, MessageSquare, Triangle, MapPin, Ruler, Search, Palette, MoreHorizontal, Plus, Grid, Check } from 'lucide-react';
import { getPolygonArea, getPolygonPerimeter } from '../utils/geometry';
import { getIconComponent } from '../utils/icons';
import { COLORS } from '../constants';

interface SidebarProps {
  shapes: Shape[];
  selectedId: string | null; 
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Shape>) => void;
  onMultiUpdate?: (ids: string[], updates: Partial<Shape>) => void;
  onDuplicate: (id: string) => void;
  pixelsPerMeter: number | null;
  selectedIds?: string[];
  onMultiSelect?: (ids: string[]) => void;
  onMultiDelete?: (ids: string[]) => void;
  onMultiDuplicate?: (ids: string[]) => void;
  onOpenIconPicker?: (id: string | null) => void;
  savedStyles?: SavedStyle[];
  onSaveStyle?: (style: Partial<Shape>) => void;
  onDeleteStyle?: (id: string) => void;
  currentTool?: ToolType;
  defaultStyles?: Record<string, Partial<Shape>>;
  onUpdateDefaultStyle?: (type: string, updates: Partial<Shape>) => void;
  coordRefs?: CoordinateReference[];
  onSelectCoord?: (index: number) => void;
  customColors: string[];
  onAddCustomColor: (color: string) => void;
  gridConfig?: GridConfig;
  onUpdateGridConfig?: (config: GridConfig) => void;
}

const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  rightContent
}: { 
  title: string, 
  icon: any, 
  children?: React.ReactNode, 
  defaultOpen?: boolean,
  rightContent?: React.ReactNode
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200">
            <div className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 font-semibold text-gray-700 text-sm flex-1 text-left">
                    {isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                    <Icon size={16} />
                    {title}
                </button>
                {rightContent}
            </div>
            {isOpen && (
                <div className="bg-white">
                    {children}
                </div>
            )}
        </div>
    );
};

// Map internal types to specific user friendly group names
const GROUP_MAPPING: Record<string, string> = {
    'polygon': 'Alad',
    'rectangle': 'Alad',
    'square': 'Kujundid',
    'circle': 'Kujundid',
    'triangle': 'Kujundid',
    'arrow': 'Kujundid',
    'callout': 'Viitetekstid',
    'text': 'Tekstid',
    'icon': 'Ikoonid',
    'bullet': 'Sammud',
    'image': 'Pildid',
    'line': 'Mõõtmised',
    'axis': 'Telgjooned'
};

const SaveStyleButton = ({ onClick }: { onClick: () => void }) => {
    const [saved, setSaved] = useState(false);
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <button 
            onClick={handleClick}
            className={`w-full text-xs flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors border mb-2 ${saved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
            title="Salvesta hetke stiil hilisemaks kasutamiseks"
        >
            {saved ? <Check size={14} /> : <Star size={14} fill="currentColor" />} 
            {saved ? 'Stiil Salvestatud!' : 'Salvesta Stiil'}
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ 
    shapes, selectedId, onSelect, onDelete, onUpdate, onMultiUpdate, onDuplicate, pixelsPerMeter,
    selectedIds, onMultiSelect, onMultiDelete, onMultiDuplicate, onOpenIconPicker, savedStyles, onSaveStyle, onDeleteStyle,
    currentTool, defaultStyles, onUpdateDefaultStyle, coordRefs, onSelectCoord, customColors, onAddCustomColor,
    gridConfig, onUpdateGridConfig
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [tempColor, setTempColor] = useState<string>('#000000');

  const currentSelection = selectedIds || (selectedId ? [selectedId] : []);
  const singleSelectedShape = currentSelection.length === 1 
      ? shapes.find(s => s.id === currentSelection[0]) 
      : null;
  const activeShape = singleSelectedShape || (currentSelection.length > 0 ? shapes.find(s => s.id === currentSelection[0]) : null);
  const isEditingSelection = !!activeShape;
  
  // Determine what to show in properties panel
  let shapeForControls: Partial<Shape> | null = null;
  let shapeTypeForControls: string | null = null;

  if (isEditingSelection) {
      shapeForControls = activeShape;
      shapeTypeForControls = activeShape!.type;
  } else if (currentTool && defaultStyles) {
      const toolToStyleMap: Record<string, string> = {
          'measure_line': 'line', 'callout': 'callout', 'triangle': 'triangle', 'circle': 'circle', 'square': 'rectangle',
          'axis_tool': 'axis'
      };
      const styleKey = toolToStyleMap[currentTool] || currentTool;
      
      // If Grid tool is active, don't show shape controls unless we want generic styles
      if (currentTool === 'grid_tool') {
          // Grid handled separately
      } else if (defaultStyles[styleKey]) {
          shapeForControls = defaultStyles[styleKey];
          shapeTypeForControls = styleKey;
      }
  }

  // GROUPING LOGIC
  const groupedShapes = useMemo(() => {
      const groups: Record<string, Shape[]> = {
          'Alad': [], 'Kujundid': [], 'Viitetekstid': [], 'Tekstid': [], 'Ikoonid': [], 'Sammud': [], 'Pildid': [], 'Mõõtmised': [], 'Telgjooned': []
      };
      
      const query = searchQuery.toLowerCase();
      
      [...shapes].reverse().forEach(shape => {
          if (query && !shape.label.toLowerCase().includes(query) && !shape.type.toLowerCase().includes(query)) return;
          const groupName = GROUP_MAPPING[shape.type] || 'Muu';
          if (!groups[groupName]) groups[groupName] = [];
          groups[groupName].push(shape);
      });
      return groups;
  }, [shapes, searchQuery]);

  // Calculate total area
  const totalAreaText = useMemo(() => {
      if (!pixelsPerMeter) return null;
      let totalArea = 0;
      shapes.forEach(s => {
          if (s.visible !== false && (s.type === 'polygon' || s.type === 'rectangle')) {
              totalArea += getPolygonArea(s.points);
          }
      });
      const areaM2 = totalArea / (pixelsPerMeter * pixelsPerMeter);
      return areaM2 > 0 ? `${areaM2.toFixed(1)} m²` : null;
  }, [shapes, pixelsPerMeter]);

  const toggleGroup = (group: string) => {
      setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleGroupSelect = (groupShapes: Shape[]) => {
      const ids = groupShapes.map(s => s.id);
      if (onMultiSelect) onMultiSelect(ids);
  };

  const handleGroupDelete = (groupShapes: Shape[]) => {
      const ids = groupShapes.map(s => s.id);
      if (onMultiDelete) onMultiDelete(ids);
  };

  const handleUpdate = (updates: Partial<Shape>) => {
      if (isEditingSelection) {
          if (currentSelection.length === 1) {
              onUpdate(currentSelection[0], updates);
          } else if (currentSelection.length > 1 && onMultiUpdate) {
              onMultiUpdate(currentSelection, updates);
          }
      } else if (onUpdateDefaultStyle && shapeTypeForControls) {
          onUpdateDefaultStyle(shapeTypeForControls, updates);
      }
  };

  const handleDuplicateSelected = () => {
      if (currentSelection.length > 0) {
          if (onMultiDuplicate && currentSelection.length > 1) {
              onMultiDuplicate(currentSelection);
          } else if (currentSelection.length === 1) {
              onDuplicate(currentSelection[0]);
          }
      }
  };

  const handleDeleteSelected = () => {
      if (currentSelection.length > 0) {
          if (onMultiDelete && currentSelection.length > 1) {
              onMultiDelete(currentSelection);
          } else if (currentSelection.length === 1) {
              onDelete(currentSelection[0]);
          }
      }
  };

  const handleSelect = (id: string, isMulti: boolean) => {
      if (isMulti && onMultiSelect) {
          const current = selectedIds || [];
          if (current.includes(id)) {
              onMultiSelect(current.filter(i => i !== id));
          } else {
              onMultiSelect([...current, id]);
          }
      } else {
          onSelect(id);
      }
  };

  const getShapeIcon = (type: string, iconName?: string) => {
      switch(type) {
          case 'arrow': return <ArrowRight size={14} className="text-gray-500" />;
          case 'line': return <Minus size={14} className="text-gray-500" />;
          case 'image': return <ImageIcon size={14} className="text-gray-500" />;
          case 'icon': {
             const IconCmp = getIconComponent(iconName || 'Elekter');
             return <IconCmp size={14} className="text-gray-500" />;
          }
          case 'text': return <Type size={14} className="text-gray-500" />;
          case 'bullet': return <ListOrdered size={14} className="text-gray-500" />;
          case 'callout': return <MessageSquare size={14} className="text-gray-500" />;
          case 'circle': return <Circle size={14} className="text-gray-500" />;
          case 'triangle': return <Triangle size={14} className="text-gray-500" />;
          case 'polygon': return <div className="w-3 h-3 rounded-sm bg-gray-300" />;
          case 'rectangle': return <Square size={14} className="text-gray-500" />;
          case 'square': return <Square size={14} className="text-gray-500" />;
          case 'axis': return <Grid size={14} className="text-gray-500" />;
          default: return <div className="w-3 h-3 rounded-sm bg-gray-300" />;
      }
  };

  const renderColorPalette = () => (
      <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 block">Värv</label>
          <div className="grid grid-cols-8 gap-1">
              {[...COLORS, ...customColors].map((c, i) => (
                  <button 
                    key={i}
                    className={`w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform ${shapeForControls?.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => handleUpdate({ color: c })}
                  />
              ))}
              <div className="col-span-2 flex items-center gap-1">
                  <div className="relative w-6 h-6 rounded-full border border-gray-300 overflow-hidden">
                      <input 
                        type="color" 
                        value={shapeForControls?.color || '#000000'}
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer"
                        onChange={(e) => {
                            handleUpdate({ color: e.target.value });
                            setTempColor(e.target.value);
                        }}
                      />
                  </div>
                  <button 
                    onClick={() => {
                        const c = shapeForControls?.color || tempColor;
                        if (!customColors.includes(c)) onAddCustomColor(c);
                    }}
                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                    title="Lisa värv nimekirja"
                  >
                      <Plus size={14} />
                  </button>
              </div>
          </div>
      </div>
  );

  const renderTypographyControls = () => (
      <div className="space-y-2 pt-2 border-t border-blue-200 mt-2">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Type size={12}/> Tüpograafia</label>
          <div className="grid grid-cols-2 gap-2">
              <select 
                value={shapeForControls?.fontFamily || 'Arial'} 
                onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                className="text-xs border border-gray-300 rounded p-1 w-full"
              >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Inter">Inter</option>
              </select>
              <div className="flex gap-1">
                  <button 
                    onClick={() => handleUpdate({ fontWeight: shapeForControls?.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`flex-1 border rounded text-xs font-bold ${shapeForControls?.fontWeight === 'bold' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-600'}`}
                  >
                      B
                  </button>
                  <button 
                    onClick={() => handleUpdate({ fontStyle: shapeForControls?.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 border rounded text-xs italic ${shapeForControls?.fontStyle === 'italic' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-600'}`}
                  >
                      I
                  </button>
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
             <div>
                <label className="text-[10px] text-gray-500">Suurus</label>
                <input 
                    type="number" 
                    value={shapeForControls?.fontSize || 16} 
                    onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })}
                    className="w-full text-xs border border-gray-300 rounded p-1"
                />
             </div>
             <div className="flex items-end">
                 <select 
                    value={shapeForControls?.textStyle || 'simple'}
                    onChange={(e) => handleUpdate({ textStyle: e.target.value as any })}
                    className="w-full text-xs border border-gray-300 rounded p-1"
                 >
                     <option value="simple">Lihtne</option>
                     <option value="boxed">Kastiga</option>
                     <option value="shadow">Varjuga</option>
                 </select>
             </div>
          </div>
          
          {/* New Text Box Padding Control */}
          {shapeForControls?.textStyle === 'boxed' && (
              <div>
                  <label className="text-[10px] text-gray-500">Teksti Puhver (Padding)</label>
                  <input 
                    type="range" min="0.1" max="2.0" step="0.1"
                    value={shapeForControls.textPadding ?? 0.6}
                    onChange={(e) => handleUpdate({ textPadding: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
              </div>
          )}
      </div>
  );

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-xl z-10 flex-shrink-0">
      
      {/* --- Properties Panel --- */}
      <CollapsibleSection 
        title={
            currentTool === 'grid_tool' ? 'Ruudustiku Seaded' :
            isEditingSelection ? (currentSelection.length > 1 ? `Muuda ${currentSelection.length} objekti` : 'Omadused') : 
            `Seaded: ${GROUP_MAPPING[shapeTypeForControls || ''] || shapeTypeForControls || '-'}`
        } 
        icon={Sliders}
      >
        {/* ... (rest of the component logic for rendering controls remains same) ... */}
        {currentTool === 'grid_tool' && gridConfig && onUpdateGridConfig ? (
            <div className="p-4 bg-blue-50/30 text-sm space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">Näita Ruudustikku</label>
                    <input 
                        type="checkbox" 
                        checked={gridConfig.visible} 
                        onChange={(e) => onUpdateGridConfig({...gridConfig, visible: e.target.checked})} 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Samm (mm)</label>
                    <input 
                        type="number" 
                        value={gridConfig.sizeMm} 
                        onChange={(e) => onUpdateGridConfig({...gridConfig, sizeMm: parseInt(e.target.value) || 1000})} 
                        className="w-full text-xs border border-gray-300 rounded p-1"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-gray-500">Nihe X</label>
                        <input type="number" value={gridConfig.offsetX} onChange={(e) => onUpdateGridConfig({...gridConfig, offsetX: parseInt(e.target.value)})} className="w-full text-xs border border-gray-300 rounded p-1" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500">Nihe Y</label>
                        <input type="number" value={gridConfig.offsetY} onChange={(e) => onUpdateGridConfig({...gridConfig, offsetY: parseInt(e.target.value)})} className="w-full text-xs border border-gray-300 rounded p-1" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Läbipaistvus</label>
                    <input type="range" min="0.1" max="1" step="0.1" value={gridConfig.opacity} onChange={(e) => onUpdateGridConfig({...gridConfig, opacity: parseFloat(e.target.value)})} className="w-full accent-blue-600"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Värv</label>
                    <input type="color" value={gridConfig.color} onChange={(e) => onUpdateGridConfig({...gridConfig, color: e.target.value})} className="w-full h-8 cursor-pointer border border-gray-300 rounded"/>
                </div>
            </div>
        ) : shapeForControls ? (
            <div className="p-4 bg-blue-50/30 text-sm">
                <div className="space-y-4">
                    {/* SAVE STYLE BUTTON MOVED HERE */}
                    {isEditingSelection && onSaveStyle && singleSelectedShape && (
                        <SaveStyleButton onClick={() => onSaveStyle(singleSelectedShape)} />
                    )}

                    {/* AXIS CONFIGURATION */}
                    {shapeTypeForControls === 'axis' && (
                        <div className="space-y-3 pb-2 border-b border-gray-200">
                            <label className="text-xs font-bold text-gray-700 block">Telgede Seaded</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500">Samm (mm)</label>
                                    <input 
                                        type="number" 
                                        value={shapeForControls.axisConfig?.spacingMm || 6000} 
                                        onChange={(e) => handleUpdate({ axisConfig: { ...shapeForControls?.axisConfig!, spacingMm: parseInt(e.target.value) } })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500">Kogus</label>
                                    <input 
                                        type="number" 
                                        value={shapeForControls.axisConfig?.count || 5} 
                                        onChange={(e) => handleUpdate({ axisConfig: { ...shapeForControls?.axisConfig!, count: parseInt(e.target.value) } })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500">Algus</label>
                                    <input 
                                        type="text" 
                                        value={shapeForControls.axisConfig?.startLabel || "1"} 
                                        onChange={(e) => handleUpdate({ axisConfig: { ...shapeForControls?.axisConfig!, startLabel: e.target.value } })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500">Pikkus (mm)</label>
                                    <input 
                                        type="number" 
                                        value={shapeForControls.axisConfig?.lengthMm || 10000} 
                                        onChange={(e) => handleUpdate({ axisConfig: { ...shapeForControls?.axisConfig!, lengthMm: parseInt(e.target.value) } })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={shapeForControls.axisConfig?.bothEnds || false} 
                                    onChange={(e) => handleUpdate({ axisConfig: { ...shapeForControls?.axisConfig!, bothEnds: e.target.checked } })}
                                />
                                <label className="text-xs text-gray-600">Mullid mõlemas otsas</label>
                            </div>
                        </div>
                    )}

                    {/* BULLET CONFIGURATION */}
                    {shapeTypeForControls === 'bullet' && (
                        <div className="space-y-3 pb-2 border-b border-gray-200">
                            <label className="text-xs font-bold text-gray-700 block">Sammude Tüüp</label>
                            <select 
                                value={shapeForControls.bulletType || 'numbers'} 
                                onChange={(e) => handleUpdate({ bulletType: e.target.value as any })}
                                className="w-full text-xs border border-gray-300 rounded p-1"
                            >
                                <option value="numbers">Numbrid (1, 2, 3...)</option>
                                <option value="letters">Tähed (A, B, C...)</option>
                                <option value="roman">Rooma numbrid (I, II, III...)</option>
                            </select>
                        </div>
                    )}

                    {/* CALLOUT CONFIGURATION */}
                    {shapeTypeForControls === 'callout' && (
                        <div className="space-y-3 pb-2 border-b border-gray-200">
                            <label className="text-xs font-bold text-gray-700 block">Viikteksti Stiil</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500">Kasti Kuju</label>
                                    <select 
                                        value={shapeForControls.calloutShape || 'box'} 
                                        onChange={(e) => handleUpdate({ calloutShape: e.target.value as any })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    >
                                        <option value="box">Kast</option>
                                        <option value="rounded">Ümar</option>
                                        <option value="circle">Ring</option>
                                        <option value="none">Ilma</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500">Noole Ots</label>
                                    <select 
                                        value={shapeForControls.calloutArrowHead || 'arrow'} 
                                        onChange={(e) => handleUpdate({ calloutArrowHead: e.target.value as any })}
                                        className="w-full text-xs border border-gray-300 rounded p-1"
                                    >
                                        <option value="arrow">Nool</option>
                                        <option value="dot">Täpp</option>
                                        <option value="line">Kriips</option>
                                        <option value="none">Puudub</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Label Input */}
                    {isEditingSelection && singleSelectedShape && !['bullet', 'image', 'line', 'arrow', 'axis', 'callout'].includes(singleSelectedShape.type) && (
                        <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Silt / Tekst</label>
                        <input
                            type="text"
                            value={singleSelectedShape.label}
                            onChange={(e) => handleUpdate({ label: e.target.value })}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        </div>
                    )}
                    
                    {/* Area, Perimeter & Side Length Toggles for Shapes */}
                    {['polygon', 'rectangle'].includes(shapeTypeForControls || '') && (
                        <div className="flex flex-col gap-2 p-2 bg-white border border-gray-200 rounded">
                            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={shapeForControls.showArea ?? true}
                                    onChange={(e) => handleUpdate({ showArea: e.target.checked })}
                                />
                                Näita Pindala (m²)
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={shapeForControls.showPerimeter ?? false}
                                    onChange={(e) => handleUpdate({ showPerimeter: e.target.checked })}
                                />
                                Näita Ümbermõõtu (m)
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={shapeForControls.showSideLengths ?? false}
                                    onChange={(e) => handleUpdate({ showSideLengths: e.target.checked })}
                                />
                                Näita külgede mõõte
                            </label>
                        </div>
                    )}

                    {renderColorPalette()}

                    {/* Common Sliders with Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 block">Läbipaistvus</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="range" min="0.1" max="1" step="0.1" 
                                    value={shapeForControls.opacity ?? 1} 
                                    onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })} 
                                    className="w-full accent-blue-600"
                                />
                                <input 
                                    type="number" min="0.1" max="1" step="0.1"
                                    value={shapeForControls.opacity ?? 1} 
                                    onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
                                    className="w-12 text-xs border border-gray-300 rounded p-1 text-center"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 block">Joone Jämedus</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="range" min="0" max="20" step="1" 
                                    value={shapeForControls.strokeWidth ?? 2} 
                                    onChange={(e) => handleUpdate({ strokeWidth: parseInt(e.target.value) })} 
                                    className="w-full accent-blue-600"
                                />
                                <input 
                                    type="number" min="0" max="20"
                                    value={shapeForControls.strokeWidth ?? 2} 
                                    onChange={(e) => handleUpdate({ strokeWidth: parseInt(e.target.value) })}
                                    className="w-12 text-xs border border-gray-300 rounded p-1 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TYPOGRAPHY */}
                    {['text', 'callout', 'polygon', 'rectangle', 'square', 'bullet', 'line', 'axis'].includes(shapeTypeForControls || '') && renderTypographyControls()}

                    {/* LINE SETTINGS */}
                    {shapeTypeForControls === 'line' && (
                        <div className="space-y-3 bg-white p-2 rounded border border-gray-200 mt-2">
                            <label className="text-xs font-bold text-gray-700">Mõõtmine</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={shapeForControls.measureUnit || 'm'} onChange={(e) => handleUpdate({ measureUnit: e.target.value as 'm'|'mm' })} className="w-full text-xs border border-gray-300 rounded p-1">
                                    <option value="m">Meetrid (m)</option>
                                    <option value="mm">Millimeetrid</option>
                                </select>
                                {shapeForControls.measureUnit !== 'mm' && (
                                    <select value={shapeForControls.measureDecimals ?? 2} onChange={(e) => handleUpdate({ measureDecimals: parseInt(e.target.value) as 0|1|2 })} className="w-full text-xs border border-gray-300 rounded p-1">
                                        <option value="0">0 komakohta</option>
                                        <option value="1">1 komakoht</option>
                                        <option value="2">2 komakohta</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ICONS */}
                    {shapeTypeForControls === 'icon' && onOpenIconPicker && (
                        <div className="space-y-2 mt-2">
                            <button onClick={() => onOpenIconPicker(isEditingSelection && singleSelectedShape ? singleSelectedShape.id : null)} className="w-full flex justify-between border p-2 rounded bg-white hover:bg-gray-50">
                                <span className="flex items-center gap-2 text-xs">{getShapeIcon('icon', shapeForControls.iconName)} {shapeForControls.iconName}</span>
                                <span className="text-blue-500 text-xs font-bold">Muuda</span>
                            </button>
                            <div className="flex bg-gray-200 p-1 rounded gap-1">
                                <button onClick={() => handleUpdate({ iconStyle: 'circle' })} className={`flex-1 py-1 rounded text-xs ${shapeForControls.iconStyle === 'circle' ? 'bg-white shadow' : ''}`}><Circle size={12} className="mx-auto"/></button>
                                <button onClick={() => handleUpdate({ iconStyle: 'square' })} className={`flex-1 py-1 rounded text-xs ${shapeForControls.iconStyle === 'square' ? 'bg-white shadow' : ''}`}><Square size={12} className="mx-auto"/></button>
                                <button onClick={() => handleUpdate({ iconStyle: 'simple' })} className={`flex-1 py-1 rounded text-xs ${shapeForControls.iconStyle === 'simple' ? 'bg-white shadow' : ''}`}>Ilma</button>
                            </div>
                        </div>
                    )}

                    {/* Actions (Selection Only) */}
                    {isEditingSelection && (
                        <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                            <button onClick={handleDuplicateSelected} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-1.5 rounded text-xs font-medium transition-colors"><Copy size={14} /> Dubleeri</button>
                            <button onClick={handleDeleteSelected} className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-1.5 rounded text-xs font-medium transition-colors"><Trash2 size={14} /> Kustuta</button>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="p-4 bg-gray-50 text-center text-xs text-gray-500 italic">
                Vali objekt või tööriist.
            </div>
        )}
      </CollapsibleSection>

      {/* --- Saved Styles --- */}
      <CollapsibleSection title="Salvestatud Stiilid" icon={Star} defaultOpen={true}>
         {savedStyles && savedStyles.length > 0 ? (
             <div className="p-2 space-y-1 bg-gray-50 max-h-[200px] overflow-y-auto">
                 {savedStyles.map((item) => (
                     <div key={item.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md shadow-sm group">
                         <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: item.style.color }} />
                         <span className="text-xs font-medium text-gray-700 flex-1 truncate">{item.name}</span>
                         <button onClick={() => handleUpdate(item.style)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Rakenda</button>
                         {onDeleteStyle && <button onClick={() => onDeleteStyle(item.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>}
                     </div>
                 ))}
             </div>
         ) : <div className="p-4 text-center text-xs text-gray-400 italic">Pole salvestatud stiile.</div>}
      </CollapsibleSection>
      
      {/* --- Layer List with Grouping --- */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2 bg-gray-50 border-b border-gray-200 space-y-2">
             <div className="flex justify-between items-center px-1">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2 text-sm"><Layers size={16} /> Kihid</h2>
                {totalAreaText && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Kokku: {totalAreaText}</span>}
             </div>
             <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Otsi kihte..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500"
                />
             </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
            {Object.entries(groupedShapes).map(([groupName, grpShapes]) => {
                const shapes = grpShapes as Shape[]; 
                if (shapes.length === 0) return null;
                const isCollapsed = collapsedGroups[groupName];
                return (
                    <div key={groupName} className="border border-gray-100 rounded-md overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-50 px-2 py-1.5 hover:bg-gray-100 group">
                            <button onClick={() => toggleGroup(groupName)} className="flex items-center gap-1 text-xs font-bold text-gray-600 flex-1">
                                {isCollapsed ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}
                                {groupName} ({shapes.length})
                            </button>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleGroupSelect(shapes)} className="p-1 hover:bg-blue-100 text-blue-600 rounded" title="Vali Kõik"><ListOrdered size={12}/></button>
                                <button onClick={() => handleGroupDelete(shapes)} className="p-1 hover:bg-red-100 text-red-600 rounded" title="Kustuta Grupp"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        
                        {!isCollapsed && (
                            <div className="divide-y divide-gray-50">
                                {shapes.map(shape => {
                                    const isSelected = currentSelection.includes(shape.id);
                                    let infoText = '';
                                    if (pixelsPerMeter) {
                                        if (shape.type === 'polygon' || shape.type === 'rectangle') {
                                            const area = getPolygonArea(shape.points) / (pixelsPerMeter * pixelsPerMeter);
                                            infoText = `${area.toFixed(1)} m²`;
                                        } else if (shape.type === 'line') {
                                            const d = Math.sqrt(Math.pow(shape.points[1].x-shape.points[0].x,2) + Math.pow(shape.points[1].y-shape.points[0].y,2));
                                            infoText = `${(d/pixelsPerMeter).toFixed(2)} m`;
                                        }
                                    }

                                    return (
                                        <div 
                                            key={shape.id}
                                            onClick={(e) => handleSelect(shape.id, e.ctrlKey || e.metaKey)}
                                            className={`group flex items-center gap-2 p-1.5 pl-4 cursor-pointer text-xs ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <button onClick={(e) => { e.stopPropagation(); onUpdate(shape.id, { visible: !shape.visible }); }} className={`p-0.5 ${!shape.visible ? 'text-gray-300' : 'text-gray-400'}`}>{shape.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shape.color }} />
                                            <div className="flex-1 truncate font-medium">{shape.type === 'bullet' ? shape.bulletLabel : shape.label}</div>
                                            {infoText && <div className="text-[10px] text-gray-400 font-mono">{infoText}</div>}
                                            
                                            {/* Row Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); onUpdate(shape.id, { locked: !shape.locked }); }} className={`p-0.5 ${shape.locked ? 'text-red-400' : 'text-gray-400 hover:text-gray-600'}`}>{shape.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
                                                <button onClick={(e) => { e.stopPropagation(); onDelete(shape.id); }} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Coordinates Section */}
            {coordRefs && coordRefs.length > 0 && (
                <div className="border border-gray-100 rounded-md mt-4">
                    <div className="bg-gray-50 px-2 py-1.5 text-xs font-bold text-gray-600 flex items-center gap-1">
                        <MapPin size={12}/> Koordinaatpunktid
                    </div>
                    {coordRefs.map((ref, i) => (
                        <div key={i} onClick={() => onSelectCoord && onSelectCoord(i)} className="flex items-center justify-between p-2 pl-4 text-xs cursor-pointer hover:bg-gray-50 border-t border-gray-50">
                            <span>Punkt {ref.id}</span>
                            <span className="text-gray-400 font-mono">X:{ref.world.x} Y:{ref.world.y}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
