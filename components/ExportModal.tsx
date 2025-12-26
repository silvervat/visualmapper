
import React, { useState } from 'react';
import { X, Download, FileText, Map, Image, Settings } from 'lucide-react';

export type ExportFormat = 'png' | 'pdf' | 'dxf' | 'geojson';

export interface ExportOptions {
  format: ExportFormat;
  useWorldCoordinates: boolean;
  includeLabels: boolean;
  includeMeasurements: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  layerPrefix: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  hasCalibration: boolean;
  hasCoordRefs: boolean;
  isExporting: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  hasCalibration,
  hasCoordRefs,
  isExporting
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    useWorldCoordinates: hasCoordRefs,
    includeLabels: true,
    includeMeasurements: true,
    includeHeader: true,
    includeFooter: true,
    layerPrefix: ''
  });

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(options);
  };

  const formatOptions: { value: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: 'png',
      label: 'PNG Pilt',
      description: 'Rastrpilt koos joonistatuga',
      icon: <Image size={20} className="text-emerald-600" />
    },
    {
      value: 'pdf',
      label: 'PDF Dokument',
      description: 'Prinditav dokument',
      icon: <FileText size={20} className="text-red-600" />
    },
    {
      value: 'dxf',
      label: 'DXF (CAD)',
      description: 'Trimble Connect, AutoCAD jne',
      icon: <Settings size={20} className="text-blue-600" />
    },
    {
      value: 'geojson',
      label: 'GeoJSON',
      description: 'GIS rakendused ja kaardid',
      icon: <Map size={20} className="text-violet-600" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Ekspordi</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formaat
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOptions(prev => ({ ...prev, format: opt.value }))}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all
                    ${options.format === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {opt.icon}
                  <div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format-specific options */}
          {(options.format === 'dxf' || options.format === 'geojson') && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Kasuta maailma koordinaate</label>
                <input
                  type="checkbox"
                  checked={options.useWorldCoordinates}
                  onChange={e => setOptions(prev => ({ ...prev, useWorldCoordinates: e.target.checked }))}
                  disabled={!hasCoordRefs}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              {!hasCoordRefs && (
                <p className="text-xs text-amber-600">
                  Maailma koordinaatide kasutamiseks lisa 2 koordinaatpunkti
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Sildid</label>
                <input
                  type="checkbox"
                  checked={options.includeLabels}
                  onChange={e => setOptions(prev => ({ ...prev, includeLabels: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Mootmised</label>
                <input
                  type="checkbox"
                  checked={options.includeMeasurements}
                  onChange={e => setOptions(prev => ({ ...prev, includeMeasurements: e.target.checked }))}
                  disabled={!hasCalibration}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              {!hasCalibration && (
                <p className="text-xs text-amber-600">
                  Mootmiste lisamiseks kalibreeri joonis
                </p>
              )}

              {options.format === 'dxf' && (
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Kihi prefiks</label>
                  <input
                    type="text"
                    value={options.layerPrefix}
                    onChange={e => setOptions(prev => ({ ...prev, layerPrefix: e.target.value }))}
                    placeholder="nt. VM_"
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
              )}
            </div>
          )}

          {options.format === 'pdf' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Lisa pais</label>
                <input
                  type="checkbox"
                  checked={options.includeHeader}
                  onChange={e => setOptions(prev => ({ ...prev, includeHeader: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Lisa jalus</label>
                <input
                  type="checkbox"
                  checked={options.includeFooter}
                  onChange={e => setOptions(prev => ({ ...prev, includeFooter: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Tuhista
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ekspordin...
              </>
            ) : (
              <>
                <Download size={16} />
                Ekspordi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
