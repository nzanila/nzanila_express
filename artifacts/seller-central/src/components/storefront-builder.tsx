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
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  MODULE_DEFINITIONS,
  MODULE_CATEGORIES,
  STOREFRONT_TEMPLATES,
  type StorefrontTemplate,
  type ModuleDefinition,
  type ModuleType,
  type StorefrontConfig,
  type StorefrontModule,
  type StorefrontSection,
  DEFAULT_STOREFRONT_CONFIG,
} from '../lib/storefront-types';

const API = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api.pages.dev';

interface StorefrontBuilderProps {
  storeId: number;
  onBack?: () => void;
}

function TemplateSelector({
  onSelect,
  onSkip,
}: {
  onSelect: (template: StorefrontTemplate) => void;
  onSkip: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff9900]/10 px-4 py-2 mb-4">
            <Sparkles size={18} className="text-[#ff9900]" />
            <span className="text-sm font-medium text-[#ff9900]">Storefront Builder</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Choose a Template</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Start with a pre-built template and customize it to fit your brand. You can always change everything later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {STOREFRONT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={`group relative text-left rounded-2xl border-2 overflow-hidden transition-all ${
                selectedId === template.id
                  ? 'border-[#ff9900] shadow-lg scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {selectedId === template.id && (
                  <div className="absolute top-3 right-3 bg-[#ff9900] text-white rounded-full p-1.5">
                    <Check size={14} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.config.sections[0]?.modules.slice(0, 3).map((mod) => (
                    <span
                      key={mod.id}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {MODULE_DEFINITIONS.find((d) => d.type === mod.type)?.label || mod.type}
                    </span>
                  ))}
                  {template.config.sections[0]?.modules.length > 3 && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      +{template.config.sections[0].modules.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onSkip}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Start Blank
          </button>
          <button
            onClick={() => {
              const template = STOREFRONT_TEMPLATES.find((t) => t.id === selectedId);
              if (template) onSelect(template);
            }}
            disabled={!selectedId}
            className="rounded-lg bg-[#ff9900] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e68a00] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuleIcon({ type }: { type: ModuleType }) {
  const iconMap: Record<ModuleType, ReactNode> = {
    'page-background': <LayoutGrid size={20} className="text-blue-500" />,
    'recommended-products': <Package size={20} className="text-green-500" />,
    'image-text': <FileText size={20} className="text-purple-500" />,
    'video': <Video size={20} className="text-red-500" />,
    'marketing': <Sparkles size={20} className="text-yellow-500" />,
    'company': <Building size={20} className="text-indigo-500" />,
    'hero': <ImageIcon size={20} className="text-pink-500" />,
    'product-category': <LayoutGrid size={20} className="text-teal-500" />,
    'double-row-products': <Columns size={20} className="text-cyan-500" />,
    'store-sign': <ImageIcon size={20} className="text-orange-500" />,
    'category-cards': <Columns size={20} className="text-blue-600" />,
    'stats': <Globe size={20} className="text-blue-700" />,
    'features': <Sparkles size={20} className="text-purple-600" />,
    'company-capacity': <Building size={20} className="text-slate-600" />,
    'certifications': <ShieldCheck size={20} className="text-green-600" />,
    'company-performance': <Clock size={20} className="text-amber-600" />,
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
  onDragStart: (def: ModuleDefinition, e: React.DragEvent) => void;
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
            onDragStart={(e) => onDragStart(mod, e)}
            className="group cursor-grab rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-[#ff9900] hover:shadow-md active:cursor-grabbing"
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

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      onUpdate({ ...module.props, [key]: value });
    },
    [module, onUpdate],
  );

  const renderField = (key: string, value: unknown, modDef: ModuleDefinition) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    const commonInputClasses = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#ff9900] focus:outline-none focus:ring-1 focus:ring-[#ff9900]';

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
                value ? 'bg-[#ff9900]' : 'bg-gray-300'
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
                  ? 'border-[#ff9900] text-[#ff9900]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {sec.name}
            </button>
          ))}
         </div>

        <div className="mb-3 flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Or enter image URL..."
              value={config.shopSign?.imageUrl || ''}
              onChange={(e) => onSetShopSign({ imageUrl: e.target.value || null })}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#ff9900] focus:outline-none"
            />
            {config.shopSign?.imageUrl && (
              <button
                onClick={() =>
                  onSetShopSign({ hidden: !config.shopSign!.hidden })
                }
                className="text-xs text-gray-500 underline hover:text-gray-700 whitespace-nowrap"
              >
                {config.shopSign.hidden ? 'Show' : 'Hide'}
              </button>
            )}
          </div>
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
            className="flex items-center gap-1.5 rounded-lg bg-[#ff9900] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#e68a00] disabled:opacity-50"
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
          className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-4 min-h-[200px] transition-colors hover:border-[#ff9900]"
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
                        ? 'border-[#ff9900] bg-orange-50'
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
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectModule(mod.id); }}
                          className="rounded p-1 text-[#ff9900] hover:bg-orange-50"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
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
                      storeId={config.storeId}
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

function StorefrontModulePreview({ mod, storeId }: { mod: StorefrontModule; storeId?: number }) {
  const props = mod.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  useEffect(() => {
    if (!storeId) return;
    if (!['recommended-products','product-category','double-row-products'].includes(mod.type)) return;
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    fetch(`${API}/api/stores/${storeId}/products`)
      .then(r => {
        if (!r.ok) throw new Error(`Products API returned ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (cancelled) return;
        if (Array.isArray(d)) {
          setLiveProducts(d.slice(0, Number(p('limit')) || Number((props as any).productCount) || 9));
        } else {
          setProductsError('Invalid response format');
        }
      })
      .catch(e => {
        if (!cancelled) setProductsError(e.message || 'Failed to load products');
      })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, mod.type, props.limit, (props as any).productCount]);

  switch (mod.type) {
    case 'hero':
      return (
        <div className="relative h-44 overflow-hidden bg-black flex">
          <div className="flex-1 flex flex-col justify-center px-6 bg-black text-white">
            {p('brand') && <p className="text-xs font-bold tracking-widest text-white mb-1">{String(p('brand'))}</p>}
            <h3 className="text-lg font-bold leading-tight">{String(p('title') || 'Hero Banner')}</h3>
            {p('subtitle') && <p className="text-[11px] text-gray-300 mt-1">{String(p('subtitle'))}</p>}
            {p('buttonText') ? <span className="mt-2 inline-block w-fit rounded bg-[#ff9900] px-3 py-1 text-xs font-semibold text-white">{String(p('buttonText'))}</span> : null}
          </div>
          <div className="h-44 w-[52%] bg-gradient-to-l from-gray-700 to-black relative overflow-hidden">
            <img
              src={String(p('imageUrl') || 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80')}
              alt={String(p('title') || 'Hero')}
              className="h-full w-full object-cover object-right"
            />
          </div>
        </div>
      );

    case 'image-text':
      return (
        <div className="relative h-32 rounded-lg bg-cover bg-center bg-no-repeat flex items-center justify-center">
          <img
            src={String(p('imageUrl') || '')}
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
            <button className="mt-3 rounded-lg bg-[#ff9900] px-4 py-2 text-sm font-semibold text-white">
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

    case 'product-category':
      if (productsLoading) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /><div className="mx-auto mt-0.5 h-0.5 w-16 bg-[#1677ff]/30" /></div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Number(p('productCount')) || 6 }).map((_, i) => (
                <div key={i} className="bg-white p-1 animate-pulse">
                  <div className="h-20 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded mt-1 w-3/4 mx-auto" />
                  <div className="h-3 bg-gray-200 rounded mt-1 w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (productsError) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /><div className="mx-auto mt-0.5 h-0.5 w-16 bg-[#1677ff]/30" /></div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs text-red-600">Failed to load products: {productsError}</p>
            </div>
          </div>
        );
      }
      if (liveProducts.length > 0) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /><div className="mx-auto mt-0.5 h-0.5 w-16 bg-[#1677ff]/30" /></div>
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.slice(0, Number(p('productCount'))||6).map((pr:any)=>(
                <div key={pr.id} className="bg-white p-1"><div className="h-20 bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover"/></div><p className="text-[11px] font-medium text-center truncate">{pr.name}</p><p className="text-[10px] text-center text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p></div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-[#f5f7fa] p-3">
          <div className="text-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3>
            <div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /><div className="mx-auto mt-0.5 h-0.5 w-16 bg-[#1677ff]/30" />
          </div>
          <div className={`${Number(p('productCount'))===2?'grid grid-cols-2':'grid grid-cols-3'} gap-2`}>
            {(Number(p('productCount'))===2?['Food and groceries','Agriculture and farming']:['Business Radio','DMR Radio','Digital Radio','Mini Radio','Radio Accessories','US Warehouse Stock']).slice(0, Number(p('productCount'))||6).map((name,i)=>(
              <div key={i} className="bg-white p-1">
                <div className={`bg-gray-100 flex items-center justify-center overflow-hidden ${Number(p('productCount'))===2?'h-28':'h-20'}`}>{Number(p('productCount'))===2?<img src={i===0?'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=60':'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=60'} alt={name} className="h-full w-full object-cover"/>:<Package size={20} className="text-gray-400" />}</div>
                <p className="text-[11px] font-medium text-center text-gray-800 mt-1 truncate">{name}</p>
                <p className="text-[9px] text-center text-[#1677ff]">[FIND MORE]</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'recommended-products':
    case 'double-row-products':
      if (productsLoading) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (productsError) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600">Failed to load products: {productsError}</p>
            </div>
          </div>
        );
      }
      if (liveProducts.length > 0) {
        return (
          <div className="bg-white border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold">{String(p('title') || 'Featured Products')}</h3><span className="text-xs text-[#1677ff]">View More ›</span></div>
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.map((pr:any)=>(
                <div key={pr.id} className="border border-gray-100 p-1">
                  <div className="h-24 bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover"/></div>
                  <p className="text-[11px] font-medium truncate mt-1">{pr.name}</p>
                  <p className="text-xs font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                  <p className="text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-gray-200 p-4">
           <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center">
                  <Package size={24} className="text-orange-300" />
                </div>
                <div className="p-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
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

    case 'category-cards':
      const categories = (props.categories as unknown as Array<{ name: string; sublabel?: string; imageUrl: string; link: string }>) || [];
      return (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="relative h-28 overflow-hidden flex p-0"
              style={{ backgroundColor: String(p('backgroundColor') || '#1677ff') }}
            >
              {/* diagonal ribbon */}
              {cat.sublabel && (
                <div className="absolute right-0 top-0 bg-white text-[#1677ff] text-[10px] font-bold px-6 py-0.5 rotate-[35deg] translate-x-6 translate-y-3">{cat.sublabel}</div>
              )}
              <div className="flex-1 py-4 pl-4 pr-2 flex flex-col justify-center">
                <span className="text-sm font-bold leading-tight" style={{ color: String(p('textColor') || '#ffffff') }}>{cat.name.split(' ')[0]}<br/>{cat.name.split(' ').slice(1).join(' ')}</span>
                <span className="mt-2 inline-block w-fit border border-white/80 rounded px-2 py-0.5 text-[10px] font-semibold text-white">SEE MORE</span>
              </div>
              <div className="w-[46%] flex items-end justify-end pb-2 pr-2">
                <img src={cat.imageUrl || ''} alt={cat.name} className="h-20 w-auto object-contain drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'stats':
      const stats = (props.stats as unknown as Array<{ value: string; label: string; suffix: string }>) || [];
      return (
        <div className="relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=60" alt="factory" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative p-4" style={{ backgroundColor: `${String(p('backgroundColor') || '#0f4fd8')}ee` }}>
            <div className="grid grid-cols-4 gap-4 text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-lg font-bold" style={{ color: String(p('textColor') || '#ffffff') }}>{stat.value}{stat.suffix}</p>
                  <p className="text-[10px] opacity-90" style={{ color: String(p('textColor') || '#ffffff') }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'features':
      const features = (props.features as unknown as Array<{ icon: string; title: string; description: string }>) || [];
      return (
        <div className="rounded-lg p-6 bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            {features.map((feat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#ff9900]/10 flex items-center justify-center">
                  <Building size={24} className="text-[#ff9900]" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{feat.title}</p>
                <p className="text-xs text-gray-500 mt-1">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'company-capacity':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Manufacturer Capability')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Years in Business</p>
              <p className="text-lg font-bold text-gray-900">15+</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Export %</p>
              <p className="text-lg font-bold text-gray-900">80%</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Factory Size</p>
              <p className="text-lg font-bold text-gray-900">50,000 m²</p>
            </div>
          </div>
        </div>
      );

    case 'certifications':
      const certs = (props.certifications as unknown as Array<{ name: string; description: string }>) || [];
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Certifications')}</h3>
          <div className="flex flex-wrap gap-3">
            {certs.map((cert, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <ShieldCheck size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{cert.name}</p>
                  <p className="text-xs text-gray-500">{cert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'company-performance':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Company Performance')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500">Response Time</p>
              <p className="text-lg font-bold text-green-600">{String(p('responseTime') || '< 24 hours')}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-500">On-time Delivery</p>
              <p className="text-lg font-bold text-blue-600">{String(p('onTimeDelivery') || '98.5%')}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-500">Transaction Level</p>
              <p className="text-lg font-bold text-orange-600">{String(p('transactionLevel') || 'AAA')}</p>
            </div>
          </div>
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

function StorefrontPreview({ config }: { config: StorefrontConfig }) {
  const [activeTab, setActiveTab] = useState('home');
  const activeSection = config.sections.find((s) => s.id === activeTab);
  return (
    <div className="max-w-4xl mx-auto bg-[#f5f7fa] border border-gray-200">
      {/* Alibaba Header - light blue gradient */}
      <div className="bg-gradient-to-r from-[#e6f0ff] to-[#cfe3ff] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white px-2 py-1 rounded font-black text-[#1677ff] text-xs tracking-wider">BAOFENG</div>
          <div>
            <p className="text-xs font-bold text-gray-900">Fujian Baofeng Electronics Co., Ltd.</p>
            <p className="text-[10px] text-gray-500">Gold Supplier • 15 years • Verified</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">Contact Supplier</span>
          <span className="hidden sm:inline-flex border border-gray-300 bg-white text-xs px-2 py-1 rounded">★ Collect</span>
        </div>
      </div>
      {/* Alibaba Nav - blue bar */}
      <div className="bg-[#1677ff] text-white flex items-center gap-0 px-2 overflow-x-auto">
        {config.sections.map((section) => (
          <button key={section.id} onClick={() => setActiveTab(section.id)} className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${activeTab === section.id ? 'bg-white text-[#1677ff] border-white' : 'border-transparent hover:bg-white/10'}`}>{section.name}</button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-1 bg-white rounded-full px-2 py-1 my-1"><span className="text-[10px] text-gray-500">Search in store</span></div>
      </div>
      {/* Shop Sign / Banner */}
      {config.shopSign?.imageUrl && !config.shopSign.hidden && (
        <div className="relative h-36 bg-gray-100 overflow-hidden"><img src={config.shopSign.imageUrl} alt={config.shopSign.altText || 'Store Banner'} className="w-full h-full object-cover" /></div>
      )}
      {/* Content */}
      <div className="min-h-[400px] bg-[#f5f7fa]">
        {activeSection && activeSection.modules.length === 0 ? (
          <div className="text-center py-12 bg-white m-4 rounded"><Package size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No modules in this section.</p></div>
        ) : (
          <div className="space-y-0">{activeSection?.modules.map((mod) => (<StorefrontModulePreview key={mod.id} mod={mod} storeId={config.storeId} />))}</div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-[10px] text-gray-500">Alibaba.com • Powered by Nzanila Express • Terms & Privacy</div>
    </div>
  );
}

const STORE_BASE = (import.meta as any).env?.VITE_STORE_URL || 'https://nzanila-express.pages.dev';

export function StorefrontBuilder({ storeId, onBack }: StorefrontBuilderProps) {
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);
  const [selectedSection, setSelectedSection] = useState('home');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const dragItem = useRef<{ type: ModuleType } | null>(null);

  useEffect(() => {
    const persist = async (cfg: StorefrontConfig) => {
      try {
        const token = localStorage.getItem('sc_token');
        await fetch(`${API}/api/stores/${storeId}/storefront`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
          body: JSON.stringify(cfg),
        });
      } catch {}
    };
    const loadConfig = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const token = localStorage.getItem('sc_token');
        if (!userData || !token) {
          setLoading(false);
          setShowTemplateSelector(false);
          return;
        }

        // Fetch store slug for "View Store" link
        try {
          const storeRes = await fetch(`${API}/api/stores/${storeId}`);
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            if (storeData.store?.slug) setStoreSlug(storeData.store.slug);
          }
        } catch {}

        const res = await fetch(`${API}/api/stores/${storeId}/storefront`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.sections) && data.sections.length > 0) {
            const hasModules = data.sections.some((s: any) => s.modules?.length > 0);
            if (hasModules) {
              setConfig({ ...DEFAULT_STOREFRONT_CONFIG, ...data, storeId });
              setHasExistingConfig(true);
            } else {
              const tpl = STOREFRONT_TEMPLATES.find(t=>t.id==='food-grocery');
              if (tpl) {
                const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
                setConfig(cfg);
                setHasExistingConfig(false);
                persist(cfg);
              }
            }
            setShowTemplateSelector(false);
            } else {
              let storeTemplate = data?.template;
              if (!storeTemplate) {
                const storeRes = await fetch(`${API}/api/stores/${storeId}`);
                if (storeRes.ok) {
                  const storeData = await storeRes.json();
                  if (storeData.store?.storeTemplate) storeTemplate = storeData.store.storeTemplate;
                }
              }
              const matchedTemplate = storeTemplate ? STOREFRONT_TEMPLATES.find(t => t.id === storeTemplate) : null;
              const tpl = matchedTemplate || STOREFRONT_TEMPLATES.find(t=>t.id==='food-grocery');
            if (tpl) {
              const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
              setConfig(cfg);
              setHasExistingConfig(false);
              persist(cfg);
            }
            setShowTemplateSelector(false);
          }
        } else {
          const storeRes = await fetch(`${API}/api/stores/${storeId}`);
          let storeTemplate = 'food-grocery';
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            if (storeData.store?.storeTemplate) storeTemplate = storeData.store.storeTemplate;
          }
          const tpl = STOREFRONT_TEMPLATES.find(t=>t.id===storeTemplate) || STOREFRONT_TEMPLATES.find(t=>t.id==='food-grocery');
          if (tpl) {
            const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
            setConfig(cfg);
            setHasExistingConfig(false);
            persist(cfg);
          }
          setShowTemplateSelector(false);
        }
      } catch (err) {
        console.error('Load error:', err);
        const storeRes = await fetch(`${API}/api/stores/${storeId}`);
        let storeTemplate = 'food-grocery';
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData.store?.storeTemplate) storeTemplate = storeData.store.storeTemplate;
        }
        const tpl = STOREFRONT_TEMPLATES.find(t=>t.id===storeTemplate) || STOREFRONT_TEMPLATES.find(t=>t.id==='food-grocery');
        if (tpl) {
          const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
          setConfig(cfg);
          setHasExistingConfig(false);
          try {
            const token = localStorage.getItem('sc_token');
            await fetch(`${API}/api/stores/${storeId}/storefront`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify(cfg) });
          } catch {}
        }
        setShowTemplateSelector(false);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [storeId]);

  const handleSelectTemplate = (template: StorefrontTemplate) => {
    const cfg = {
      ...DEFAULT_STOREFRONT_CONFIG,
      ...template.config,
      storeId: storeId,
      updatedAt: new Date().toISOString(),
    } as StorefrontConfig;
    setConfig(cfg);
    setShowTemplateSelector(false);
    setHasExistingConfig(true);
    const token = localStorage.getItem('sc_token');
    fetch(`${API}/api/stores/${storeId}/storefront`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(cfg),
    }).catch(()=>{});
  };

  const handleSkipTemplate = () => {
    setShowTemplateSelector(false);
    setHasExistingConfig(true);
  };

  const handleDragStart = useCallback((def: ModuleDefinition, e: React.DragEvent) => {
    dragItem.current = { type: def.type };
    e.dataTransfer.setData('application/json', JSON.stringify(def.type));
    e.dataTransfer.effectAllowed = 'copy';
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
    setIsSaving(true);
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${API}/api/stores/${storeId}/storefront`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ ...config, storeId: storeId }),
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-[#ff9900] animate-pulse mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading storefront...</p>
        </div>
      </div>
    );
  }

  if (showTemplateSelector) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> Back to Stores
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">Storefront Builder</h1>
        </div>
        <TemplateSelector onSelect={handleSelectTemplate} onSkip={handleSkipTemplate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> Back to Stores
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900">Storefront Builder</h1>
        <div className="ml-auto flex items-center gap-3">
          {storeSlug && (
            <a
              href={`${STORE_BASE}/store/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Globe size={16} /> View Store
            </a>
          )}
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LayoutGrid size={16} /> Change Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Module Library */}
        <aside className="w-72 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Module Library</h2>
            </div>

            <input
              type="text"
              placeholder="Search modules..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#ff9900]"
            />

            <div className="mt-2 flex gap-1 flex-wrap">
              {MODULE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setLibraryCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    libraryCategory === cat.id
                      ? 'bg-[#ff9900]/10 text-[#ff9900]'
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

        {/* Center - Canvas Area */}
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

        {/* Right Sidebar - Properties Panel */}
        <aside className="w-80 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
          <PropertiesPanel
            module={selectedModuleData}
            onUpdate={(props) =>
              selectedModuleData && handleUpdateModule(selectedModuleData.id, props)
            }
            onClose={() => setSelectedModule(null)}
          />
        </aside>
      </div>

      {/* Preview Modal */}
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
