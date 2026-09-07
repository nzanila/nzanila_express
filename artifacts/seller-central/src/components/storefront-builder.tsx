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
  Plus,
  GripVertical,
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
  loadStorefrontTemplates,
} from '../lib/storefront-types';
import { setNotice } from './confirm-dialog';
import { useLocale } from '../lib/i18n/locale-context';
import { templateString } from '../lib/template-strings.i18n.generated';

function readLocalMedia(file: File): Promise<string> {
  const maxBytes = file.type.startsWith('video/') ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return Promise.reject(new Error(`File is too large. Maximum size is ${maxBytes / 1024 / 1024} MB.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

const LEGACY_AUTO_MODULE_TITLES = new Set(['back to school savings', 'compare top laptops', 'summer tech sale', 'new arrivals', 'trending in tech', 'slideshow']);
function withoutLegacyAutoModules(config: StorefrontConfig): StorefrontConfig {
  return { ...config, sections: config.sections.map(section => ({ ...section, modules: section.modules.filter(module => !LEGACY_AUTO_MODULE_TITLES.has(String(module.props?.title || '').trim().toLowerCase()) && !(module.type === 'slideshow' && !module.id.startsWith('mod_'))) })) };
}

function videoSource(url: string): { kind: 'file' | 'embed'; url: string } {
  if (url.startsWith('data:video/') || /\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: 'file', url };
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  if (youtube) return { kind: 'embed', url: `https://www.youtube-nocookie.com/embed/${youtube[1]}` };
  return { kind: 'embed', url };
}

const API = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-seller-api.nzanilaexpress.workers.dev';

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
  const { tr, locale } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<StorefrontTemplate[]>([]);
  useEffect(() => { void loadStorefrontTemplates(API).then(setTemplates); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff9900]/10 px-4 py-2 mb-4">
            <Sparkles size={18} className="text-[#ff9900]" />
            <span className="text-sm font-medium text-[#ff9900]">{tr('builder.title')}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{tr('builder.chooseTemplate')}</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Start with a pre-built template and customize it to fit your brand. You can always change everything later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={`group relative text-left rounded-2xl border-2 overflow-hidden transition-all ${
                selectedId === template.id
                  ? 'border-[#ff9900] shadow-lg scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#233548] via-[#31506c] to-[#ff9900]">
                <img
                  src={template.preview}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-4"><span className="text-sm font-bold text-white">{template.name}</span></div>
                {selectedId === template.id && (
                  <div className="absolute top-3 right-3 bg-[#ff9900] text-white rounded-full p-1.5">
                    <Check size={14} />
                  </div>
                )}
              </div>
              <div className="p-4">
                {/* A seller reads the picker BEFORE choosing, so it must be in their
                    language. Falls back to the English source when a template has no
                    translation yet, never to a raw key. */}
                <h3 className="font-semibold text-gray-900 mb-1">
                  {templateString(locale, `tpl.${template.id}.meta.name`) || template.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {templateString(locale, `tpl.${template.id}.meta.description`) || template.description}
                </p>
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
          >{tr('sc.start-blank')}</button>
          <button
            onClick={() => {
              const template = templates.find((t) => t.id === selectedId);
              if (template) onSelect(template);
            }}
            disabled={!selectedId}
            className="rounded-lg bg-[#ff9900] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e68a00] disabled:opacity-50 disabled:cursor-not-allowed"
          >{tr('sc.use-template')}</button>
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
    'hero-slideshow': <ImageIcon size={20} className="text-fuchsia-500" />,
    'slideshow': <ImageIcon size={20} className="text-fuchsia-500" />,
    'shop-now-banner': <ImageIcon size={20} className="text-orange-500" />,
    'product-comparison': <Columns size={20} className="text-blue-600" />,
    'seasonal-sale': <Sparkles size={20} className="text-red-500" />,
    'new-arrivals': <Package size={20} className="text-emerald-500" />,
    'trending-now': <Package size={20} className="text-amber-500" />,
    'image-grid': <ImageIcon size={20} className="text-sky-500" />,
    'video-grid': <Video size={20} className="text-rose-500" />,
    'product-category': <LayoutGrid size={20} className="text-teal-500" />,
    'double-row-products': <Columns size={20} className="text-cyan-500" />,
    'store-sign': <ImageIcon size={20} className="text-orange-500" />,
    'category-cards': <Columns size={20} className="text-blue-600" />,
    'stats': <Globe size={20} className="text-blue-700" />,
    'features': <Sparkles size={20} className="text-purple-600" />,
    'company-capacity': <Building size={20} className="text-slate-600" />,
    'certifications': <ShieldCheck size={20} className="text-green-600" />,
    'company-performance': <Clock size={20} className="text-amber-600" />,
    'hot-zone': <ImageIcon size={20} className="text-[#ff6a00]" />,
    'inquiry-form': <FileText size={20} className="text-[#1a5f4a]" />,
  };
  return iconMap[type] || <FileText size={20} />;
}

function ModuleLibrary({
  searchQuery,
  selectedCategory,
  onDragStart,
  onAdd,
}: {
  searchQuery: string;
  selectedCategory: string;
  onDragStart: (def: ModuleDefinition, e: React.DragEvent) => void;
  onAdd: (type: ModuleType) => void;
}) {
  const { tr } = useLocale();
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
              <button
                type="button"
                onClick={() => onAdd(mod.type)}
                className="rounded-md bg-[#ff9900] px-2 py-1 text-xs font-bold text-white opacity-90 hover:opacity-100"
                title={`Add ${mod.label} to the active section`}
              >
                Add
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">{tr('builder.noModules')}</p>
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
  const { tr } = useLocale();
  if (!module) {
    return (
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">{tr('builder.properties')}</h3>
          <p className="text-xs text-gray-400 mt-1">{tr('builder.selectModule')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings size={48} className="text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-600">{tr('builder.selectPreview')}</p><p className="mt-1 max-w-44 text-xs text-gray-400">{tr('sc.its-text-images-videos-and-links-will-appear')}</p>
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
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    const commonInputClasses = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#ff9900] focus:outline-none focus:ring-1 focus:ring-[#ff9900]';

    if (Array.isArray(value)) {
      const items = value as any[];
      if (items.length > 0 && items.every(item => typeof item === 'string')) {
        return <div key={key} className="space-y-1.5"><label className="text-xs font-semibold text-gray-700">{label}</label><textarea value={items.join('\n')} onChange={event => updateProp(key, event.target.value.split('\n').filter(Boolean))} className={`${commonInputClasses} min-h-28`} placeholder={tr("builder.onePerLine")} /><p className="text-[10px] text-gray-400">{tr('sc.one-item-per-line-changes-appear-immediately')}</p></div>;
      }

      const fieldPresets: Record<string, string[]> = {
        images: ['url', 'alt'], videos: ['url', 'title'], slides: ['title', 'subtitle', 'imageUrl', 'buttonText', 'buttonUrl'],
        products: ['name', 'price', 'imageUrl', 'badge', 'values'], categories: ['name', 'imageUrl', 'link'],
        certifications: ['name', 'issuer', 'certificateNumber', 'imageUrl', 'description'], features: ['title', 'description'], stats: ['value', 'label', 'suffix'],
        regions: ['label', 'href', 'x', 'y', 'w', 'h'],
      };
      const fields = Array.from(new Set(items.flatMap(item => item && typeof item === 'object' ? Object.keys(item) : [])));
      const editorFields = fields.length ? fields : (fieldPresets[key] || ['title', 'description']);
      const updateItem = (index: number, field: string, nextValue: unknown) => updateProp(key, items.map((item, itemIndex) => itemIndex === index ? { ...(item || {}), [field]: nextValue } : item));
      const addItem = () => updateProp(key, [...items, Object.fromEntries(editorFields.map(field => [field, field === 'values' ? [] : '']))]);
      return <div key={key} className="space-y-2"><div className="flex items-center justify-between"><label className="text-xs font-semibold text-gray-700">{label}</label><button type="button" onClick={addItem} className="flex items-center gap-1 rounded bg-[#ff6a00] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#e85f00]"><Plus size={11} />{tr('sc.add-item')}</button></div>{items.length === 0 && <button type="button" onClick={addItem} className="w-full rounded-lg border-2 border-dashed border-gray-200 px-3 py-6 text-xs text-gray-400 hover:border-[#ff9900] hover:text-[#ff6a00]">Add the first {label.toLowerCase()} item</button>}{items.map((item, index) => <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-gray-500">{label} {index + 1}</span><button type="button" onClick={() => updateProp(key, items.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label={`Remove ${label} ${index + 1}`}><Trash2 size={13} /></button></div><div className="space-y-3">{editorFields.map(field => { const fieldValue = item?.[field]; const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'); const mediaField = /image|video/i.test(field) || field === 'url' && (key === 'images' || key === 'videos'); const videoField = /video/i.test(field) || key === 'videos'; if (Array.isArray(fieldValue) || field === 'values') return <div key={field}><label className="text-[10px] font-medium text-gray-600">{fieldLabel}</label><textarea value={(Array.isArray(fieldValue) ? fieldValue : []).join('\n')} onChange={event => updateItem(index, field, event.target.value.split('\n').filter(Boolean))} className={`${commonInputClasses} mt-1 min-h-20`} placeholder={tr("builder.oneValuePerLine")} /></div>; return <div key={field}><label className="text-[10px] font-medium text-gray-600">{fieldLabel}</label><input value={String(fieldValue ?? '')} onChange={event => updateItem(index, field, event.target.value)} className={`${commonInputClasses} mt-1`} placeholder={mediaField ? (videoField ? 'Video URL or upload below' : 'Image URL or upload below') : `Enter ${fieldLabel.toLowerCase()}`} />{mediaField && <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-[#ff9900]/70 bg-orange-50 px-2 py-2 text-[10px] font-bold text-[#c66f00] hover:bg-orange-100"><Upload size={12} /> Upload {videoField ? 'video' : 'image'}<input type="file" accept={videoField ? 'video/mp4,video/webm,video/ogg' : 'image/*'} className="hidden" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { updateItem(index, field, await readLocalMedia(file)); } catch (error) { setNotice({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed', confirmLabel: 'OK', variant: 'alert' }); } event.target.value = ''; }} /></label>}</div>; })}</div></div>)}</div>;
    }

    if (Array.isArray(value) && (key === 'images' || key === 'videos' || key === 'certifications')) {
      const isVideo = key === 'videos';
      const isCertificate = key === 'certifications';
      return (
        <div key={key} className="space-y-2">
          <label className="text-xs font-medium text-gray-700">{label}</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#ff9900]/60 bg-orange-50 px-3 py-3 text-xs font-semibold text-[#c66f00] hover:bg-orange-100">
            <Upload size={15} /> Add {isVideo ? 'videos' : isCertificate ? 'certificate images' : 'images'} from device
            <input type="file" multiple accept={isVideo ? 'video/mp4,video/webm,video/ogg' : 'image/*,.pdf'} className="hidden" onChange={async (event) => {
              const files = Array.from(event.target.files || []);
              try {
                const urls = await Promise.all(files.map(readLocalMedia));
                const entries = urls.map((url, index) => isVideo
                  ? { url, title: files[index].name }
                  : isCertificate
                    ? { name: files[index].name.replace(/\.[^.]+$/, ''), issuer: '', certificateNumber: '', imageUrl: url, description: 'Uploaded certificate evidence' }
                    : { url, alt: files[index].name });
                updateProp(key, [...value, ...entries]);
              } catch (error) { setNotice({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed', confirmLabel: 'OK', variant: 'alert' }); }
              event.target.value = '';
            }} />
          </label>
          <textarea key={JSON.stringify(value)} defaultValue={JSON.stringify(value, null, 2)} onBlur={(event) => {
            try { updateProp(key, JSON.parse(event.target.value)); }
            catch { setNotice({ title: 'That is not valid JSON', description: `${label} must be valid JSON.`, confirmLabel: 'OK', variant: 'alert' }); event.target.value = JSON.stringify(value, null, 2); }
          }} className={`${commonInputClasses} min-h-36 font-mono text-[11px]`} />
        </div>
      );
    }

    if (value !== null && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return <fieldset key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3"><legend className="px-1 text-xs font-semibold text-gray-700">{label}</legend><div className="space-y-3">{Object.entries(objectValue).map(([field, fieldValue]) => { const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' '); const setField = (nextValue: unknown) => updateProp(key, { ...objectValue, [field]: nextValue }); if (typeof fieldValue === 'boolean') return <div key={field} className="flex items-center justify-between"><span className="text-[11px] font-medium text-gray-600">{fieldLabel}</span><button type="button" onClick={() => setField(!fieldValue)} className={`relative inline-flex h-6 w-11 items-center rounded-full ${fieldValue ? 'bg-[#ff6a00]' : 'bg-gray-300'}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${fieldValue ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>; if (Array.isArray(fieldValue)) return <div key={field}><label className="text-[10px] font-medium text-gray-600">{fieldLabel}</label><textarea value={fieldValue.join('\n')} onChange={event => setField(event.target.value.split('\n').filter(Boolean))} className={`${commonInputClasses} mt-1 min-h-20`} placeholder={tr("builder.onePerLine")} /></div>; return <div key={field}><label className="text-[10px] font-medium text-gray-600">{fieldLabel}</label><input type={typeof fieldValue === 'number' ? 'number' : 'text'} value={String(fieldValue ?? '')} onChange={event => setField(typeof fieldValue === 'number' ? Number(event.target.value) : event.target.value)} className={`${commonInputClasses} mt-1`} placeholder={`Enter ${fieldLabel.toLowerCase()}`} /></div>; })}</div></fieldset>;
    }

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
          const isVideo = key.toLowerCase().includes('video');
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateProp(key, e.target.value)}
                  className={commonInputClasses}
                  placeholder={isVideo ? 'YouTube, MP4, WebM, or uploaded video' : 'Image URL or uploaded image'}
                />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#ff9900]/60 bg-orange-50 px-3 py-2 text-xs font-semibold text-[#c66f00] hover:bg-orange-100">
                  <Upload size={15} /> Upload {isVideo ? 'video' : 'image'} from device
                  <input
                    type="file"
                    accept={isVideo ? 'video/mp4,video/webm,video/ogg' : 'image/*'}
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try { updateProp(key, await readLocalMedia(file)); }
                      catch (error) { setNotice({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed', confirmLabel: 'OK', variant: 'alert' }); }
                      event.target.value = '';
                    }}
                  />
                </label>
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

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11px] leading-4 text-blue-700">{tr('sc.changes-appear-immediately-in-the-canvas-pre')}</div>

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
  onReorderModule,
  onUpdateModule,
  onRemoveModule,
  onMoveModule,
  onUpdateShopSign,
  onSetShopSign,
  onUpdateHeader,
  onSave,
  isSaving,
  saveStatus,
  loading,
  onPreview,
}: {
  config: StorefrontConfig;
  selectedSection: string;
  selectedModule: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onDropModule: (type: ModuleType, insertAtIndex?: number) => void;
  onReorderModule: (moduleId: string, targetIndex: number) => void;
  onUpdateModule: (moduleId: string, props: Record<string, unknown>) => void;
  onRemoveModule: (moduleId: string) => void;
  onMoveModule: (moduleId: string, direction: 'up' | 'down') => void;
  onUpdateShopSign: (updates: Partial<{ imageUrl: string; altText: string; hidden: boolean }>) => void;
  onSetShopSign: (updates: Partial<{ imageUrl: string | null; altText: string; hidden: boolean }>) => void;
  onUpdateHeader: (updates: Partial<NonNullable<StorefrontConfig['header']>>) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  loading: boolean;
  onPreview: () => void;
}) {
  const { tr } = useLocale();
  const section = config.sections.find((s) => s.id === selectedSection);
  const draggingModuleId = useRef<string | null>(null);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingModuleId.current) return;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload = JSON.parse(raw) as { kind?: string; type?: ModuleType; moduleId?: string } | ModuleType;
    if (typeof payload === 'object' && payload.kind === 'module' && payload.moduleId) return;
    const type = typeof payload === 'string' ? payload : payload.type;
    if (type) onDropModule(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleModuleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const parsed = JSON.parse(data) as ModuleType | { kind?: string; type?: ModuleType; moduleId?: string };
      if (draggingModuleId.current) {
        onReorderModule(draggingModuleId.current, targetIndex);
        return;
      }
      if (typeof parsed === 'object' && parsed.kind === 'module' && parsed.moduleId) {
        onReorderModule(parsed.moduleId, targetIndex);
        return;
      }
      const type = typeof parsed === 'string' ? parsed : parsed.type;
      if (type) onDropModule(type, targetIndex);
    }
  };

  const handleModuleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('application/json');
    if (draggingModuleId.current) {
      onReorderModule(draggingModuleId.current, targetIndex);
      return;
    }
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as { kind?: string; moduleId?: string };
      if (parsed.kind === 'module' && parsed.moduleId) onReorderModule(parsed.moduleId, targetIndex);
    } catch { /* ignore malformed drag payloads */ }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-slate-50 p-3 sm:grid-cols-[auto_1fr_1fr]">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-[#ff9900]">
            {config.header?.profileImage ? <img src={config.header.profileImage} alt="Company profile" className="h-10 w-10 rounded-lg object-cover" /> : <Building size={24} />}
            Upload profile
            <input type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) try { onUpdateHeader({ profileImage: await readLocalMedia(file) }); } catch (error) { setNotice({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed', confirmLabel: 'OK', variant: 'alert' }); } event.target.value = ''; }} />
          </label>
          <input value={config.header?.companyName || ''} onChange={(event) => onUpdateHeader({ companyName: event.target.value })} placeholder={tr("builder.companyName")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={config.header?.tagline || ''} onChange={(event) => onUpdateHeader({ tagline: event.target.value })} placeholder={tr("builder.companyTagline")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div className="mb-3 flex items-center gap-2 overflow-x-auto border-b border-gray-200 pb-3">
          {config.sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
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
          <label className="text-sm font-medium text-gray-700">{tr('sc.shop-sign')}</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await readLocalMedia(file);
                onSetShopSign({ imageUrl: url, altText: file.name });
              } catch (error) {
                setNotice({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed', confirmLabel: 'OK', variant: 'alert' });
              }
            }}
            className="hidden"
            id="shop-sign-upload"
          />
          <label
            htmlFor="shop-sign-upload"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Upload size={16} />{tr('sc.upload-banner')}</label>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={tr("builder.imageUrl")}
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

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className={`mr-auto text-[11px] font-medium ${saveStatus === 'error' ? 'text-red-600' : saveStatus === 'saved' ? 'text-emerald-600' : 'text-gray-400'}`}>{saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? '✓ All changes saved' : saveStatus === 'error' ? 'Autosave failed — use Save' : 'Autosave on'}</span>
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:py-1.5"
          >
            <Eye size={16} />{tr('sc.preview')}</button>
          <button
            onClick={onSave}
            disabled={isSaving || loading}
            className="flex items-center gap-1.5 rounded-lg bg-[#ff9900] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e68a00] disabled:opacity-50 sm:py-1.5"
          >
            <Save size={16} /> {isSaving ? 'Saving...' : <><span className="sm:hidden">{tr('sc.save')}</span><span className="hidden sm:inline">{tr('builder.save')}</span></>}
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
          <p className="text-center text-sm text-gray-400 mb-4">{tr('sc.drag-modules-here-or-drop-between-sections')}</p>

          {section && section.modules.length === 0 ? (
            <div className="text-center py-8">
              <LayoutGrid size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">{tr('sc.no-modules-yet-drag-from-the-library')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {section?.modules.map((mod, index) => {
                const def = MODULE_DEFINITIONS.find((d) => d.type === mod.type);
                // Mirror the storefront: fluid breaks out of the column, hideBottom closes the gap.
                const layoutFlags = `${mod.props?.fluid ? '-mx-4' : ''} ${mod.props?.hideBottom ? '' : 'mb-3'}`;
                return (
                  <div
                    key={mod.id}
                    data-layout={layoutFlags.trim() || undefined}
                    draggable
                    onDragStart={(e) => { draggingModuleId.current = mod.id; e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'module', moduleId: mod.id })); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('scale-[0.98]', 'opacity-70', 'shadow-lg'); }}
                    onDragEnd={(e) => { draggingModuleId.current = null; e.currentTarget.classList.remove('scale-[0.98]', 'opacity-70', 'shadow-lg'); }}
                    onClick={() => onSelectModule(mod.id)}
                    className={`group relative cursor-grab overflow-hidden rounded-lg border-2 transition-all active:cursor-grabbing ${
                      selectedModule === mod.id
                        ? 'border-[#ff9900] bg-orange-50/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onDrop={(e) => handleModuleDrop(e, index)}
                    onDragOver={(e) => handleModuleDragOver(e, index)}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2"><GripVertical size={15} className="shrink-0 text-gray-400" aria-hidden="true" /><ModuleIcon type={mod.type} /><span className="truncate text-xs font-semibold text-gray-700">{def?.label || mod.type}</span><span className="hidden text-[10px] text-gray-400 xl:inline">— drag to reorder · click preview to edit</span></div>
                      <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        {index > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveModule(mod.id, 'up'); }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title={tr("builder.moveUp")}
                          >
                            <MoveUp size={14} />
                          </button>
                        )}
                        {index < (section?.modules.length ?? 0) - 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMoveModule(mod.id, 'down'); }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title={tr("builder.moveDown")}
                          >
                            <MoveDown size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveModule(mod.id); }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          title={tr("builder.remove")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white"><StorefrontModulePreview mod={mod} storeId={config.storeId} /></div>
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
  const { tr } = useLocale();
  const props = mod.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = (props.slides as unknown as Array<{ title: string; subtitle?: string; imageUrl?: string; buttonText?: string; buttonUrl?: string }>) || [];
  useEffect(() => {
    if (mod.type !== 'hero-slideshow' || slides.length < 2) return;
    const interval = window.setInterval(
      () => setSlideIndex((current) => (current + 1) % slides.length),
      Math.max(2, Number(props.autoplaySeconds) || 5) * 1000,
    );
    return () => window.clearInterval(interval);
  }, [mod.type, slides.length, props.autoplaySeconds]);
  useEffect(() => {
    if (!storeId) return;
    if (!['recommended-products','product-category','double-row-products','new-arrivals','trending-now'].includes(mod.type)) return;
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
        if (!cancelled) {
          console.warn('Products unavailable; showing template placeholders.', e);
          setProductsError(null);
          setLiveProducts([]);
        }
      })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, mod.type, props.limit, (props as any).productCount]);

  switch (mod.type) {
    case 'image-grid': {
      const images = (props.images as unknown as Array<{ url: string; alt?: string }>) || [];
      const columns = Math.min(4, Math.max(1, Number(props.columns) || 3));
      return <div className="bg-white p-4"><h3 className="mb-3 text-lg font-bold">{String(p('title') || 'Gallery')}</h3>{images.length ? <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{images.map((item, index) => <img key={index} src={item.url} alt={item.alt || `Gallery image ${index + 1}`} className="aspect-square h-full w-full rounded-lg object-cover" />)}</div> : <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>)}</div>}</div>;
    }
    case 'video-grid': {
      const videos = (props.videos as unknown as Array<{ url: string; title?: string }>) || [];
      const columns = Math.min(3, Math.max(1, Number(props.columns) || 2));
      return <div className="bg-white p-4"><h3 className="mb-3 text-lg font-bold">{String(p('title') || 'Videos')}</h3>{videos.length ? <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{videos.map((item, index) => { const source = videoSource(item.url); return <div key={index}><div className="aspect-video overflow-hidden rounded-lg bg-black">{source.kind === 'file' ? <video src={source.url} controls playsInline className="h-full w-full object-contain" /> : <iframe src={source.url} title={item.title || `Video ${index + 1}`} allowFullScreen className="h-full w-full" />}</div>{item.title && <p className="mt-1 text-xs font-medium">{item.title}</p>}</div>; })}</div> : <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-video rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"><Video className="text-gray-300" /></div>)}</div>}</div>;
    }
    case 'slideshow':
    case 'hero-slideshow': {
      const slide = slides[slideIndex] || slides[0];
      return (
        <div className="relative h-52 overflow-hidden bg-slate-900 text-white">
          {slide?.imageUrl && <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
          <div className="relative flex h-full max-w-[65%] flex-col justify-center px-7">
            <h3 className="text-2xl font-bold">{slide?.title || 'Campaign headline'}</h3>
            {slide?.subtitle && <p className="mt-2 text-sm text-white/85">{slide.subtitle}</p>}
            {slide?.buttonText && <span className="mt-4 w-fit rounded bg-[#ff9900] px-4 py-2 text-xs font-bold">{slide.buttonText}</span>}
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {slides.map((_, index) => <button key={index} aria-label={`Show slide ${index + 1}`} onClick={() => setSlideIndex(index)} className={`h-2 rounded-full transition-all ${index === slideIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />)}
          </div>
        </div>
      );
    }
    case 'shop-now-banner':
      return <div className="relative min-h-52 overflow-hidden bg-[#febd69] p-8" style={{ backgroundColor: String(p('backgroundColor') || '#febd69'), color: String(p('textColor') || '#131921') }}>{p('imageUrl') && <img src={String(p('imageUrl'))} alt="" className="absolute inset-0 h-full w-full object-cover" />}<div className="relative max-w-md"><h3 className="text-2xl font-bold">{String(p('title') || 'Shop our products')}</h3><p className="mt-2 text-sm">{String(p('subtitle') || '')}</p><span className="mt-4 inline-block rounded bg-[#ff9900] px-4 py-2 text-xs font-bold">{String(p('buttonText') || 'Shop Now')}</span></div></div>;
    case 'seasonal-sale':
      return <div className="p-8 text-center text-white" style={{ backgroundColor: String(p('backgroundColor') || '#cc0c39'), color: String(p('textColor') || '#fff') }}><p className="text-xs font-bold uppercase">{String(p('discount') || '')}</p><h3 className="mt-1 text-2xl font-bold">{String(p('title') || 'Seasonal Sale')}</h3><p className="mt-1 text-sm">{String(p('subtitle') || '')}</p><span className="mt-4 inline-block rounded bg-white px-4 py-2 text-xs font-bold text-gray-900">{String(p('buttonText') || 'Shop Sale')}</span></div>;
    case 'product-comparison': {
      const features = (props.features as unknown as string[]) || [];
      const products = (props.products as unknown as Array<{ name?: string; values?: string[] }>) || [];
      return <div className="overflow-x-auto bg-white p-5"><h3 className="mb-3 text-lg font-bold">{String(p('title') || 'Compare Products')}</h3>{products.length ? <table className="w-full min-w-[500px] border-collapse text-xs"><thead><tr><th className="border bg-gray-50 p-2 text-left">{tr('sc.feature')}</th>{products.map((product, index) => <th key={index} className="border p-2 text-left">{product.name || `Product ${index + 1}`}</th>)}</tr></thead><tbody>{features.map((feature, row) => <tr key={row}><td className="border bg-gray-50 p-2 font-semibold">{feature}</td>{products.map((product, column) => <td key={column} className="border p-2">{product.values?.[row] || '—'}</td>)}</tr>)}</tbody></table> : <div className="rounded border-2 border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">{tr('builder.addFromPanel')}</div>}</div>;
    }
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

    case 'hot-zone': {
      const regions = Array.isArray(p('regions')) ? (p('regions') as unknown as { label?: string; x: number; y: number; w: number; h: number }[]) : [];
      const src = String(p('imageUrl') || '');
      return <div className="bg-white">{String(p('title') || '') && <h3 className="px-4 pt-4 text-lg font-bold">{String(p('title'))}</h3>}<div className="relative w-full">{src ? <img src={src} alt="" className="block h-auto w-full" /> : <div className="grid h-40 place-items-center border-2 border-dashed border-gray-200 text-xs text-gray-400">{tr('builder.addBanner')}</div>}{regions.map((r, i) => <span key={i} title={r.label} style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }} className="absolute rounded-md border-2 border-dashed border-[#ff6a00]/80 bg-[#ff6a00]/10"><span className="absolute left-1 top-1 rounded bg-[#ff6a00] px-1 text-[9px] font-bold text-white">{r.label || `Area ${i + 1}`}</span></span>)}</div></div>;
    }

    case 'inquiry-form':
      return <div className="p-6" style={{ backgroundColor: String(p('backgroundColor') || '#232f3e'), color: String(p('textColor') || '#ffffff') }}><div className="grid gap-4 md:grid-cols-[1fr_1.2fr]"><div><h3 className="text-xl font-bold">{String(p('title') || 'Send us an inquiry')}</h3><p className="mt-1 text-xs opacity-80">{String(p('description') || '')}</p></div><div className="space-y-2"><div className="grid grid-cols-2 gap-2"><div className="h-8 rounded border border-white/20 bg-white/10" /><div className="h-8 rounded border border-white/20 bg-white/10" /></div><div className="h-14 rounded border border-white/20 bg-white/10" /><span className="inline-block rounded bg-[#ff9900] px-4 py-2 text-xs font-bold text-white">{String(p('buttonText') || 'Send inquiry')}</span></div></div></div>;

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
      const source = videoSource(String(p('videoUrl') || ''));
      return (
        <div className="aspect-video rounded-lg bg-black/10 flex items-center justify-center">
          {p('videoUrl') ? (
            source.kind === 'file' ? (
              <video src={source.url} className="h-full w-full rounded-lg bg-black object-contain" controls playsInline />
            ) : (
              <iframe src={source.url} title={String(p('title') || 'Store video')} className="h-full w-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            )
          ) : (
            <div className="text-center text-gray-500">
              <Video size={32} className="mx-auto mb-2" />
              <p className="text-sm">{tr('builder.videoPlaceholder')}</p>
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
            {p('showCertification') && <div className="text-center"><ShieldCheck size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">{tr('store.certified')}</p></div>}
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
    case 'new-arrivals':
    case 'trending-now':
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
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold">{String(p('title') || 'Featured Products')}</h3><span className="text-xs text-[#1677ff]">{tr('sc.view-more')}</span></div>
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
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">{tr('sc.store-sign-section')}</div>
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
                <span className="mt-2 inline-block w-fit border border-white/80 rounded px-2 py-0.5 text-[10px] font-semibold text-white">{tr('store.seeMore')}</span>
              </div>
              <div className="w-[46%] flex items-end justify-end pb-2 pr-2">
                <img src={cat.imageUrl || ''} alt={cat.name} className="h-20 w-auto object-contain drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'stats': {
      // Same rule as company-performance: a stat the seller has not filled in is not
      // rendered, and a module with nothing filled in renders nothing at all. Without
      // this, blanking the template defaults would show a bare " m²" under a label.
      const stats = ((props.stats as unknown as Array<{ value: string; label: string; suffix: string }>) || [])
        .filter(stat => String(stat?.value ?? '').trim());
      if (!stats.length) return null;
      return (
        <div className="relative overflow-hidden">
          {p('backgroundImage') ? <img src={String(p('backgroundImage'))} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
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
    }

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

    case 'company-capacity': {
      // This rendered a hardcoded "15+ years", "80% export" and "50,000 m²" for EVERY
      // seller, ignoring props entirely — invented credentials shown to buyers on any
      // store using the module. Read the seller's own figures, show only what they
      // actually filled in, and render nothing when they have filled in none.
      const trade = (props.tradeInfo ?? {}) as Record<string, unknown>;
      const production = (props.productionInfo ?? {}) as Record<string, unknown>;
      const capability = [
        { label: tr('store.yearsInBusiness'), value: String(trade.yearsInBusiness ?? '') },
        { label: tr('store.exportPercentage'), value: String(trade.exportPercentage ?? '') },
        { label: tr('store.factorySize'), value: String(production.factorySize ?? '') },
        { label: tr('store.mainMarkets'), value: String(trade.mainMarkets ?? '') },
        { label: tr('store.monthlyCapacity'), value: String(production.monthlyCapacity ?? '') },
        { label: tr('store.workers'), value: String(production.workers ?? '') },
      ].filter(entry => entry.value.trim());
      if (!capability.length) return null;
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || tr('store.capability'))}</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(capability.length, 3)}, minmax(0, 1fr))` }}>
            {capability.map(entry => (
              <div key={entry.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{entry.label}</p>
                <p className="text-lg font-bold text-gray-900">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'certifications':
      const certs = (props.certifications as unknown as Array<{ name: string; issuer?: string; certificateNumber?: string; imageUrl?: string; description: string }>) || [];
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Certifications')}</h3>
          <div className="flex flex-wrap gap-3">
            {certs.map((cert, i) => (
              <div key={i} className="flex min-w-56 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {cert.imageUrl && cert.imageUrl.startsWith('data:application/pdf') ? <div className="flex h-14 w-14 items-center justify-center rounded bg-red-50 text-xs font-bold text-red-600">PDF</div> : cert.imageUrl ? <img src={cert.imageUrl} alt={cert.name} className="h-14 w-14 rounded object-cover" /> : <ShieldCheck size={28} className="text-green-500" />}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{cert.name}</p>
                  {cert.issuer && <p className="text-xs font-medium text-gray-600">Issued by {cert.issuer}</p>}
                  {cert.certificateNumber && <p className="text-[10px] text-gray-500">No. {cert.certificateNumber}</p>}
                  <p className="text-xs text-gray-500">{cert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'company-performance': {
      // No invented numbers. The old fallbacks ("< 24 hours", "98.5%", "AAA") were
      // rendered for any seller who left these blank, so a brand-new store published
      // delivery statistics it had never earned. An unconfigured module shows nothing.
      const performance = [
        { label: 'Response Time', value: String(p('responseTime') || ''), tile: 'bg-green-50', tone: 'text-green-600' },
        { label: 'On-time Delivery', value: String(p('onTimeDelivery') || ''), tile: 'bg-blue-50', tone: 'text-blue-600' },
        { label: 'Transaction Level', value: String(p('transactionLevel') || ''), tile: 'bg-orange-50', tone: 'text-orange-600' },
      ].filter(metric => metric.value);
      if (!performance.length) return null;
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Company Performance')}</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${performance.length}, minmax(0, 1fr))` }}>
            {performance.map(metric => (
              <div key={metric.label} className={`text-center p-3 rounded-lg ${metric.tile}`}>
                <p className="text-xs text-gray-500">{metric.label}</p>
                <p className={`text-lg font-bold ${metric.tone}`}>{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">{String(p('title') || mod.type)}</p>
        </div>
      );
  }
}

function StorefrontPreview({ config }: { config: StorefrontConfig }) {
  const { tr } = useLocale();
  const [activeTab, setActiveTab] = useState('home');
  const activeSection = config.sections.find((s) => s.id === activeTab);
  return (
    <div className="w-full max-w-6xl mx-auto bg-[#f5f7fa] border border-gray-200">
      {/* Supplier identity header */}
      <div className="bg-gradient-to-r from-[#e6f0ff] via-white to-[#cfe3ff] px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {config.header?.profileImage ? <img src={config.header.profileImage} alt={config.header.companyName} className="h-14 w-14 rounded-xl border-2 border-white object-cover shadow" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#17233c] text-lg font-black text-white shadow">{(config.header?.companyName || 'YC').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{config.header?.companyName || 'Your Company'}</p>
            <p className="mt-0.5 text-[11px] text-gray-600">{config.header?.tagline || 'Wholesale supplier and trusted business partner'}</p>
            <div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">✓ {config.header?.verificationLabel || 'Verified Supplier'}</span><span className="rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-gray-600">{config.header?.yearsActive || 'New supplier'}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">{tr('store.contactSupplier')}</span>
          <span className="hidden sm:inline-flex border border-gray-300 bg-white text-xs px-2 py-1 rounded">★ Collect</span>
        </div>
      </div>
      {/* Alibaba Nav - blue bar */}
      <div className="bg-[#1677ff] text-white flex items-center gap-0 px-2 overflow-x-auto">
        {config.sections.map((section) => (
          <button key={section.id} onClick={() => setActiveTab(section.id)} className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${activeTab === section.id ? 'bg-white text-[#1677ff] border-white' : 'border-transparent hover:bg-white/10'}`}>{section.name}</button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-1 bg-white rounded-full px-2 py-1 my-1"><span className="text-[10px] text-gray-500">{tr('sc.search-in-store')}</span></div>
      </div>
      {/* Shop Sign / Banner */}
      {config.shopSign?.imageUrl && !config.shopSign.hidden && (
        <div className="relative h-36 bg-gray-100 overflow-hidden"><img src={config.shopSign.imageUrl} alt={config.shopSign.altText || 'Store Banner'} className="w-full h-full object-cover" /></div>
      )}
      {/* Content */}
      <div className="min-h-[400px] bg-[#f5f7fa]">
        {activeSection && activeSection.modules.length === 0 ? (
          <div className="text-center py-12 bg-white m-4 rounded"><Package size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">{tr('sc.no-modules-in-this-section')}</p></div>
        ) : (
          <div className="space-y-0">{activeSection?.modules.map((mod) => (<StorefrontModulePreview key={mod.id} mod={mod} storeId={config.storeId} />))}</div>
        )}
      </div>
    </div>
  );
}

const STORE_BASE = (import.meta as any).env?.VITE_STORE_URL || 'https://nzanila.pages.dev';

export function StorefrontBuilder({ storeId, onBack }: StorefrontBuilderProps) {
  const { tr } = useLocale();
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);
  const [selectedSection, setSelectedSection] = useState('home');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  // On a phone the canvas comes first: both panels start closed and open as bottom sheets.
  const [showLibrary, setShowLibrary] = useState(() => window.innerWidth >= 1024);
  const [showProperties, setShowProperties] = useState(() => window.innerWidth >= 1024);
  const dragItem = useRef<{ type: ModuleType } | null>(null);
  const autoSaveReady = useRef(false);
  const lastSavedConfig = useRef('');

  useEffect(() => {
    const persist = async (cfg: StorefrontConfig) => {
      try {
        const token = localStorage.getItem('sc_token');
        await fetch(`${API}/api/storefront/${storeId}`, {
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

        const res = await fetch(`${API}/api/storefront/${storeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.sections) && data.sections.length > 0) {
            const hasModules = data.sections.some((s: any) => s.modules?.length > 0);
            if (hasModules) {
              setConfig(withoutLegacyAutoModules({ ...DEFAULT_STOREFRONT_CONFIG, ...data, storeId } as StorefrontConfig));
              setHasExistingConfig(true);
            } else {
              setConfig(withoutLegacyAutoModules({ ...DEFAULT_STOREFRONT_CONFIG, ...data, storeId } as StorefrontConfig));
              setHasExistingConfig(false);
              setShowTemplateSelector(true);
            }
            if (hasModules) setShowTemplateSelector(false);
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
              const tpl = matchedTemplate;
            if (tpl) {
              const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
              setConfig(cfg);
              setHasExistingConfig(false);
              setShowTemplateSelector(true);
            }
            if (!tpl) setShowTemplateSelector(true);
          }
        } else {
          const storeRes = await fetch(`${API}/api/stores/${storeId}`);
          let storeTemplate = '';
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            if (storeData.store?.storeTemplate) storeTemplate = storeData.store.storeTemplate;
          }
          const tpl = STOREFRONT_TEMPLATES.find(t=>t.id===storeTemplate);
          if (tpl) {
            const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
            setConfig(cfg);
            setHasExistingConfig(false);
          }
          setShowTemplateSelector(true);
        }
      } catch (err) {
        console.error('Load error:', err);
        const storeRes = await fetch(`${API}/api/stores/${storeId}`);
        let storeTemplate = '';
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData.store?.storeTemplate) storeTemplate = storeData.store.storeTemplate;
        }
        const tpl = STOREFRONT_TEMPLATES.find(t=>t.id===storeTemplate);
        if (tpl) {
          const cfg = { ...DEFAULT_STOREFRONT_CONFIG, ...tpl.config, storeId, updatedAt: new Date().toISOString() } as StorefrontConfig;
          setConfig(cfg);
          setHasExistingConfig(false);
        }
        setShowTemplateSelector(true);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [storeId]);

  useEffect(() => {
    if (loading || showTemplateSelector) return;
    const serialized = JSON.stringify({ ...config, storeId });
    if (!autoSaveReady.current) {
      autoSaveReady.current = true;
      lastSavedConfig.current = serialized;
      return;
    }
    if (serialized === lastSavedConfig.current) return;
    setSaveStatus('idle');
    const timer = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const token = localStorage.getItem('sc_token');
        const response = await fetch(`${API}/api/storefront/${storeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: serialized });
        if (!response.ok) throw new Error(`Autosave returned ${response.status}`);
        lastSavedConfig.current = serialized;
        setSaveStatus('saved');
      } catch (error) {
        console.error('Autosave error:', error);
        setSaveStatus('error');
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [config, loading, showTemplateSelector, storeId]);

  const handleSelectTemplate = (template: StorefrontTemplate) => {
    const cfg = withoutLegacyAutoModules({
      ...DEFAULT_STOREFRONT_CONFIG,
      ...template.config,
      storeId: storeId,
      updatedAt: new Date().toISOString(),
    } as StorefrontConfig);
    setConfig(cfg);
    setShowTemplateSelector(false);
    setHasExistingConfig(true);
    const token = localStorage.getItem('sc_token');
    fetch(`${API}/api/storefront/${storeId}`, {
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

  const handleReorderModule = useCallback(
    (moduleId: string, targetIndex: number) => {
      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== selectedSection) return section;
          const fromIndex = section.modules.findIndex((module) => module.id === moduleId);
          if (fromIndex < 0 || fromIndex === targetIndex || fromIndex + 1 === targetIndex) return section;
          const modules = [...section.modules];
          const [moved] = modules.splice(fromIndex, 1);
          const insertionIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
          modules.splice(Math.max(0, Math.min(insertionIndex, modules.length)), 0, moved);
          return { ...section, modules };
        }),
      }));
    },
    [selectedSection],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${API}/api/storefront/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ ...config, storeId: storeId }),
      });
      if (!res.ok) throw new Error('Failed to save');
      lastSavedConfig.current = JSON.stringify({ ...config, storeId });
      setSaveStatus('saved');
      setNotice({ title: 'Storefront saved', description: 'Your changes are live.', confirmLabel: 'OK', variant: 'alert', tone: 'primary' });
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setNotice({ title: 'Could not save the storefront', description: 'Please check your connection and try again.', confirmLabel: 'OK', variant: 'alert' });
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
          <p className="text-sm text-gray-500">{tr('sc.loading-storefront')}</p>
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
              <ArrowLeft size={16} />{tr('sc.back-to-stores')}</button>
          )}
          <h1 className="text-lg font-bold text-gray-900">{tr('builder.title')}</h1>
        </div>
        <TemplateSelector onSelect={handleSelectTemplate} onSkip={handleSkipTemplate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">{tr('builder.backToStores')}</span><span className="sm:hidden">{tr('sc.back')}</span>
          </button>
        )}
        <h1 className="text-base font-bold text-gray-900 sm:text-lg">{tr('builder.title')}</h1>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button onClick={() => { setShowLibrary((visible) => !visible); if (window.innerWidth < 1024) setShowProperties(false); }} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-sm">{showLibrary ? 'Hide' : 'Add'} <span className="hidden sm:inline">{tr('builder.library')}</span><span className="sm:hidden">blocks</span></button>
          <button onClick={() => { setShowProperties((visible) => !visible); if (window.innerWidth < 1024) setShowLibrary(false); }} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-sm">{showProperties ? 'Hide' : 'Edit'} <span className="hidden sm:inline">{tr('builder.properties')}</span></button>
          {storeSlug && (
            <a
              href={`${STORE_BASE}/store/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 sm:flex"
            >
              <Globe size={16} />{tr('sc.view-store')}</a>
          )}
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-sm"
          >
            <LayoutGrid size={16} /> <span className="hidden sm:inline">{tr('builder.changeTemplate')}</span><span className="sm:hidden">{tr('builder.theme')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Dim the canvas behind an open sheet on phones */}
        {(showLibrary || showProperties) && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => { setShowLibrary(false); setShowProperties(false); }}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar - Module Library (bottom sheet on phones) */}
        {showLibrary && <aside className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-64 lg:shrink-0 lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300 lg:hidden" aria-hidden="true" />
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">{tr('builder.moduleLibrary')}</h2>
              <button type="button" onClick={() => setShowLibrary(false)} aria-label={tr("builder.closeLibrary")} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"><X size={18} /></button>
            </div>
            <p className="mb-3 text-[11px] text-gray-500 lg:hidden">{tr('sc.tap-a-block-to-add-it-to-your-page')}</p>

            <input
              type="text"
              placeholder={tr("builder.searchModules")}
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
            onAdd={(type) => {
              handleDropModule(type);
              // Close the sheet on a phone so the block that was just added is visible.
              if (window.innerWidth < 1024) setShowLibrary(false);
            }}
          />
        </aside>}

        {/* Center - Canvas Area */}
        <CanvasArea
          config={config}
          selectedSection={selectedSection}
          selectedModule={selectedModule}
          onSelectSection={setSelectedSection}
          onSelectModule={(moduleId) => {
            setSelectedModule(moduleId);
            // On a phone the properties sheet is closed by default, so selecting a
            // block has to surface its settings or the tap looks like it did nothing.
            if (moduleId && window.innerWidth < 1024) { setShowProperties(true); setShowLibrary(false); }
          }}
          onDropModule={handleDropModule}
          onReorderModule={handleReorderModule}
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
          onUpdateHeader={(updates) => setConfig((prev) => ({ ...prev, header: { ...(prev.header || DEFAULT_STOREFRONT_CONFIG.header!), ...updates } }))}
          onSave={handleSave}
          isSaving={isSaving}
          saveStatus={saveStatus}
          loading={loading}
          onPreview={() => setShowPreview(true)}
        />

        {/* Right Sidebar - Properties Panel (bottom sheet on phones) */}
        {showProperties && <aside className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-72 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300 lg:hidden" aria-hidden="true" />
          <PropertiesPanel
            module={selectedModuleData}
            onUpdate={(props) =>
              selectedModuleData && handleUpdateModule(selectedModuleData.id, props)
            }
            onClose={() => { setSelectedModule(null); if (window.innerWidth < 1024) setShowProperties(false); }}
          />
        </aside>}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-xl sm:h-[80vh] sm:w-[90vw]">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{tr('builder.preview')}</h3>
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
