import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CraneModel, Shape } from '../types';

// Default crane database
export const DEFAULT_CRANES: CraneModel[] = [
  {
    id: 'ltm1030',
    manufacturer: 'Liebherr',
    model: 'LTM 1030-2.1',
    type: 'mobile',
    bodyLengthM: 10.5,
    bodyWidthM: 2.55,
    outriggers: { spreadFrontM: 5.8, spreadRearM: 5.8, spreadSideM: 5.8 },
    boomLengths: [30, 35, 40],
    capacityChart: [
      { radiusM: 3, capacityKg: 30000 },
      { radiusM: 5, capacityKg: 18000 },
      { radiusM: 10, capacityKg: 7500 },
      { radiusM: 15, capacityKg: 4500 },
      { radiusM: 20, capacityKg: 2500 },
    ],
    maxRadius: 30,
    maxHeight: 40,
  },
  {
    id: 'ltm1055',
    manufacturer: 'Liebherr',
    model: 'LTM 1055-3.2',
    type: 'mobile',
    bodyLengthM: 11.5,
    bodyWidthM: 2.75,
    outriggers: { spreadFrontM: 6.3, spreadRearM: 6.3, spreadSideM: 6.3 },
    boomLengths: [40, 48, 55],
    capacityChart: [
      { radiusM: 3, capacityKg: 55000 },
      { radiusM: 5, capacityKg: 35000 },
      { radiusM: 10, capacityKg: 14000 },
      { radiusM: 15, capacityKg: 8500 },
      { radiusM: 20, capacityKg: 5500 },
      { radiusM: 30, capacityKg: 2500 },
    ],
    maxRadius: 40,
    maxHeight: 55,
  },
  {
    id: 'ltm1090',
    manufacturer: 'Liebherr',
    model: 'LTM 1090-4.2',
    type: 'mobile',
    bodyLengthM: 13.2,
    bodyWidthM: 2.88,
    outriggers: { spreadFrontM: 7.0, spreadRearM: 7.0, spreadSideM: 7.0 },
    boomLengths: [50, 60, 70],
    capacityChart: [
      { radiusM: 3, capacityKg: 90000 },
      { radiusM: 5, capacityKg: 55000 },
      { radiusM: 10, capacityKg: 25000 },
      { radiusM: 15, capacityKg: 15000 },
      { radiusM: 20, capacityKg: 10000 },
      { radiusM: 30, capacityKg: 5500 },
      { radiusM: 40, capacityKg: 3000 },
    ],
    maxRadius: 50,
    maxHeight: 70,
  },
  {
    id: 'ltm1200',
    manufacturer: 'Liebherr',
    model: 'LTM 1200-5.1',
    type: 'mobile',
    bodyLengthM: 15.5,
    bodyWidthM: 3.0,
    outriggers: { spreadFrontM: 8.0, spreadRearM: 8.0, spreadSideM: 8.0 },
    boomLengths: [72, 84, 100],
    capacityChart: [
      { radiusM: 3, capacityKg: 200000 },
      { radiusM: 5, capacityKg: 120000 },
      { radiusM: 10, capacityKg: 55000 },
      { radiusM: 15, capacityKg: 35000 },
      { radiusM: 20, capacityKg: 25000 },
      { radiusM: 30, capacityKg: 14000 },
      { radiusM: 40, capacityKg: 8000 },
      { radiusM: 50, capacityKg: 5000 },
    ],
    maxRadius: 72,
    maxHeight: 100,
  },
];

interface CranePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCrane: (crane: CraneModel, config: Shape['craneConfig']) => void;
  customCranes: CraneModel[];
  onAddCustomCrane: (crane: CraneModel) => void;
  onDeleteCustomCrane: (id: string) => void;
}

export const CranePickerModal: React.FC<CranePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCrane,
  customCranes,
  onAddCustomCrane,
  onDeleteCustomCrane,
}) => {
  const [selectedCrane, setSelectedCrane] = useState<CraneModel | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Configuration for the selected crane
  const [config, setConfig] = useState({
    workingRadiusM: 10,
    boomAngleDeg: -90,
    showRadiusCircle: true,
    showOutriggers: true,
    showBoom: true,
    showDimensions: true,
    radiusCircles: [10, 20, 30] as number[],
  });

  // New crane form
  const [newCrane, setNewCrane] = useState<Partial<CraneModel>>({
    manufacturer: '',
    model: '',
    type: 'mobile',
    bodyLengthM: 10,
    bodyWidthM: 2.5,
    outriggers: { spreadFrontM: 6, spreadRearM: 6, spreadSideM: 6 },
    boomLengths: [30, 40, 50],
    capacityChart: [],
    maxRadius: 30,
    maxHeight: 40,
  });

  if (!isOpen) return null;

  const allCranes = [...DEFAULT_CRANES, ...customCranes];

  const handleSelect = () => {
    if (!selectedCrane) return;

    const craneConfig: Shape['craneConfig'] = {
      modelName: `${selectedCrane.manufacturer} ${selectedCrane.model}`,
      manufacturer: selectedCrane.manufacturer,
      bodyLengthM: selectedCrane.bodyLengthM,
      bodyWidthM: selectedCrane.bodyWidthM,
      outriggerSpreadM: selectedCrane.outriggers.spreadFrontM,
      outriggerLengthM: 1.5,
      currentRadiusM: config.workingRadiusM,
      showRadiusCircle: config.showRadiusCircle,
      radiusCircles: config.radiusCircles,
      boomLengthM: selectedCrane.boomLengths[0],
      boomAngleDeg: config.boomAngleDeg,
      showDimensions: config.showDimensions,
      showOutriggers: config.showOutriggers,
      showBoom: config.showBoom,
    };

    onSelectCrane(selectedCrane, craneConfig);
    onClose();
  };

  const handleAddCrane = () => {
    if (!newCrane.manufacturer || !newCrane.model) return;

    const crane: CraneModel = {
      id: `custom-${Date.now()}`,
      manufacturer: newCrane.manufacturer || '',
      model: newCrane.model || '',
      type: newCrane.type || 'mobile',
      bodyLengthM: newCrane.bodyLengthM || 10,
      bodyWidthM: newCrane.bodyWidthM || 2.5,
      outriggers: newCrane.outriggers || { spreadFrontM: 6, spreadRearM: 6, spreadSideM: 6 },
      boomLengths: newCrane.boomLengths || [30],
      capacityChart: newCrane.capacityChart || [],
      maxRadius: newCrane.maxRadius || 30,
      maxHeight: newCrane.maxHeight || 40,
    };

    onAddCustomCrane(crane);
    setShowAddForm(false);
    setNewCrane({
      manufacturer: '',
      model: '',
      type: 'mobile',
      bodyLengthM: 10,
      bodyWidthM: 2.5,
      outriggers: { spreadFrontM: 6, spreadRearM: 6, spreadSideM: 6 },
      boomLengths: [30, 40, 50],
      capacityChart: [],
      maxRadius: 30,
      maxHeight: 40,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Vali Kraana</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Crane list */}
          <div className="space-y-2 mb-4">
            {allCranes.map((crane) => (
              <div
                key={crane.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedCrane?.id === crane.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCrane(crane)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{crane.manufacturer} {crane.model}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({crane.type})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Max: {crane.maxRadius}m / {(crane.capacityChart[0]?.capacityKg / 1000).toFixed(0)}t
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === crane.id ? null : crane.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {expandedId === crane.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {crane.id.startsWith('custom-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomCrane(crane.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === crane.id && (
                  <div className="mt-3 pt-3 border-t text-sm grid grid-cols-2 gap-2">
                    <div>Keha: {crane.bodyLengthM}m x {crane.bodyWidthM}m</div>
                    <div>Käpad: {crane.outriggers.spreadFrontM}m</div>
                    <div>Nooled: {crane.boomLengths.join(', ')}m</div>
                    <div>Max kõrgus: {crane.maxHeight}m</div>
                    <div className="col-span-2">
                      <strong>Tõstevõime:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {crane.capacityChart.map((c, i) => (
                          <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {c.radiusM}m: {(c.capacityKg / 1000).toFixed(1)}t
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add custom crane button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              Lisa oma kraana
            </button>
          )}

          {/* Add crane form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <h3 className="font-medium">Lisa uus kraana</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Tootja (nt Liebherr)"
                  value={newCrane.manufacturer}
                  onChange={(e) => setNewCrane({ ...newCrane, manufacturer: e.target.value })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Mudel (nt LTM 1090)"
                  value={newCrane.model}
                  onChange={(e) => setNewCrane({ ...newCrane, model: e.target.value })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  placeholder="Keha pikkus (m)"
                  value={newCrane.bodyLengthM}
                  onChange={(e) => setNewCrane({ ...newCrane, bodyLengthM: parseFloat(e.target.value) })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  placeholder="Keha laius (m)"
                  value={newCrane.bodyWidthM}
                  onChange={(e) => setNewCrane({ ...newCrane, bodyWidthM: parseFloat(e.target.value) })}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  placeholder="Käppade laius (m)"
                  value={newCrane.outriggers?.spreadFrontM}
                  onChange={(e) =>
                    setNewCrane({
                      ...newCrane,
                      outriggers: {
                        ...newCrane.outriggers!,
                        spreadFrontM: parseFloat(e.target.value),
                        spreadRearM: parseFloat(e.target.value),
                        spreadSideM: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  placeholder="Max raadius (m)"
                  value={newCrane.maxRadius}
                  onChange={(e) => setNewCrane({ ...newCrane, maxRadius: parseFloat(e.target.value) })}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCrane}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Lisa
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  Tühista
                </button>
              </div>
            </div>
          )}

          {/* Configuration for selected crane */}
          {selectedCrane && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium mb-3">Seadistused: {selectedCrane.model}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Tööraadius (m)</label>
                  <input
                    type="number"
                    value={config.workingRadiusM}
                    onChange={(e) => setConfig({ ...config, workingRadiusM: parseFloat(e.target.value) })}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Noole suund (kraadid)</label>
                  <input
                    type="number"
                    value={config.boomAngleDeg}
                    onChange={(e) => setConfig({ ...config, boomAngleDeg: parseFloat(e.target.value) })}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Raadiusringid (m, komaga eraldatud)</label>
                  <input
                    type="text"
                    value={config.radiusCircles.join(', ')}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        radiusCircles: e.target.value.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)),
                      })
                    }
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showRadiusCircle}
                      onChange={(e) => setConfig({ ...config, showRadiusCircle: e.target.checked })}
                    />
                    Näita raadiusringe
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showOutriggers}
                      onChange={(e) => setConfig({ ...config, showOutriggers: e.target.checked })}
                    />
                    Näita käpasid
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showBoom}
                      onChange={(e) => setConfig({ ...config, showBoom: e.target.checked })}
                    />
                    Näita noolt
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.showDimensions}
                      onChange={(e) => setConfig({ ...config, showDimensions: e.target.checked })}
                    />
                    Näita mõõte
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Tühista
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedCrane}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lisa plaanile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CranePickerModal;
