import React, { useState } from 'react';
import { X, LayoutTemplate } from 'lucide-react';
import { PageConfig } from '../types';

interface PageSettingsModalProps {
  config: PageConfig;
  onSave: (config: PageConfig) => void;
  onClose: () => void;
}

const PageSettingsModal: React.FC<PageSettingsModalProps> = ({ config, onSave, onClose }) => {
  const [headerHeight, setHeaderHeight] = useState(config.headerHeight.toString());
  const [footerHeight, setFooterHeight] = useState(config.footerHeight.toString());
  const [fontSizeScale, setFontSizeScale] = useState(config.fontSizeScale.toString());

  const handleSave = () => {
      onSave({
          headerHeight: parseInt(headerHeight) || 60,
          footerHeight: parseInt(footerHeight) || 100,
          fontSizeScale: parseFloat(fontSizeScale) || 1.0,
          showLogo: true
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full m-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-blue-600">
                <div className="bg-blue-100 p-2 rounded-full">
                    <LayoutTemplate size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Lehe Seaded</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
            </button>
        </div>

        <div className="space-y-4 mb-6">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Päise Kõrgus (px)</label>
                <input type="number" value={headerHeight} onChange={(e) => setHeaderHeight(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Jaluse Kõrgus (px)</label>
                <input type="number" value={footerHeight} onChange={(e) => setFooterHeight(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Teksti Suuruse Skaala (1.0 = Tavaline)</label>
                <input type="number" step="0.1" value={fontSizeScale} onChange={(e) => setFontSizeScale(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
        </div>

        <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Loobu</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvesta</button>
        </div>
      </div>
    </div>
  );
};

export default PageSettingsModal;