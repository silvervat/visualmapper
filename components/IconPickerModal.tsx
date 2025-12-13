import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { ICON_MAP } from '../utils/icons';

interface IconPickerModalProps {
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const filteredIcons = Object.keys(ICON_MAP).filter(name => 
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-w-full m-4 h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Vali Ikoon</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Otsi ikooni..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="grid grid-cols-6 gap-2">
            {filteredIcons.map((name) => {
              const Icon = ICON_MAP[name];
              return (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all aspect-square group"
                  title={name}
                >
                  <Icon size={24} className="text-gray-600 group-hover:text-blue-600 mb-2" />
                  <span className="text-[10px] text-gray-500 text-center truncate w-full">{name}</span>
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>Ikoone ei leitud.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal;
