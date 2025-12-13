
import React, { useRef, useEffect, useState } from 'react';
import { Viewport } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface MinimapProps {
  image: HTMLImageElement | null;
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
  scale: number;
  setScale: (s: number) => void;
  containerWidth: number;
  containerHeight: number;
}

const Minimap: React.FC<MinimapProps> = ({ 
  image, viewport, setViewport, scale, setScale, containerWidth, containerHeight 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const WIDTH = 180; // Fixed width for minimap

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const ratio = image.naturalHeight / image.naturalWidth;
    const height = WIDTH * ratio;
    
    canvasRef.current.width = WIDTH;
    canvasRef.current.height = height;

    ctx.clearRect(0, 0, WIDTH, height);
    ctx.drawImage(image, 0, 0, WIDTH, height);
    
    // Draw current viewport rect
    if (scale > 0) {
        // Calculate the visible area in world coordinates
        const mapScale = WIDTH / image.naturalWidth;
        
        const viewX = (-viewport.x / scale) * mapScale;
        const viewY = (-viewport.y / scale) * mapScale;
        const viewW = (containerWidth / scale) * mapScale;
        const viewH = (containerHeight / scale) * mapScale;

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
        
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.fillRect(viewX, viewY, viewW, viewH);
    }

  }, [image, viewport, scale, containerWidth, containerHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if ((!isDragging && e.buttons !== 1) || !image || !canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const mapScale = WIDTH / image.naturalWidth;
      
      const worldX = x / mapScale;
      const worldY = y / mapScale;
      
      const newVx = (containerWidth / 2) - worldX * scale;
      const newVy = (containerHeight / 2) - worldY * scale;
      
      setViewport({ ...viewport, x: newVx, y: newVy });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  if (!image) return null;

  return (
    <div className="absolute bottom-12 right-4 flex flex-col gap-2 shadow-xl bg-white p-2 rounded-lg border border-gray-200 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative border border-gray-100 bg-gray-50 cursor-crosshair overflow-hidden rounded">
          <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block"
          />
      </div>
      <div className="flex justify-between items-center bg-gray-100 rounded p-1">
          <button 
            onClick={() => setScale(Math.max(0.1, scale - 0.1))}
            className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors"
            title="Vähenda"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-bold text-gray-600 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(Math.min(5, scale + 0.1))}
            className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors"
            title="Suurenda"
          >
            <ZoomIn size={16} />
          </button>
      </div>
    </div>
  );
};

export default Minimap;
