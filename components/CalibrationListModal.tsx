import React, { useState } from 'react';
import { Ruler, Trash2, Save, X } from 'lucide-react';

interface CalibrationItem {
  pixels: number;
  meters: number;
}

interface CalibrationListModalProps {
  calibrations: CalibrationItem[];
  onUpdate: (index: number, newMeters: number) => void;
  onDelete: (index: number) => void;
  onClose: () => void;
}

const CalibrationListModal: React.FC<CalibrationListModalProps> = ({ calibrations, onUpdate, onDelete, onClose }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEditStart = (index: number, currentMeters: number) => {
    setEditingIndex(index);
    setEditValue((currentMeters * 1000).toString()); // Convert to mm for easier editing
  };

  const handleSave = (index: number) => {
    const valMm = parseFloat(editValue);
    if (!isNaN(valMm) && valMm > 0) {
      onUpdate(index, valMm / 1000);
      setEditingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full m-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-blue-600">
            <div className="bg-blue-100 p-2 rounded-full">
                <Ruler size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Halda Kalibreerimisi</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
            </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Mõõtkava arvutatakse kõigi allpool toodud mõõtmiste keskmisena. Eemalda vigased mõõtmised täpsuse parandamiseks.
        </p>

        <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-2">Pikslid</th>
                        <th className="px-4 py-2">Tegelik Pikkus</th>
                        <th className="px-4 py-2 text-right">Tegevused</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {calibrations.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                                Ühtegi mõõtmist pole veel tehtud.
                            </td>
                        </tr>
                    ) : (
                        calibrations.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 text-gray-600">
                                    {Math.round(item.pixels)} px
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    {editingIndex === idx ? (
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                className="w-20 border border-blue-300 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-blue-100"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                autoFocus
                                            />
                                            <span className="text-xs text-gray-500">mm</span>
                                        </div>
                                    ) : (
                                        `${item.meters.toFixed(3)} m`
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {editingIndex === idx ? (
                                        <button 
                                            onClick={() => handleSave(idx)}
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                            title="Salvesta"
                                        >
                                            <Save size={16} />
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => handleEditStart(idx, item.meters)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Muuda"
                                            >
                                                <Ruler size={16} />
                                            </button>
                                            <button 
                                                onClick={() => onDelete(idx)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Kustuta"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sulge
            </button>
        </div>
      </div>
    </div>
  );
};

export default CalibrationListModal;