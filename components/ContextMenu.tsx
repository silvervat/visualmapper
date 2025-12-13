
import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, ArrowUp, ArrowDown, Edit2, RotateCw, Clock } from 'lucide-react';
import { RecentTool } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  onMoveToFront: () => void;
  onMoveToBack: () => void;
  onEdit: () => void;
  onRotateAlign: () => void;
  recentTools?: RecentTool[];
  onUseRecentTool?: (tool: RecentTool) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDuplicate, onDelete, onClose, onMoveToFront, onMoveToBack, onEdit, onRotateAlign, recentTools, onUseRecentTool }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture to handle it before other click listeners if needed, 
    // but bubbling is usually fine for outside click detection.
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div 
      ref={ref}
      className="fixed bg-white shadow-xl rounded-lg py-1 border border-gray-200 z-50 min-w-[200px] text-gray-700 animate-in fade-in duration-150"
      style={{ top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button 
        onClick={() => { onEdit(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 text-sm flex items-center gap-2 font-medium"
      >
        <Edit2 size={14} /> Muuda Omadusi
      </button>
      
      {recentTools && recentTools.length > 0 && onUseRecentTool && (
          <>
            <div className="h-px bg-gray-100 my-1"></div>
            <div className="px-4 py-1 text-xs text-gray-400 font-semibold uppercase">Viimati kasutatud</div>
            {recentTools.map((rt, i) => (
                <button 
                    key={i}
                    onClick={() => { onUseRecentTool(rt); onClose(); }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 text-sm flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rt.style.color || '#000' }} />
                    {rt.label}
                </button>
            ))}
          </>
      )}

      <div className="h-px bg-gray-100 my-1"></div>
      <button 
        onClick={() => { onRotateAlign(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 text-sm flex items-center gap-2"
      >
        <RotateCw size={14} /> Joonda Võrdlusjoonega
      </button>
      <div className="h-px bg-gray-100 my-1"></div>
      <button 
        onClick={() => { onDuplicate(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
      >
        <Copy size={14} /> Dubleeri
      </button>
      <div className="h-px bg-gray-100 my-1"></div>
      <button 
        onClick={() => { onMoveToFront(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
      >
        <ArrowUp size={14} /> Too Ette
      </button>
      <button 
        onClick={() => { onMoveToBack(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
      >
        <ArrowDown size={14} /> Saada Taha
      </button>
      <div className="h-px bg-gray-100 my-1"></div>
      <button 
        onClick={() => { onDelete(); onClose(); }} 
        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
      >
        <Trash2 size={14} /> Kustuta
      </button>
    </div>
  );
};
