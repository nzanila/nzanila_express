import { useState } from 'react';
import { Check, Store, Building, Zap, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  previewImage: string;
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'alibaba-us-warehouse',
    name: 'Alibaba US Warehouse',
    description: 'Professional template inspired by Alibaba US warehouse stores with blue accents and comprehensive product display',
    category: 'Professional',
    previewImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&h=300&q=80',
    features: ['Blue accent theme', 'Hero banner', 'Category cards', 'Statistics section', 'Company profile', 'Warehouse info'],
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean and minimalist design with focus on products',
    category: 'Minimal',
    previewImage: 'https://images.unsplash.com/photo-1556761175-5947e5c2c568?auto=format&fit=crop&w=400&h=300&q=80',
    features: ['Clean design', 'Product-focused', 'Minimal distractions', 'Fast loading', 'Mobile optimized'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Bold industrial design for manufacturing and B2B suppliers',
    category: 'Industrial',
    previewImage: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&h=300&q=80',
    features: ['Bold typography', 'Manufacturing focus', 'B2B optimized', 'Capacity showcase', 'Certifications'],
  },
];

interface StoreTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export function StoreTemplateSelector({ selectedTemplate, onTemplateSelect }: StoreTemplateSelectorProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Choose Your Store Template</h3>
        <p className="text-sm text-gray-600">Select a professional template to get started. You can customize it later.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            onClick={() => onTemplateSelect(template.id)}
            onMouseEnter={() => setHoveredTemplate(template.id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
              selectedTemplate === template.id
                ? 'border-[#ff9900] ring-2 ring-[#ff9900]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Preview Image */}
            <div className="aspect-video relative overflow-hidden">
              <img
                src={template.previewImage}
                alt={template.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-semibold text-gray-700">
                {template.category}
              </div>
              {selectedTemplate === template.id && (
                <div className="absolute top-2 left-2 bg-[#ff9900] text-white p-1.5 rounded-full">
                  <Check size={14} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h4 className="font-bold text-gray-900 mb-1">{template.name}</h4>
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{template.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 3).map((feature, index) => (
                  <span
                    key={index}
                    className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                  >
                    {feature}
                  </span>
                ))}
                {template.features.length > 3 && (
                  <span className="text-[10px] text-gray-500">+{template.features.length - 3}</span>
                )}
              </div>

              {/* Hover overlay */}
              {hoveredTemplate === template.id && selectedTemplate !== template.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold text-gray-900">
                    Use Template <ChevronRight size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Template Info */}
      {selectedTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Store size={20} className="text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Selected: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This template will be applied to your store. You can customize all sections after creation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}