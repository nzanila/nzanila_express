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
  | 'store-sign'
  | 'category-cards'
  | 'stats'
  | 'features'
  | 'company-capacity'
  | 'certifications'
  | 'company-performance'
  | 'warehouse-info'
  | 'shipping-info'
  | 'trust-badges'
  | 'promo-banner'
  | 'hot-products'
  | 'new-arrivals';

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
  category: 'core' | 'content' | 'media' | 'products' | 'company' | 'warehouse' | 'marketing';
}

export const MODULE_CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'core', label: 'Core' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'products', label: 'Products' },
  { id: 'company', label: 'Company' },
  { id: 'warehouse', label: 'Warehouse & Shipping' },
  { id: 'marketing', label: 'Marketing' },
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
  {
    type: 'category-cards',
    label: 'Category Cards',
    description: 'Display product categories as colorful cards with images',
    icon: () => null,
    defaultProps: {
      title: 'Product Categories',
      backgroundColor: '#1677ff',
      textColor: '#ffffff',
      categories: [
        { name: 'Electronics', sublabel: 'Hot', imageUrl: 'https://via.placeholder.com/120x100', link: '/electronics' },
        { name: 'Clothing', sublabel: 'New', imageUrl: 'https://via.placeholder.com/120x100', link: '/clothing' },
      ],
    },
    category: 'products',
  },
  {
    type: 'stats',
    label: 'Statistics',
    description: 'Display business statistics with background image',
    icon: () => null,
    defaultProps: {
      title: 'Our Achievements',
      backgroundColor: '#0f4fd8',
      textColor: '#ffffff',
      stats: [
        { value: '15+', label: 'Years Experience', suffix: '' },
        { value: '50K', label: 'Products', suffix: '+' },
        { value: '98%', label: 'Satisfaction', suffix: '' },
        { value: '120', label: 'Countries', suffix: '+' },
      ],
    },
    category: 'company',
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Highlight key business features and capabilities',
    icon: () => null,
    defaultProps: {
      title: 'Why Choose Us',
      features: [
        { icon: 'shield', title: 'Quality Assurance', description: 'Strict quality control' },
        { icon: 'truck', title: 'Fast Shipping', description: 'Quick delivery worldwide' },
        { icon: 'headphones', title: '24/7 Support', description: 'Always here to help' },
        { icon: 'award', title: 'Certified', description: 'Industry certified' },
      ],
    },
    category: 'company',
  },
  {
    type: 'company-capacity',
    label: 'Company Capacity',
    description: 'Display manufacturing and business capacity information',
    icon: () => null,
    defaultProps: {
      title: 'Company Capacity',
      yearsInBusiness: '15+',
      exportPercentage: '80%',
      factorySize: '50,000 m²',
      annualRevenue: '$10M+',
    },
    category: 'company',
  },
  {
    type: 'certifications',
    label: 'Certifications',
    description: 'Display business certifications and compliance badges',
    icon: () => null,
    defaultProps: {
      title: 'Our Certifications',
      certifications: [
        { name: 'ISO 9001', description: 'Quality Management' },
        { name: 'CE', description: 'European Conformity' },
        { name: 'FDA', description: 'Food & Drug Administration' },
      ],
    },
    category: 'company',
  },
  {
    type: 'company-performance',
    label: 'Company Performance',
    description: 'Display key performance metrics',
    icon: () => null,
    defaultProps: {
      title: 'Company Performance',
      responseTime: '< 24 hours',
      onTimeDelivery: '98.5%',
      transactionLevel: 'AAA',
      supplierType: 'Manufacturer',
    },
    category: 'company',
  },
  {
    type: 'warehouse-info',
    label: 'Warehouse Information',
    description: 'Display warehouse locations and capabilities',
    icon: () => null,
    defaultProps: {
      title: 'Our Warehouses',
      warehouseCount: '5',
      locations: ['USA', 'Europe', 'Asia'],
      totalArea: '100,000 sq ft',
      capacity: '50,000+ SKUs',
    },
    category: 'warehouse',
  },
  {
    type: 'shipping-info',
    label: 'Shipping Information',
    description: 'Display shipping options and delivery times',
    icon: () => null,
    defaultProps: {
      title: 'Shipping Options',
      shippingMethods: [
        { name: 'Express', time: '3-5 days', price: '$25+' },
        { name: 'Standard', time: '7-14 days', price: '$15+' },
        { name: 'Economy', time: '15-30 days', price: '$10+' },
      ],
      freeShippingThreshold: '$500',
    },
    category: 'warehouse',
  },
  {
    type: 'trust-badges',
    label: 'Trust Badges',
    description: 'Display trust badges and security indicators',
    icon: () => null,
    defaultProps: {
      title: 'Trusted By',
      badges: [
        { name: 'Secure Payment', icon: 'lock' },
        { name: 'Verified Supplier', icon: 'check-circle' },
        { name: 'Money Back Guarantee', icon: 'shield' },
        { name: '24/7 Support', icon: 'headphones' },
      ],
    },
    category: 'marketing',
  },
  {
    type: 'promo-banner',
    label: 'Promo Banner',
    description: 'Eye-catching promotional banner with countdown',
    icon: () => null,
    defaultProps: {
      title: 'Flash Sale',
      subtitle: 'Up to 50% off selected items',
      buttonText: 'Shop Now',
      buttonUrl: '/sale',
      backgroundColor: '#ff5a36',
      textColor: '#ffffff',
      endDate: '',
    },
    category: 'marketing',
  },
  {
    type: 'hot-products',
    label: 'Hot Products',
    description: 'Display best-selling and trending products',
    icon: () => null,
    defaultProps: {
      title: 'Hot Products',
      productSource: 'hot',
      limit: 8,
      layout: 'grid',
    },
    category: 'products',
  },
  {
    type: 'new-arrivals',
    label: 'New Arrivals',
    description: 'Display recently added products',
    icon: () => null,
    defaultProps: {
      title: 'New Arrivals',
      productSource: 'new',
      limit: 8,
      layout: 'grid',
    },
    category: 'products',
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

export const TEMPLATE_DEFINITIONS = [
  {
    id: 'alibaba-us-warehouse',
    name: 'Alibaba US Warehouse',
    description: 'Professional template inspired by Alibaba US warehouse stores with blue accents and comprehensive product display',
    previewImage: 'https://via.placeholder.com/400x300/1677ff/ffffff?text=Alibaba+US+Warehouse',
    category: 'professional',
    sections: [
      {
        id: 'home',
        name: 'Home',
        slug: 'home',
        modules: [
          {
            id: 'hero-1',
            type: 'hero',
            props: {
              title: 'Premium Quality Products',
              subtitle: 'Direct from US Warehouse - Fast Shipping',
              imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
              buttonText: 'Shop Now',
              buttonUrl: '/products',
              brand: 'Your Brand',
            },
            position: 0,
          },
          {
            id: 'category-cards-1',
            type: 'category-cards',
            props: {
              title: 'Shop by Category',
              backgroundColor: '#1677ff',
              textColor: '#ffffff',
              categories: [
                { name: 'Electronics', sublabel: 'Hot', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=120&h=100&q=80', link: '/electronics' },
                { name: 'Clothing', sublabel: 'New', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=120&h=100&q=80', link: '/clothing' },
                { name: 'Home & Garden', sublabel: 'Sale', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=120&h=100&q=80', link: '/home-garden' },
                { name: 'Sports', sublabel: 'Trending', imageUrl: 'https://images.unsplash.com/photo-1461896836934- voices-120&h=100&q=80', link: '/sports' },
              ],
            },
            position: 1,
          },
          {
            id: 'stats-1',
            type: 'stats',
            props: {
              title: 'Our Achievements',
              backgroundColor: '#0f4fd8',
              textColor: '#ffffff',
              stats: [
                { value: '15+', label: 'Years Experience', suffix: '' },
                { value: '50K', label: 'Products', suffix: '+' },
                { value: '98%', label: 'Satisfaction', suffix: '' },
                { value: '120', label: 'Countries', suffix: '+' },
              ],
            },
            position: 2,
          },
          {
            id: 'recommended-products-1',
            type: 'recommended-products',
            props: {
              title: 'Recommended Products',
              productSource: 'recommended',
              limit: 8,
              columns: 4,
            },
            position: 3,
          },
        ],
      },
      {
        id: 'products',
        name: 'Products',
        slug: 'products',
        modules: [
          {
            id: 'product-category-1',
            type: 'product-category',
            props: {
              title: 'All Products',
              productCount: 12,
            },
            position: 0,
          },
        ],
      },
      {
        id: 'company-profile',
        name: 'Company Profile',
        slug: 'company-profile',
        modules: [
          {
            id: 'company-1',
            type: 'company',
            props: {
              title: 'About Our Company',
              description: 'We are a leading supplier with 15+ years of experience in providing quality products to businesses worldwide.',
              showCertification: true,
              showYearsActive: true,
              showEmployees: true,
            },
            position: 0,
          },
          {
            id: 'company-capacity-1',
            type: 'company-capacity',
            props: {
              title: 'Company Capacity',
              yearsInBusiness: '15+',
              exportPercentage: '80%',
              factorySize: '50,000 m²',
              annualRevenue: '$10M+',
            },
            position: 1,
          },
          {
            id: 'certifications-1',
            type: 'certifications',
            props: {
              title: 'Our Certifications',
              certifications: [
                { name: 'ISO 9001', description: 'Quality Management' },
                { name: 'CE', description: 'European Conformity' },
                { name: 'FDA', description: 'Food & Drug Administration' },
              ],
            },
            position: 2,
          },
          {
            id: 'company-performance-1',
            type: 'company-performance',
            props: {
              title: 'Company Performance',
              responseTime: '< 24 hours',
              onTimeDelivery: '98.5%',
              transactionLevel: 'AAA',
              supplierType: 'Manufacturer',
            },
            position: 3,
          },
        ],
      },
      {
        id: 'contacts',
        name: 'Contacts',
        slug: 'contacts',
        modules: [
          {
            id: 'features-1',
            type: 'features',
            props: {
              title: 'Why Choose Us',
              features: [
                { icon: 'shield', title: 'Quality Assurance', description: 'Strict quality control' },
                { icon: 'truck', title: 'Fast Shipping', description: 'Quick delivery worldwide' },
                { icon: 'headphones', title: '24/7 Support', description: 'Always here to help' },
                { icon: 'award', title: 'Certified', description: 'Industry certified' },
              ],
            },
            position: 0,
          },
          {
            id: 'warehouse-info-1',
            type: 'warehouse-info',
            props: {
              title: 'Our Warehouses',
              warehouseCount: '5',
              locations: ['USA', 'Europe', 'Asia'],
              totalArea: '100,000 sq ft',
              capacity: '50,000+ SKUs',
            },
            position: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean and minimalist design with focus on products',
    previewImage: 'https://via.placeholder.com/400x300/333333/ffffff?text=Modern+Minimal',
    category: 'minimal',
    sections: [
      {
        id: 'home',
        name: 'Home',
        slug: 'home',
        modules: [
          {
            id: 'hero-1',
            type: 'hero',
            props: {
              title: 'Simple. Quality.',
              subtitle: 'Essential products for your business',
              imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80',
              buttonText: 'Explore',
              buttonUrl: '/products',
            },
            position: 0,
          },
          {
            id: 'recommended-products-1',
            type: 'recommended-products',
            props: {
              title: 'Featured Products',
              productSource: 'featured',
              limit: 6,
              columns: 3,
            },
            position: 1,
          },
        ],
      },
      {
        id: 'products',
        name: 'Products',
        slug: 'products',
        modules: [
          {
            id: 'product-category-1',
            type: 'product-category',
            props: {
              title: 'Our Products',
              productCount: 9,
            },
            position: 0,
          },
        ],
      },
      {
        id: 'company-profile',
        name: 'Company Profile',
        slug: 'company-profile',
        modules: [
          {
            id: 'company-1',
            type: 'company',
            props: {
              title: 'About Us',
              description: 'We believe in simplicity and quality.',
              showCertification: false,
              showYearsActive: true,
              showEmployees: false,
            },
            position: 0,
          },
        ],
      },
      {
        id: 'contacts',
        name: 'Contacts',
        slug: 'contacts',
        modules: [],
      },
    ],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Bold industrial design for manufacturing and B2B suppliers',
    previewImage: 'https://via.placeholder.com/400x300/2c3e50/ffffff?text=Industrial',
    category: 'industrial',
    sections: [
      {
        id: 'home',
        name: 'Home',
        slug: 'home',
        modules: [
          {
            id: 'hero-1',
            type: 'hero',
            props: {
              title: 'Industrial Strength Solutions',
              subtitle: 'Manufacturing excellence since 2005',
              imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80',
              buttonText: 'Get Quote',
              buttonUrl: '/contact',
              brand: 'Industrial Corp',
            },
            position: 0,
          },
          {
            id: 'stats-1',
            type: 'stats',
            props: {
              title: 'Manufacturing Excellence',
              backgroundColor: '#2c3e50',
              textColor: '#ffffff',
              stats: [
                { value: '20+', label: 'Years', suffix: '' },
                { value: '100K', label: 'Units/Month', suffix: '' },
                { value: '99%', label: 'Quality', suffix: '' },
                { value: '50+', label: 'Countries', suffix: '' },
              ],
            },
            position: 1,
          },
          {
            id: 'company-capacity-1',
            type: 'company-capacity',
            props: {
              title: 'Production Capacity',
              yearsInBusiness: '20+',
              exportPercentage: '95%',
              factorySize: '200,000 m²',
              annualRevenue: '$50M+',
            },
            position: 2,
          },
        ],
      },
      {
        id: 'products',
        name: 'Products',
        slug: 'products',
        modules: [
          {
            id: 'product-category-1',
            type: 'product-category',
            props: {
              title: 'Industrial Products',
              productCount: 8,
            },
            position: 0,
          },
        ],
      },
      {
        id: 'company-profile',
        name: 'Company Profile',
        slug: 'company-profile',
        modules: [
          {
            id: 'certifications-1',
            type: 'certifications',
            props: {
              title: 'Certifications & Compliance',
              certifications: [
                { name: 'ISO 9001:2015', description: 'Quality Management' },
                { name: 'ISO 14001', description: 'Environmental Management' },
                { name: 'OHSAS 18001', description: 'Health & Safety' },
                { name: 'CE Marking', description: 'European Compliance' },
              ],
            },
            position: 0,
          },
        ],
      },
      {
        id: 'contacts',
        name: 'Contacts',
        slug: 'contacts',
        modules: [
          {
            id: 'warehouse-info-1',
            type: 'warehouse-info',
            props: {
              title: 'Global Distribution',
              warehouseCount: '10',
              locations: ['USA', 'Germany', 'China', 'Brazil', 'India'],
              totalArea: '500,000 sq ft',
              capacity: '200,000+ SKUs',
            },
            position: 0,
          },
        ],
      },
    ],
  },
];
