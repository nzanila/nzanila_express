import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  Save,
  Eye,
  LayoutGrid,
  ImageIcon,
  FileText,
  Video,
  Package,
  Globe,
  Building,
  Sparkles,
  Trash2,
  Edit3,
  MoveUp,
  MoveDown,
  X,
  Upload,
  Columns,
  ShieldCheck,
  Clock,
  Users,
  Settings,
} from 'lucide-react';
import {
  MODULE_DEFINITIONS,
  MODULE_CATEGORIES,
  type ModuleDefinition,
  type ModuleType,
  type StorefrontConfig,
  type StorefrontModule,
  type StorefrontSection,
  DEFAULT_STOREFRONT_CONFIG,
} from '@/lib/storefront-types';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

interface DraggedModule {
  type: ModuleType;
}

function ModuleIcon({ type }: { type: ModuleType }) {
  const iconMap: Record<ModuleType, ReactNode> = {
    'page-background': <LayoutGrid size={20} className="text-blue-500" />,
    'recommended-products': <Package size={20} className="text-green-500" />,
    'image-text': <FileText size={20} className="text-purple-500" />,
    'video': <Video size={20} className="text-red-500" />,
    'marketing': <Sparkles size={20} className="text-yellow-500" />,
    'company': <Building size={20} className="text-indigo-500" />,
    'hero': <LayoutGrid size={20} className="text-pink-500" />,
    'product-category': <LayoutGrid size={20} className="text-teal-500" />,
    'double-row-products': <Columns size={20} className="text-cyan-500" />,
    'store-sign': <ImageIcon size={20} className="text-orange-500" />,
  };
  return iconMap[type] || <FileText size={20} />;
}

function ModuleLibrary({
  searchQuery,
  selectedCategory,
  onDragStart,
}: {
  searchQuery: string;
  selectedCategory: string;
  onDragStart: (def: ModuleDefinition) => void;
}) {
  const filtered = MODULE_DEFINITIONS.filter((mod) => {
    const matchesSearch =
      mod.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || mod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="overflow-y-auto px-3 pb-4">
      <div className="space-y-2">
        {filtered.map((mod) => (
          <div
            key={mod.type}
            draggable
            onDragStart={() => onDragStart(mod)}
            className="group cursor-grab rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-orange-300 hover:shadow-md active:cursor-grabbing"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                <ModuleIcon type={mod.type} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{mod.label}</p>
                <p className="text-xs text-gray-500">{mod.description}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No modules found</p>
        )}
      </div>
    </div>
  );
}

function PropertiesPanel({
  module,
  onUpdate,
  onClose,
}: {
  module: StorefrontModule | null;
  onUpdate: (updates: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  if (!module) {
    return (
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
          <p className="text-xs text-gray-400 mt-1">Select a module to edit</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings size={48} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No module selected</p>
        </div>
      </div>
    );
  }

  const def = MODULE_DEFINITIONS.find((d) => d.type === module.type);
  const props = module.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      onUpdate({ ...module.props, [key]: value });
    },
    [module, onUpdate],
  );

  const renderField = (key: string, value: unknown, modDef: ModuleDefinition) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    const commonInputClasses = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';

    switch (typeof value) {
      case 'string':
        if (key.includes('color') || key.includes('backgroundColor')) {
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => updateProp(key, e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-gray-200 p-0.5"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateProp(key, e.target.value)}
                  className={commonInputClasses}
                />
              </div>
            </div>
          );
        }
        if (key.includes('image') || key.includes('Url') || key.includes('url') || key.includes('Image')) {
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateProp(key, e.target.value)}
                  className={commonInputClasses}
                  placeholder="https://..."
                />
                <button
                  onClick={() => updateProp(key, 'https://images.unsplash.com/photo-1503376780353-7e489f6b63a7?auto=format&fit=crop&w=1200&q=80')}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-gray-600 hover:bg-gray-50"
                  title="Use sample image"
                >
                  <ImageIcon size={16} />
                </button>
              </div>
            </div>
          );
        }
        if (key.includes('Text') || key.includes('text') || key.includes('description') || key.includes('title') || key.includes('subtitle')) {
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <textarea
                value={value ?? ''}
                onChange={(e) => updateProp(key, e.target.value)}
                className={`${commonInputClasses} min-h-[60px] resize-y`}
                rows={2}
              />
            </div>
          );
        }
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            <input
              type="text"
              value={value ?? ''}
              onChange={(e) => updateProp(key, e.target.value)}
              className={commonInputClasses}
            />
          </div>
        );
      case 'number':
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            <input
              type="number"
              value={value ?? 0}
              onChange={(e) => updateProp(key, Number(e.target.value))}
              className={commonInputClasses}
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between py-1.5">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            <button
              onClick={() => updateProp(key, !value)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                value ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
      default:
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            <input
              type="text"
              value={String(value ?? '')}
              onChange={(e) => updateProp(key, e.target.value)}
              className={commonInputClasses}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <ModuleIcon type={module.type} />
          <h3 className="text-sm font-semibold text-gray-900">{def?.label || module.type}</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1">{def?.description}</p>
      </div>

      <div className="space-y-4">
        {Object.entries(props).map(([key, value]) =>
          renderField(key, value, def!),
        )}
      </div>

      <div className="border-t border-gray-200 pt-3 space-y-2">
        <button
          onClick={() => updateProp('_sectionTitle', module.props._sectionTitle || def?.label)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Set as section title
        </button>
      </div>
    </div>
  );
}

function CanvasArea({
  config,
  selectedSection,
  selectedModule,
  onSelectSection,
  onSelectModule,
  onDropModule,
  onUpdateModule,
  onRemoveModule,
  onMoveModule,
  onUpdateShopSign,
  onSetShopSign,
   onSave,
  isSaving,
  loading,
  onPreview,
}: {
  config: StorefrontConfig;
  selectedSection: string;
  selectedModule: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onDropModule: (type: ModuleType, insertAtIndex?: number) => void;
  onUpdateModule: (moduleId: string, props: Record<string, unknown>) => void;
  onRemoveModule: (moduleId: string) => void;
  onMoveModule: (moduleId: string, direction: 'up' | 'down') => void;
  onUpdateShopSign: (updates: Partial<{ imageUrl: string; altText: string; hidden: boolean }>) => void;
  onSetShopSign: (updates: Partial<{ imageUrl: string | null; altText: string; hidden: boolean }>) => void;
  onSave: () => void;
  isSaving: boolean;
  loading: boolean;
  onPreview: () => void;
}) {
  const section = config.sections.find((s) => s.id === selectedSection);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/json');
    if (type) {
      onDropModule(JSON.parse(type) as ModuleType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleModuleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const { type } = JSON.parse(data);
      onDropModule(type as ModuleType, targetIndex);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-3">
          {config.sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                selectedSection === sec.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {sec.name}
            </button>
          ))}
         </div>

        <div className="mb-3 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Shop Sign:</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              onSetShopSign({ imageUrl: url, altText: 'Store Banner' });
            }}
            className="hidden"
            id="shop-sign-upload"
          />
          <label
            htmlFor="shop-sign-upload"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Upload size={16} /> Upload Banner
          </label>
          {config.shopSign?.imageUrl && (
            <button
              onClick={() =>
                onSetShopSign({ hidden: !config.shopSign!.hidden })
              }
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              {config.shopSign.hidden ? 'Show' : 'Hide'} banner
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3">
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye size={16} /> Preview
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || loading}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Storefront'}
            </button>
          </div>
      </div>

      <div className="p-4 pb-20">
        {config.shopSign && !config.shopSign.hidden && config.shopSign.imageUrl && (
          <div className="mb-4">
            <img
              src={config.shopSign.imageUrl}
              alt={config.shopSign.altText || 'Store Banner'}
              className="h-40 w-full object-cover"
            />
          </div>
        )}

        <div
          className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-4 min-h-[200px] transition-colors hover:border-orange-300"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p className="text-center text-sm text-gray-400 mb-4">
            Drag modules here or drop between sections
          </p>

          {section && section.modules.length === 0 ? (
            <div className="text-center py-8">
              <LayoutGrid size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No modules yet. Drag from the library.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {section?.modules.map((mod, index) => {
                const def = MODULE_DEFINITIONS.find((d) => d.type === mod.type);
                return (
                  <div
                    key={mod.id}
                    onClick={() => onSelectModule(mod.id)}
                    className={`group relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedModule === mod.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onDrop={(e) => handleModuleDrop(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ModuleIcon type={mod.type} />
                        <span className="text-sm font-medium text-gray-900">
                          {def?.label || mod.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveModule(mod.id, 'up'); }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title="Move up"
                          >
                            <MoveUp size={14} />
                          </button>
                        )}
                        {index < (section?.modules.length ?? 0) - 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveModule(mod.id, 'down'); }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title="Move down"
                          >
                            <MoveDown size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveModule(mod.id); }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <StorefrontModulePreview
                      mod={mod}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StorefrontModulePreview({ mod }: { mod: StorefrontModule }) {
  const props = mod.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];

  switch (mod.type) {
    case 'hero':
      return (
        <div
          className="relative h-40 rounded-lg bg-cover bg-center bg-no-repeat flex items-center justify-center text-center"
          style={{ backgroundImage: `url(${props.imageUrl || 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80'})` }}
        >
          <div className="rounded-lg bg-black/40 px-4 py-2">
          <h3 className="text-lg font-bold text-white">{String(p('title') || 'Hero Banner')}</h3>
          {p('subtitle') && <p className="text-sm text-gray-200">{String(p('subtitle'))}</p>}
          </div>
        </div>
      );

    case 'image-text':
      return (
        <div className="relative h-32 rounded-lg bg-cover bg-center bg-no-repeat flex items-center justify-center">
          <img
            src={String(p('imageUrl') || 'https://via.placeholder.com/800x200')}
            alt={String(p('title') || '')}
            className="h-32 w-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <h3 className="text-lg font-bold text-white">{String(p('title') || 'Image & Text')}</h3>
            {p('subtitle') && <p className="text-sm text-gray-200">{String(p('subtitle'))}</p>}
          </div>
        </div>
      );

    case 'marketing':
      return (
        <div
          className="rounded-lg p-6 text-center"
          style={{ backgroundColor: String(p('backgroundColor') || '#fff3f0') }}
        >
          <h3 className="text-lg font-bold" style={{ color: String(p('textColor') || '#ff5a36') }}>
            {String(p('title') || 'Marketing Section')}
          </h3>
          {p('description') && (
            <p className="text-sm text-gray-700 mt-1">{String(p('description'))}</p>
          )}
          {p('buttonText') && (
            <button className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
              {String(p('buttonText'))}
            </button>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="aspect-video rounded-lg bg-black/10 flex items-center justify-center">
          {p('videoUrl') ? (
            <iframe
              src={p('videoUrl') as string}
              className="h-full w-full rounded-lg"
              allowFullScreen
            />
          ) : (
            <div className="text-center text-gray-500">
              <Video size={32} className="mx-auto mb-2" />
              <p className="text-sm">Video placeholder</p>
            </div>
          )}
        </div>
      );

    case 'company':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900">{String(p('title') || 'Our Company')}</h3>
          {p('description') && (
            <p className="text-sm text-gray-600 mt-1">{String(p('description'))}</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {p('showCertification') && <div className="text-center"><ShieldCheck size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">Certified</p></div>}
            {p('showYearsActive') && <div className="text-center"><Clock size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">5+ Years</p></div>}
            {p('showEmployees') && <div className="text-center"><Users size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">100+ Employees</p></div>}
          </div>
        </div>
      );

    case 'recommended-products':
    case 'product-category':
    case 'double-row-products':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
           <h3 className="text-lg font-bold text-gray-900 mb-2">{String(p('title') || 'Products')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      );

    case 'page-background':
      return (
        <div
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: String(p('backgroundColor') || '#ffffff') }}
        >
          <p className="text-sm text-gray-600">Page background set to {String(p('backgroundColor') || '#ffffff')}</p>
        </div>
      );

    case 'store-sign':
      return (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          Store Sign Section
        </div>
      );

    default:
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">{String(p('title') || mod.type)}</p>
        </div>
      );
  }
}

export function StorefrontBuilder() {
  const { user } = useAuth();
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);
  const [selectedSection, setSelectedSection] = useState('home');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const dragItem = useRef<{ type: ModuleType } | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const res = await fetch(`${API}/api/stores/${user.id}/storefront`, {
          headers: { Authorization: `Bearer ${user.session?.accessToken || ''}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.sections) {
            setConfig({
              ...DEFAULT_STOREFRONT_CONFIG,
              ...data,
              storeId: user.id,
            });
          }
        }
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user]);

  const handleDragStart = useCallback((def: ModuleDefinition) => {
    dragItem.current = { type: def.type };
  }, []);

  const handleDropModule = useCallback(
    (type: ModuleType, _insertAtIndex?: number) => {
      const def = MODULE_DEFINITIONS.find((d) => d.type === type);
      if (!def) return;

      const newModule: StorefrontModule = {
        id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        props: { ...def.defaultProps },
        position: Date.now(),
      };

      setConfig((prev) => {
        const section = prev.sections.find((s) => s.id === selectedSection);
        if (!section) return prev;

        const newSections = prev.sections.map((s) => {
          if (s.id !== selectedSection) return s;
          const modules = [...s.modules];
          if (_insertAtIndex !== undefined) {
            modules.splice(_insertAtIndex, 0, newModule);
          } else {
            modules.push(newModule);
          }
          return { ...s, modules };
        });

        return { ...prev, sections: newSections };
      });

      setSelectedModule(newModule.id);
    },
    [selectedSection],
  );

  const handleUpdateModule = useCallback(
    (moduleId: string, newProps: Record<string, unknown>) => {
      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          modules: s.modules.map((m) =>
            m.id === moduleId ? { ...m, props: newProps } : m,
          ),
        })),
      }));
    },
    [],
  );

  const handleRemoveModule = useCallback((moduleId: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => ({
        ...s,
        modules: s.modules.filter((m) => m.id !== moduleId),
      })),
    }));
    setSelectedModule(null);
  }, []);

  const handleMoveModule = useCallback(
    (moduleId: string, direction: 'up' | 'down') => {
      setConfig((prev) => {
        const newSections = prev.sections.map((s) => {
          if (s.id !== selectedSection) return s;
          const modules = [...s.modules];
          const index = modules.findIndex((m) => m.id === moduleId);
          if (index === -1) return s;

          if (direction === 'up' && index > 0) {
            [modules[index], modules[index - 1]] = [modules[index - 1], modules[index]];
          } else if (direction === 'down' && index < modules.length - 1) {
            [modules[index], modules[index + 1]] = [modules[index + 1], modules[index]];
          }

          return { ...s, modules };
        });
        return { ...prev, sections: newSections };
      });
    },
    [selectedSection],
  );

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/api/stores/${user.id}/storefront`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.session?.accessToken || ''}`,
        },
        body: JSON.stringify({ ...config, storeId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Storefront saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save storefront');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedModuleData =
    config.sections
      .flatMap((s) => s.modules)
      .find((m) => m.id === selectedModule) || null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-72 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Storefront Builder</h2>
            <button className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50">
              <Eye size={18} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Search modules..."
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />

          <div className="mt-2 flex gap-1 flex-wrap">
            {MODULE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setLibraryCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  libraryCategory === cat.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <ModuleLibrary
          searchQuery={librarySearch}
          selectedCategory={libraryCategory}
          onDragStart={handleDragStart}
        />
      </aside>

      <CanvasArea
        config={config}
        selectedSection={selectedSection}
        selectedModule={selectedModule}
        onSelectSection={setSelectedSection}
        onSelectModule={setSelectedModule}
        onDropModule={handleDropModule}
        onUpdateModule={handleUpdateModule}
        onRemoveModule={handleRemoveModule}
        onMoveModule={handleMoveModule}
        onUpdateShopSign={() => {}}
        onSetShopSign={(updates) =>
          setConfig((prev) => ({
            ...prev,
            shopSign: {
              imageUrl: prev.shopSign?.imageUrl ?? null,
              altText: prev.shopSign?.altText ?? 'Store Banner',
              hidden: prev.shopSign?.hidden ?? false,
              ...updates,
            },
          }))
        }
        onSave={handleSave}
        isSaving={isSaving}
        loading={loading}
        onPreview={() => setShowPreview(true)}
      />

      <aside className="w-80 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
        <PropertiesPanel
          module={selectedModuleData}
          onUpdate={(props) =>
            selectedModuleData && handleUpdateModule(selectedModuleData.id, props)
          }
          onClose={() => setSelectedModule(null)}
        />
      </aside>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-[80vh] w-[90vw] max-w-6xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Storefront Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <StorefrontPreview config={config} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorefrontPreview({ config }: { config: StorefrontConfig }) {
  return (
    <div className="max-w-3xl mx-auto">
      {config.shopSign?.imageUrl && !config.shopSign.hidden && (
        <img src={config.shopSign.imageUrl} alt={config.shopSign.altText} className="h-40 w-full object-cover rounded-lg mb-4" />
      )}
      {config.sections.map((section) => (
        <div key={section.id} className="mb-6">
          <h3 className="text-lg font-bold mb-3 border-b border-gray-200 pb-2">{section.name}</h3>
          {section.modules.length === 0 ? (
            <p className="text-sm text-gray-400">No modules</p>
          ) : (
            <div className="space-y-4">
              {section.modules.map((mod) => (
                <StorefrontModulePreview key={mod.id} mod={mod} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

