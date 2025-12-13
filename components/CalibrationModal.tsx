import React, { useState, useEffect, useRef } from 'react';
import { Ruler } from 'lucide-react';

interface CalibrationModalProps {
  pixelLength: number;
  existingScale: number | null;
  onConfirm: (meters: number) => void;
  onCancel: () => void;
}

const CalibrationModal: React.FC<CalibrationModalProps> = ({ pixelLength, existingScale, onConfirm, onCancel }) => {
  const [mm, setMm] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const prediction = existingScale ? ((pixelLength / existingScale) * 1000).toFixed(0) : '';

  useEffect(() => {
    if (prediction) {
        setMm(prediction);
    }
    setTimeout(() => {
        inputRef.current?.select();
    }, 100);
  }, [prediction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valMm = parseFloat(mm.replace(',', '.'));
    if (!isNaN(valMm) && valMm > 0) {
      onConfirm(valMm / 1000);
    }
  };

  const metersDisplay = mm && !isNaN(parseFloat(mm.replace(',', '.'))) 
    ? (parseFloat(mm.replace(',', '.')) / 1000).toFixed(3) 
    : '0.000';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full m-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-blue-600">
          <div className="bg-blue-100 p-2 rounded-full">
            <Ruler size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Kalibreeri Mõõtkava</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Sa mõõtsid vahemaa <strong className="text-gray-900">{Math.round(pixelLength)} pikslit</strong>. 
          Palun sisesta selle joone tegelik pikkus millimeetrites.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tegelik Pikkus (Millimeetrit)
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="number"
                    step="1"
                    min="0"
                    value={mm}
                    onChange={(e) => setMm(e.target.value)}
                    className="w-full text-lg border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="nt. 5000"
                    autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    mm
                </span>
            </div>
            <div className="flex justify-between items-center mt-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                 <p className="text-base font-bold text-blue-700">
                    = {metersDisplay} m
                 </p>
                {existingScale && (
                    <p className="text-xs text-gray-500 text-right">
                        Ennustus: ~{prediction}mm
                    </p>
                )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Loobu
            </button>
            <button
              type="submit"
              disabled={!mm || parseFloat(mm) <= 0}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Määra Mõõtkava
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalibrationModal;