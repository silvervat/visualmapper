import React, { useState, useEffect, useRef } from 'react';
import { Globe, ArrowRight, ArrowUpFromLine, Trash2 } from 'lucide-react';

interface CoordinateModalProps {
  pointIndex: 1 | 2;
  initialValues?: { x: number; y: number; z?: number };
  onConfirm: (x: number, y: number, z?: number) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const CoordinateModal: React.FC<CoordinateModalProps> = ({ pointIndex, initialValues, onConfirm, onDelete, onCancel }) => {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [z, setZ] = useState('');
  const xRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValues) {
        setX(initialValues.x.toString());
        setY(initialValues.y.toString());
        if (initialValues.z !== undefined) setZ(initialValues.z.toString());
    }
    setTimeout(() => xRef.current?.focus(), 100);
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numX = parseFloat(x.replace(',', '.'));
    const numY = parseFloat(y.replace(',', '.'));
    const numZ = z ? parseFloat(z.replace(',', '.')) : undefined;
    
    if (!isNaN(numX) && !isNaN(numY)) {
      onConfirm(numX, numY, numZ);
    }
  };

  const isEditing = !!initialValues;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full m-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-indigo-600">
                <div className="bg-indigo-100 p-2 rounded-full">
                    <Globe size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                    {isEditing ? `Muuda Punkti ${pointIndex}` : `Koordinaatpunkt ${pointIndex}/2`}
                </h3>
            </div>
            {isEditing && onDelete && (
                <button 
                    type="button"
                    onClick={() => {
                        if (confirm('Oled kindel, et soovid selle koordinaatpunkti kustutada?')) {
                            onDelete();
                        }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Kustuta Punkt"
                >
                    <Trash2 size={20} />
                </button>
            )}
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Sisesta selle punkti tegelikud X, Y ja Z koordinaadid.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                X Koordinaat
              </label>
              <input
                  ref={xRef}
                  type="number"
                  step="any"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  className="w-full text-lg border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="nt. 6500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Y Koordinaat
              </label>
              <input
                  type="number"
                  step="any"
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                  className="w-full text-lg border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="nt. 12000"
              />
            </div>
          </div>
          
          <div className="mb-6">
             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
               <ArrowUpFromLine size={12} /> Z Koordinaat (Kõrgus)
             </label>
             <input
                type="number"
                step="any"
                value={z}
                onChange={(e) => setZ(e.target.value)}
                className="w-full text-lg border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="nt. 0.00"
             />
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
              disabled={!x || !y}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isEditing ? 'Salvesta' : (pointIndex === 1 ? 'Järgmine' : 'Lõpeta')} 
              {!isEditing && <ArrowRight size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoordinateModal;