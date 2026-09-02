import type { ComponentType } from 'react';

export type ModuleType =
  | 'page-background'
  | 'recommended-products'
  | 'image-text'
  | 'video'
  | 'marketing'
  | 'company'
  | 'hero'
  | 'product-category'
  | 'double-row-products'
  | 'store-sign';

export interface StorefrontModule {
  id: string;
  type: ModuleType;
  props: Record<string, unknown>;
  position: number;
}

export interface StorefrontSection {
  id: string;
  name: string;
  slug: string;
  modules: StorefrontModule[];
}

export interface StorefrontConfig {
  storeId: number;
  sections: StorefrontSection[];
  shopSign: {
    imageUrl: string | null;
    altText: string;
    hidden: boolean;
  } | null;
  template: string;
  updatedAt: string;
}

export interface ModuleDefinition {
  type: ModuleType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  defaultProps: Record<string, unknown>;
  category: 'core' | 'content' | 'media' | 'products' | 'company';
}

export const MODULE_CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'core', label: 'Core' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'products', label: 'Products' },
  { id: 'company', label: 'Company' },
] as const;

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    type: 'page-background',
    label: 'Page Background',
    description: 'Set background color or image for the entire page',
    icon: () => null,
    defaultProps: {
      backgroundColor: '#ffffff',
      backgroundImage: '',
      backgroundType: 'color',
    },
    category: 'core',
  },
  {
    type: 'recommended-products',
    label: 'Recommended Products',
    description: 'Show curated product recommendations',
    icon: () => null,
    defaultProps: {
      title: 'Recommended Products',
      productSource: 'recommended',
      productIds: [],
      limit: 8,
      columns: 4,
    },
    category: 'products',
  },
  {
    type: 'image-text',
    label: 'Image & Text',
    description: 'Add a banner with image and text overlay',
    icon: () => null,
    defaultProps: {
      title: 'Special Offer',
      subtitle: 'Limited time deals',
      imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e489f6b63a7?auto=format&fit=crop&w=1200&q=80',
      linkUrl: '',
      textPosition: 'center',
      height: 200,
    },
    category: 'content',
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed a promotional video',
    icon: () => null,
    defaultProps: {
      title: '',
      videoUrl: '',
      videoType: 'youtube',
      aspectRatio: '16:9',
      autoplay: false,
    },
    category: 'media',
  },
  {
    type: 'marketing',
    label: 'Marketing',
    description: 'Promotional banners and call-to-action sections',
    icon: () => null,
    defaultProps: {
      title: 'Special Offer',
      description: 'Don\'t miss out on our limited time offer',
      buttonText: 'Shop Now',
      buttonUrl: '#',
      backgroundColor: '#fff3f0',
      textColor: '#ff5a36',
      imageUrl: '',
    },
    category: 'content',
  },
  {
    type: 'company',
    label: 'Company',
    description: 'Display company information and credentials',
    icon: () => null,
    defaultProps: {
      title: 'Our Company',
      description: '',
      showCertification: true,
      showYearsActive: true,
      showEmployees: true,
      layout: 'cards',
    },
    category: 'company',
  },
  {
    type: 'hero',
    label: 'Hero Banner',
    description: 'Large promotional banner at the top of the page',
    icon: () => null,
    defaultProps: {
      title: 'Welcome to Our Store',
      subtitle: 'Premium products for your business',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Shop Now',
      buttonUrl: '/products',
      height: 320,
    },
    category: 'content',
  },
  {
    type: 'product-category',
    label: 'Product Category',
    description: 'Display products grouped by category',
    icon: () => null,
    defaultProps: {
      title: 'Shop by Category',
      categoryId: null,
      categoryName: '',
      layout: 'grid',
      productCount: 4,
    },
    category: 'products',
  },
  {
    type: 'double-row-products',
    label: 'Double-row Products',
    description: 'Show two rows of products side by side',
    icon: () => null,
    defaultProps: {
      title: 'Featured Products',
      productSource: 'featured',
      productIds: [],
      limit: 10,
      rows: 2,
      columns: 5,
    },
    category: 'products',
  },
  {
    type: 'store-sign',
    label: 'Store Sign',
    description: 'Set the store banner (shop sign)',
    icon: () => null,
    defaultProps: {
      imageUrl: '',
      altText: 'Store Banner',
      hidden: false,
    },
    category: 'core',
  },
];

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  storeId: 0,
  template: 'showcase',
  shopSign: {
    imageUrl: null,
    altText: 'Store Banner',
    hidden: false,
  },
  sections: [
    {
      id: 'home',
      name: 'Home',
      slug: 'home',
      modules: [],
    },
    {
      id: 'products',
      name: 'Products',
      slug: 'products',
      modules: [],
    },
    {
      id: 'company-profile',
      name: 'Company Profile',
      slug: 'company-profile',
      modules: [],
    },
    {
      id: 'contacts',
      name: 'Contacts',
      slug: 'contacts',
      modules: [],
    },
  ],
  updatedAt: new Date().toISOString(),
};
