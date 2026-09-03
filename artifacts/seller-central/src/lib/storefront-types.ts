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
  | 'company-performance';

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
  {
    type: 'category-cards',
    label: 'Category Cards',
    description: 'Side-by-side category cards with images and links',
    icon: () => null,
    defaultProps: {
      title: 'Product Categories',
      categories: [
        { name: 'Category 1', imageUrl: '', link: '#' },
        { name: 'Category 2', imageUrl: '', link: '#' },
      ],
      backgroundColor: '#1a56db',
      textColor: '#ffffff',
    },
    category: 'products',
  },
  {
    type: 'stats',
    label: 'Company Stats',
    description: 'Key metrics and statistics display',
    icon: () => null,
    defaultProps: {
      title: '',
      stats: [
        { value: '50000', label: 'm² Factory Area', suffix: 'm²' },
        { value: '50000', label: 'pcs Monthly Capacity', suffix: 'pcs' },
        { value: '3000', label: 'Workers', suffix: '' },
        { value: '90+', label: 'Countries Served', suffix: '+' },
      ],
      backgroundColor: '#1a56db',
      textColor: '#ffffff',
    },
    category: 'company',
  },
  {
    type: 'features',
    label: 'Features Grid',
    description: 'Icon grid showing company features and advantages',
    icon: () => null,
    defaultProps: {
      title: 'Why Choose Us',
      features: [
        { icon: 'professional', title: 'Professional', description: 'Expert team with years of experience' },
        { icon: 'production', title: 'Production', description: 'Advanced manufacturing facilities' },
        { icon: 'oem', title: 'OEM/ODM', description: 'Custom solutions available' },
        { icon: 'price', title: 'Competitive Price', description: 'Best value for quality products' },
      ],
    },
    category: 'company',
  },
  {
    type: 'company-capacity',
    label: 'Company Capacity',
    description: 'Manufacturing capabilities, trade info, and R&D',
    icon: () => null,
    defaultProps: {
      title: 'Manufacturer Capability',
      tradeInfo: {
        yearsInBusiness: '10+',
        mainMarkets: 'North America, Europe, Asia',
        exportPercentage: '80%',
        nearestPort: 'Xiamen Port',
      },
      rdInfo: {
        rdEngineers: '15',
        rdStaff: '30',
        oemServices: true,
        odmServices: true,
      },
      productionInfo: {
        factorySize: '50,000 m²',
        workers: '500+',
        monthlyCapacity: '100,000 pcs',
        productionLines: '10',
      },
    },
    category: 'company',
  },
  {
    type: 'certifications',
    label: 'Certifications',
    description: 'Display quality certifications and badges',
    icon: () => null,
    defaultProps: {
      title: 'Certifications',
      certifications: [
        { name: 'ISO 9001', imageUrl: '', description: 'Quality Management System' },
        { name: 'CE', imageUrl: '', description: 'European Conformity' },
        { name: 'FCC', imageUrl: '', description: 'Federal Communications Commission' },
        { name: 'RoHS', imageUrl: '', description: 'Restriction of Hazardous Substances' },
      ],
    },
    category: 'company',
  },
  {
    type: 'company-performance',
    label: 'Company Performance',
    description: 'Performance metrics and charts',
    icon: () => null,
    defaultProps: {
      title: 'Company Performance',
      metrics: [
        { label: 'Response Time', value: '< 24 hours', rating: 4.8 },
        { label: 'On-time Delivery', value: '98.5%', rating: 4.9 },
        { label: 'Transaction Level', value: 'AAA', rating: 5.0 },
      ],
      responseTime: '2 hours',
      onTimeDelivery: '98.5%',
      transactionLevel: 'AAA',
    },
    category: 'company',
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

export interface StorefrontTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
  config: Omit<StorefrontConfig, 'storeId' | 'updatedAt'>;
}

export const STOREFRONT_TEMPLATES: StorefrontTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty storefront',
    preview: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80',
    category: 'starter',
    config: {
      template: 'blank',
      shopSign: null,
      sections: [
        { id: 'home', name: 'Home', slug: 'home', modules: [] },
        { id: 'products', name: 'Products', slug: 'products', modules: [] },
        { id: 'company-profile', name: 'Company Profile', slug: 'company-profile', modules: [] },
        { id: 'contacts', name: 'Contacts', slug: 'contacts', modules: [] },
      ],
    },
  },
  {
    id: 'general-showcase',
    name: 'General Showcase',
    description: 'Professional storefront with hero banner, products, and company info',
    preview: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80',
    category: 'general',
    config: {
      template: 'general-showcase',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        altText: 'My Store',
        hidden: false,
      },
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
                title: 'Welcome to Our Store',
                subtitle: 'Quality products for your business',
                imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
                buttonText: 'Shop Now',
                buttonUrl: '/products',
                height: 320,
              },
              position: 1,
            },
            {
              id: 'marketing-1',
              type: 'marketing',
              props: {
                title: 'Special Offer',
                description: 'Get 20% off on your first order',
                buttonText: 'Shop Now',
                buttonUrl: '#',
                backgroundColor: '#fff3f0',
                textColor: '#ff5a36',
                imageUrl: '',
              },
              position: 2,
            },
            {
              id: 'products-1',
              type: 'recommended-products',
              props: {
                title: 'Featured Products',
                productSource: 'recommended',
                productIds: [],
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
              id: 'category-1',
              type: 'product-category',
              props: {
                title: 'Shop by Category',
                categoryId: null,
                categoryName: '',
                layout: 'grid',
                productCount: 4,
              },
              position: 1,
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
                description: 'We are a leading supplier of quality products. With years of experience, we serve businesses across the region.',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards',
              },
              position: 1,
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
  },
  {
    id: 'product-focus',
    name: 'Product Focus',
    description: 'Highlight your products with large images and detailed categories',
    preview: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=400&q=80',
    category: 'products',
    config: {
      template: 'product-focus',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=1200&q=80',
        altText: 'Product Store',
        hidden: false,
      },
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
                title: 'Discover Our Products',
                subtitle: 'Browse our extensive catalog',
                imageUrl: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&w=1200&q=80',
                buttonText: 'View Products',
                buttonUrl: '/products',
                height: 350,
              },
              position: 1,
            },
            {
              id: 'products-1',
              type: 'double-row-products',
              props: {
                title: 'Top Picks',
                productSource: 'featured',
                productIds: [],
                limit: 10,
                rows: 2,
                columns: 5,
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
              id: 'category-1',
              type: 'product-category',
              props: {
                title: 'All Categories',
                categoryId: null,
                categoryName: '',
                layout: 'grid',
                productCount: 8,
              },
              position: 1,
            },
            {
              id: 'products-2',
              type: 'recommended-products',
              props: {
                title: 'New Arrivals',
                productSource: 'newest',
                productIds: [],
                limit: 8,
                columns: 4,
              },
              position: 2,
            },
          ],
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
    },
  },
  {
    id: 'brand-story',
    name: 'Brand Story',
    description: 'Tell your brand story with videos, images, and company info',
    preview: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=400&q=80',
    category: 'brand',
    config: {
      template: 'brand-story',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
        altText: 'Our Brand',
        hidden: false,
      },
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
                title: 'Our Story',
                subtitle: 'Building trust through quality',
                imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
                buttonText: 'Learn More',
                buttonUrl: '#about',
                height: 350,
              },
              position: 1,
            },
            {
              id: 'video-1',
              type: 'video',
              props: {
                title: 'Watch Our Story',
                videoUrl: '',
                videoType: 'youtube',
                aspectRatio: '16:9',
                autoplay: false,
              },
              position: 2,
            },
            {
              id: 'image-text-1',
              type: 'image-text',
              props: {
                title: 'Quality First',
                subtitle: 'We never compromise on quality',
                imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e489f6b63a7?auto=format&fit=crop&w=1200&q=80',
                linkUrl: '',
                textPosition: 'center',
                height: 200,
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
              id: 'products-1',
              type: 'recommended-products',
              props: {
                title: 'Our Products',
                productSource: 'recommended',
                productIds: [],
                limit: 8,
                columns: 4,
              },
              position: 1,
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
                description: 'Founded with a mission to provide quality products, we have grown to serve thousands of customers across the region.',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards',
              },
              position: 1,
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
  },
  {
    id: 'food-grocery',
    name: 'Kigali Fresh - Full Storefront',
    description: 'Complete agriculture storefront: hero + categories + featured + videos + supplier info',
    preview: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
    category: 'industry',
    config: {
      template: 'food-grocery',
      shopSign: null,
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
                title: 'Kigali Fresh Traders',
                subtitle: 'Premium agricultural products and fresh produce from Burundi. We specialize in high-quality rice, beans, cassava flour, and fresh vegetables. Serving buyers across East Africa since 2018.',
                imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
                buttonText: 'View More',
                buttonUrl: '#',
                height: 200,
                brand: 'Meet Kigali Fresh Traders',
              },
              position: 1,
            },
            {
              id: 'product-category-1',
              type: 'product-category',
              props: {
                title: 'Product Category',
                categoryId: null,
                categoryName: '',
                layout: 'grid',
                productCount: 2,
              },
              position: 2,
            },
            {
              id: 'stats-1',
              type: 'stats',
              props: {
                title: '',
                stats: [
                  { value: '2,000', label: 'Factory Blueprint', suffix: ' m²' },
                  { value: '5,000', label: 'Monthly Capacity', suffix: ' kg' },
                  { value: '10-50', label: 'Workers, Staff', suffix: '' },
                  { value: '50+', label: 'Countries Customer', suffix: '' },
                ],
                backgroundColor: '#0f4fd8',
                textColor: '#ffffff',
              },
              position: 3,
            },
            {
              id: 'features-1',
              type: 'features',
              props: {
                title: '',
                features: [
                  { icon: 'professional', title: 'Professional', description: 'Supplying quality products with our professional team and strong service.' },
                  { icon: 'production', title: 'Production', description: 'Meticulous production team with advanced technology in production and management.' },
                  { icon: 'oem', title: 'OEM&OEM', description: 'More than 10 years experiences in OEM & ODM orders, we will enjoy the fastest service.' },
                  { icon: 'price', title: 'Competitive Price', description: 'Born to help customers, we will use our best to help quality products at low but high-quality prices and most favorable working.' },
                ],
              },
              position: 4,
            },
            {
              id: 'products-1',
              type: 'recommended-products',
              props: {
                title: 'Featured Products',
                productSource: 'featured',
                productIds: [],
                limit: 9,
                columns: 3,
              },
              position: 5,
            },
            {
              id: 'marketing-1',
              type: 'marketing',
              props: {
                title: 'Looking for something specific?',
                description: 'Request a catalog for detailed product specs, pricing, and more',
                buttonText: 'Request catalog',
                buttonUrl: '#',
                backgroundColor: '#0f4fd8',
                textColor: '#ffffff',
                imageUrl: '',
              },
              position: 6,
            },
            {
              id: 'video-1',
              type: 'video',
              props: {
                title: 'Product Video',
                videoUrl: '',
                videoType: 'youtube',
                aspectRatio: '16:9',
                autoplay: false,
              },
              position: 7,
            },
            {
              id: 'company-1',
              type: 'company',
              props: {
                title: 'About the supplier - Kigali Fresh Traders',
                description: 'Premium agricultural products and fresh produce from Burundi. We specialize in high-quality rice, beans, cassava flour, and fresh vegetables. Our team combines dependable supply, strict quality control, and responsive service to help wholesale buyers grow with confidence.',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards',
              },
              position: 8,
            },
          ],
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-2',
              type: 'recommended-products',
              props: {
                title: 'All Products',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 3,
              },
              position: 1,
            },
          ],
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-performance-1',
              type: 'company-performance',
              props: {
                title: 'Company Performance',
                metrics: [],
                responseTime: '≤10h',
                onTimeDelivery: '98%',
                transactionLevel: '95%',
              },
              position: 1,
            },
            {
              id: 'company-capacity-1',
              type: 'company-capacity',
              props: {
                title: 'Kigali Fresh Traders',
                tradeInfo: { yearsInBusiness: '2018', mainMarkets: 'East Africa', exportPercentage: '95%', nearestPort: 'N/A' },
                rdInfo: { rdEngineers: '0', rdStaff: '0', oemServices: false, odmServices: false },
                productionInfo: { factorySize: '2,000 m²', workers: '10-50', monthlyCapacity: '5,000 kg', productionLines: '3' },
              },
              position: 2,
            },
            {
              id: 'certifications-1',
              type: 'certifications',
              props: {
                title: 'Certificate Display',
                certifications: [{ name: 'Certificate', description: '' }],
              },
              position: 3,
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
  },
  {
    id: 'electronics',
    name: 'BAOFENG - Alibaba Clone',
    description: '1:1 clone of fjbaofeng.m.en.alibaba.com — hero + 2 blue cards + category grid + stats',
    preview: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
    category: 'industry',
    config: {
      template: 'electronics',
      shopSign: null,
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
                title: 'The Art of Technology',
                subtitle: '20mm Ultra-Slim  |  Off-Grid Communication  |  Smart UHF',
                imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
                buttonText: '',
                buttonUrl: '',
                height: 280,
                brand: 'BAOFENG',
              },
              position: 1,
            },
            {
              id: 'category-cards-1',
              type: 'category-cards',
              props: {
                title: '',
                categories: [
                  { name: 'Business Radio', sublabel: 'K68', imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=400&q=80', link: '#' },
                  { name: 'DMR Radio', sublabel: 'DM-32', imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=400&q=80', link: '#' },
                ],
                backgroundColor: '#1677ff',
                textColor: '#ffffff',
              },
              position: 2,
            },
            {
              id: 'product-category-1',
              type: 'product-category',
              props: {
                title: 'Product Category',
                categoryId: null,
                categoryName: '',
                layout: 'grid',
                productCount: 6,
              },
              position: 3,
            },
            {
              id: 'stats-1',
              type: 'stats',
              props: {
                title: '',
                stats: [
                  { value: '60000', label: 'Factory Floor Area', suffix: 'm²' },
                  { value: '50000', label: 'Radios Per day', suffix: 'pcs' },
                  { value: '3000', label: 'Workers Staff', suffix: '' },
                  { value: '90+', label: 'Country Customer', suffix: '' },
                ],
                backgroundColor: '#0f4fd8',
                textColor: '#ffffff',
              },
              position: 4,
            },
            {
              id: 'features-1',
              type: 'features',
              props: {
                title: '',
                features: [
                  { icon: 'professional', title: 'Professional', description: 'More than 20 years experience in radio' },
                  { icon: 'production', title: 'Production', description: 'Strict QC with advanced production lines' },
                  { icon: 'oem', title: 'OEM&ODM', description: 'Support custom logo / packaging / frequency' },
                  { icon: 'price', title: 'Competitive Price', description: 'Factory direct, best cost performance' },
                ],
              },
              position: 5,
            },
          ],
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-1',
              type: 'recommended-products',
              props: {
                title: 'All Products',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4,
              },
              position: 1,
            },
          ],
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-performance-1',
              type: 'company-performance',
              props: {
                title: 'Company Performance',
                metrics: [
                  { label: 'Response Time', value: '< 24 hours', rating: 4.8 },
                  { label: 'On-time Delivery', value: '98.5%', rating: 4.9 },
                  { label: 'Transaction Level', value: 'AAA', rating: 5.0 },
                ],
                responseTime: '2 hours',
                onTimeDelivery: '98.5%',
                transactionLevel: 'AAA',
              },
              position: 1,
            },
            {
              id: 'company-capacity-1',
              type: 'company-capacity',
              props: {
                title: 'Manufacturer Capability',
                tradeInfo: {
                  yearsInBusiness: '15+',
                  mainMarkets: 'North America, Europe, Asia, South America',
                  exportPercentage: '80%',
                  nearestPort: 'Xiamen Port',
                },
                rdInfo: {
                  rdEngineers: '20',
                  rdStaff: '50',
                  oemServices: true,
                  odmServices: true,
                },
                productionInfo: {
                  factorySize: '50,000 m²',
                  workers: '500+',
                  monthlyCapacity: '100,000 pcs',
                  productionLines: '15',
                },
              },
              position: 2,
            },
            {
              id: 'certifications-1',
              type: 'certifications',
              props: {
                title: 'Certifications',
                certifications: [
                  { name: 'ISO 9001', imageUrl: '', description: 'Quality Management System' },
                  { name: 'CE', imageUrl: '', description: 'European Conformity' },
                  { name: 'FCC', imageUrl: '', description: 'Federal Communications Commission' },
                  { name: 'RoHS', imageUrl: '', description: 'Restriction of Hazardous Substances' },
                ],
              },
              position: 3,
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
  },
];
