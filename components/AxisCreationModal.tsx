
import React, { useState } from 'react';
import { X, Grid, ArrowRight, ArrowDown } from 'lucide-react';
import { AxisConfig } from '../types';

interface AxisCreationModalProps {
  onConfirm: (type: 'x' | 'y' | 'both', configX: AxisConfig, configY?: AxisConfig, fullExtent?: boolean) => void;
  onCancel: () => void;
}

const AxisCreationModal: React.FC<AxisCreationModalProps> = ({ onConfirm, onCancel }) => {
  const [type, setType] = useState<'x' | 'y' | 'both'>('both');
  const [fullExtent, setFullExtent] = useState(false);
  
  // Default Configs
  const [configX, setConfigX] = useState<AxisConfig>({
      spacingMm: 6000, count: 5, startLabel: '1', lengthMm: 10000, bothEnds: false, reverse: false
  });
  const [configY, setConfigY] = useState<AxisConfig>({
      spacingMm: 6000, count: 5, startLabel: 'A', lengthMm: 10000, bothEnds: false, reverse: false
  });

  // Safe number parser with default value
  const safeParseInt = (value: string, defaultValue: number, min: number = 1, max: number = 100000): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  };

  const handleConfirm = () => {
    // Validate before confirming
    const validConfigX = {
      ...configX,
      spacingMm: Math.max(100, configX.spacingMm),
      count: Math.max(1, Math.min(100, configX.count)),
      lengthMm: Math.max(100, configX.lengthMm),
      startLabel: configX.startLabel || '1'
    };
    const validConfigY = {
      ...configY,
      spacingMm: Math.max(100, configY.spacingMm),
      count: Math.max(1, Math.min(100, configY.count)),
      lengthMm: Math.max(100, configY.lengthMm),
      startLabel: configY.startLabel || 'A'
    };
    onConfirm(type, validConfigX, validConfigY, fullExtent);
  };

  const renderConfig = (label: string, config: AxisConfig, setConfig: React.Dispatch<React.SetStateAction<AxisConfig>>) => (
      <div className="space-y-3 p-3 border border-gray-100 rounded bg-gray-50">
          <div className="text-xs font-bold uppercase text-gray-500">{label}</div>
          <div className="grid grid-cols-2 gap-2">
              <div>
                  <label className="text-[10px] text-gray-500">Samm (mm)</label>
                  <input
                      type="number"
                      value={config.spacingMm}
                      min={100}
                      max={100000}
                      onChange={(e) => setConfig({...config, spacingMm: safeParseInt(e.target.value, config.spacingMm, 100, 100000)})}
                      className="w-full text-sm border border-gray-300 rounded p-1"
                  />
              </div>
              <div>
                  <label className="text-[10px] text-gray-500">Kogus</label>
                  <input
                      type="number"
                      value={config.count}
                      min={1}
                      max={100}
                      onChange={(e) => setConfig({...config, count: safeParseInt(e.target.value, config.count, 1, 100)})}
                      className="w-full text-sm border border-gray-300 rounded p-1"
                  />
              </div>
              <div>
                  <label className="text-[10px] text-gray-500">Algus</label>
                  <input
                      type="text"
                      value={config.startLabel}
                      maxLength={5}
                      onChange={(e) => setConfig({...config, startLabel: e.target.value || '1'})}
                      className="w-full text-sm border border-gray-300 rounded p-1"
                  />
              </div>
              <div>
                  <label className="text-[10px] text-gray-500">Joone Pikkus (mm)</label>
                  <input
                      type="number"
                      value={config.lengthMm}
                      min={100}
                      max={500000}
                      onChange={(e) => setConfig({...config, lengthMm: safeParseInt(e.target.value, config.lengthMm, 100, 500000)})}
                      className={`w-full text-sm border border-gray-300 rounded p-1 ${fullExtent ? 'bg-gray-100 text-gray-400' : ''}`}
                      disabled={fullExtent}
                  />
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full m-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Grid size={20}/> Lisa Teljestik</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        <div className="flex gap-2 mb-4">
            <button onClick={() => setType('x')} className={`flex-1 py-2 text-sm border rounded ${type === 'x' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}>Vertikaalsed</button>
            <button onClick={() => setType('y')} className={`flex-1 py-2 text-sm border rounded ${type === 'y' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}>Horisontaalsed</button>
            <button onClick={() => setType('both')} className={`flex-1 py-2 text-sm border rounded ${type === 'both' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-gray-50'}`}>Mõlemad</button>
        </div>
        
        <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer p-2 border border-blue-100 bg-blue-50 rounded text-sm text-blue-800">
                <input 
                    type="checkbox" 
                    checked={fullExtent} 
                    onChange={(e) => setFullExtent(e.target.checked)} 
                    className="accent-blue-600"
                />
                Täisulatus (Servast servani)
            </label>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {(type === 'x' || type === 'both') && renderConfig("Vertikaalsed Teljed (Numbrid)", configX, setConfigX)}
            {(type === 'y' || type === 'both') && renderConfig("Horisontaalsed Teljed (Tähed)", configY, setConfigY)}
        </div>

        <div className="flex justify-end gap-2 mt-6">
            <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Loobu</button>
            <button onClick={handleConfirm} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Lisa Teljestik</button>
        </div>
      </div>
    </div>
  );
};

export default AxisCreationModal;
