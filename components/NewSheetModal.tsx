
import React, { useState, useEffect } from 'react';
import { FileUp, Clipboard, Square, X } from 'lucide-react';

interface NewSheetModalProps {
  onClose: () => void;
  onCreate: (type: 'blank' | 'upload' | 'paste', data?: any) => void;
}

const NewSheetModal: React.FC<NewSheetModalProps> = ({ onClose, onCreate }) => {
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(50);
  const [unit, setUnit] = useState<'px' | 'm' | 'mm'>('m');

  // Handle paste events globally when modal is open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            onCreate('upload', blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onCreate]);

  const handleCreateBlank = () => {
      // Pass raw data to App.tsx to handle calibration calculation there
      onCreate('blank', { 
          width: width, 
          height: height,
          unit: unit
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full m-4 animate-in fade-in zoom-in-95 duration-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={24} />
        </button>
        
        <h3 className="text-xl font-bold text-gray-800 mb-6">Uus Leht</h3>

        <div className="grid grid-cols-1 gap-4">
            {/* OPTION 1: BLANK */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                <div className="flex items-start gap-4">
                    <div className="bg-gray-100 p-3 rounded-full group-hover:bg-white text-gray-600 group-hover:text-blue-600">
                        <Square size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Tühi Leht</h4>
                        <p className="text-xs text-gray-500 mb-3">Määra tegelikud mõõtmed.</p>
                        <div className="flex items-end gap-2 mb-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Laius</label>
                                <input 
                                    type="number" 
                                    value={width} 
                                    onChange={(e) => setWidth(parseFloat(e.target.value))} 
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-700"
                                />
                            </div>
                            <span className="text-gray-400 mb-1">x</span>
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Kõrgus</label>
                                <input 
                                    type="number" 
                                    value={height} 
                                    onChange={(e) => setHeight(parseFloat(e.target.value))} 
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-700"
                                />
                            </div>
                            <div className="mb-[1px]">
                                <select 
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value as any)}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
                                >
                                    <option value="m">m (meeter)</option>
                                    <option value="mm">mm (millimeeter)</option>
                                    <option value="px">px (piksel)</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            onClick={handleCreateBlank}
                            className="w-full bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
                        >
                            Loo Leht
                        </button>
                    </div>
                </div>
            </div>

            {/* OPTION 2: UPLOAD */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                 <label className="flex items-center gap-4 cursor-pointer w-full h-full">
                    <div className="bg-gray-100 p-3 rounded-full group-hover:bg-white text-gray-600 group-hover:text-blue-600">
                        <FileUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Ava Fail</h4>
                        <p className="text-xs text-gray-500">Toetab: PDF, JPG, PNG (või lohista fail aknasse)</p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={(e) => e.target.files?.[0] && onCreate('upload', e.target.files[0])} 
                    />
                 </label>
            </div>

            {/* OPTION 3: PASTE */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center gap-4 opacity-75">
                 <div className="bg-gray-200 p-3 rounded-full text-gray-500">
                        <Clipboard size={24} />
                 </div>
                 <div>
                    <h4 className="font-semibold text-gray-700">Kleebi Pilt</h4>
                    <p className="text-xs text-gray-500">Vajuta CTRL+V kuskil aknas, et kleepida lõikelaualt.</p>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NewSheetModal;
