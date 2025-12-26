
import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

// Import icon sets from react-icons
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as BiIcons from 'react-icons/bi';
import * as AiIcons from 'react-icons/ai';
import * as BsIcons from 'react-icons/bs';
import * as HiIcons from 'react-icons/hi';
import * as FiIcons from 'react-icons/fi';
import * as GiIcons from 'react-icons/gi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';
import * as VscIcons from 'react-icons/vsc';

// Legacy icons from our custom set
import { ICON_MAP } from '../utils/icons';

interface IconPickerModalProps {
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

type IconSet = {
  name: string;
  label: string;
  icons: Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  prefix: string;
};

const ICON_SETS: IconSet[] = [
  { name: 'legacy', label: 'Visual Mapper', icons: ICON_MAP as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: '' },
  { name: 'fa', label: 'Font Awesome', icons: FaIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Fa' },
  { name: 'md', label: 'Material', icons: MdIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Md' },
  { name: 'bi', label: 'Bootstrap', icons: BiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Bi' },
  { name: 'ai', label: 'Ant Design', icons: AiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Ai' },
  { name: 'bs', label: 'Bootstrap 2', icons: BsIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Bs' },
  { name: 'hi', label: 'Heroicons', icons: HiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Hi' },
  { name: 'fi', label: 'Feather', icons: FiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Fi' },
  { name: 'gi', label: 'Game Icons', icons: GiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Gi' },
  { name: 'io', label: 'Ionicons', icons: IoIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Io' },
  { name: 'ri', label: 'Remix', icons: RiIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Ri' },
  { name: 'tb', label: 'Tabler', icons: TbIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Tb' },
  { name: 'vsc', label: 'VS Code', icons: VscIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>, prefix: 'Vsc' },
];

// Count total icons
const TOTAL_ICON_COUNT = ICON_SETS.reduce((acc, set) => acc + Object.keys(set.icons).length, 0);

const IconPickerModal: React.FC<IconPickerModalProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeSet, setActiveSet] = useState<string>('legacy');
  const [page, setPage] = useState(0);
  const ICONS_PER_PAGE = 120;

  // Get current icon set
  const currentSet = ICON_SETS.find(s => s.name === activeSet) || ICON_SETS[0];

  // Get icon names from current set (filter out non-icon exports)
  const iconNames = useMemo(() => {
    return Object.keys(currentSet.icons).filter(name => {
      // Filter to only include actual icon components
      const item = currentSet.icons[name];
      return typeof item === 'function' &&
             name !== 'IconContext' &&
             name !== 'GenIcon' &&
             !name.startsWith('_');
    });
  }, [currentSet]);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) return iconNames;
    const searchLower = search.toLowerCase();
    return iconNames.filter(name =>
      name.toLowerCase().includes(searchLower)
    );
  }, [iconNames, search]);

  // Paginate
  const paginatedIcons = useMemo(() => {
    const start = page * ICONS_PER_PAGE;
    return filteredIcons.slice(start, start + ICONS_PER_PAGE);
  }, [filteredIcons, page]);

  const totalPages = Math.ceil(filteredIcons.length / ICONS_PER_PAGE);

  const handleSelect = useCallback((iconName: string) => {
    // Store with prefix for later retrieval
    const fullName = currentSet.name === 'legacy' ? iconName : `${currentSet.prefix}:${iconName}`;
    onSelect(fullName);
  }, [currentSet, onSelect]);

  // Render icon component safely
  const renderIcon = useCallback((name: string) => {
    try {
      const Icon = currentSet.icons[name];
      if (!Icon || typeof Icon !== 'function') return null;
      return <Icon size={24} className="text-gray-600 group-hover:text-blue-600" />;
    } catch {
      return null;
    }
  }, [currentSet]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-w-full m-4 h-[700px] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Vali Ikoon</h3>
            <p className="text-sm text-gray-500">{TOTAL_ICON_COUNT.toLocaleString()}+ ikooni saadaval</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Otsi ikooni (nt. 'home', 'user', 'building')..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Icon Set Tabs */}
        <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto flex-shrink-0">
          {ICON_SETS.map(set => (
            <button
              key={set.name}
              onClick={() => { setActiveSet(set.name); setPage(0); }}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all
                ${activeSet === set.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {set.label}
              <span className="ml-1 opacity-70">
                ({Object.keys(set.icons).filter(n => typeof set.icons[n] === 'function' && !n.startsWith('_')).length})
              </span>
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          }>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {paginatedIcons.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  className="flex flex-col items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all aspect-square group"
                  title={name}
                >
                  {renderIcon(name)}
                </button>
              ))}
            </div>
          </Suspense>

          {filteredIcons.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>Ikoone ei leitud.</p>
              <p className="text-sm">Proovi teist otsingut voi vaheta ikoonide komplekti.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-white">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Eelmine
            </button>
            <span className="text-sm text-gray-600">
              Leht {page + 1} / {totalPages} ({filteredIcons.length} ikooni)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Jargmine
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IconPickerModal;

// Helper function to get icon component by name (with prefix support)
export const getIconByName = (name: string): React.ComponentType<{ size?: number; className?: string }> | null => {
  if (!name) return null;

  // Check if it's a prefixed name (e.g., "Fa:FaHome")
  if (name.includes(':')) {
    const [prefix, iconName] = name.split(':');
    const set = ICON_SETS.find(s => s.prefix === prefix);
    if (set && set.icons[iconName]) {
      return set.icons[iconName] as React.ComponentType<{ size?: number; className?: string }>;
    }
  }

  // Check legacy icons first
  if (ICON_MAP[name]) {
    return ICON_MAP[name] as React.ComponentType<{ size?: number; className?: string }>;
  }

  // Search in all sets
  for (const set of ICON_SETS) {
    if (set.icons[name]) {
      return set.icons[name] as React.ComponentType<{ size?: number; className?: string }>;
    }
  }

  return null;
};
