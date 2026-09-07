import type { ComponentType } from 'react';

export type ModuleType =
  | 'page-background'
  | 'recommended-products'
  | 'image-text'
  | 'video'
  | 'marketing'
  | 'company'
  | 'hero'
  | 'hero-slideshow'
  | 'slideshow'
  | 'image-grid'
  | 'video-grid'
  | 'product-category'
  | 'double-row-products'
  | 'store-sign'
  | 'category-cards'
  | 'stats'
  | 'features'
  | 'company-capacity'
  | 'certifications'
  | 'company-performance'
  | 'shop-now-banner'
  | 'product-comparison'
  | 'seasonal-sale'
  | 'new-arrivals'
  | 'trending-now'
  | 'hot-zone'
  | 'inquiry-form';

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
  header?: {
    companyName: string;
    tagline: string;
    profileImage: string | null;
    verificationLabel: string;
    yearsActive: string;
  };
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
    type: 'hero-slideshow',
    label: 'Hero Slideshow',
    description: 'Rotating campaign banners with calls to action',
    icon: () => null,
    defaultProps: {
      autoplaySeconds: 5,
      slides: [
        { title: 'New arrivals', subtitle: 'Discover products built for your business', imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80', buttonText: 'Shop now', buttonUrl: '/products' },
        { title: 'Wholesale value', subtitle: 'Competitive pricing and dependable supply', imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', buttonText: 'View catalog', buttonUrl: '/products' },
      ],
    },
    category: 'content',
  },
  {
    type: 'slideshow', label: 'Slideshow', description: 'Rotating image banners with text and action buttons', icon: () => null,
    defaultProps: { autoplay: true, interval: 5000, slides: [] }, category: 'content',
  },
  {
    type: 'shop-now-banner', label: 'Shop Now Banner', description: 'Promotional banner with an image and shop button', icon: () => null,
    defaultProps: { title: 'Shop our products', subtitle: '', imageUrl: '', buttonText: 'Shop Now', buttonUrl: '/products', backgroundColor: '#febd69', textColor: '#131921', height: 280 }, category: 'content',
  },
  {
    type: 'product-comparison', label: 'Product Comparison', description: 'Compare selected products and their features', icon: () => null,
    defaultProps: { title: 'Compare Products', features: ['Feature 1'], products: [] }, category: 'products',
  },
  {
    type: 'seasonal-sale', label: 'Seasonal Sale', description: 'Optional sale campaign banner', icon: () => null,
    defaultProps: { title: 'Seasonal Sale', subtitle: '', discount: '', buttonText: 'Shop Sale', buttonUrl: '/products', backgroundColor: '#cc0c39', textColor: '#ffffff' }, category: 'content',
  },
  {
    type: 'new-arrivals', label: 'New Arrivals', description: 'Show the newest real products in this store', icon: () => null,
    defaultProps: { title: 'New Arrivals', limit: 8 }, category: 'products',
  },
  {
    type: 'trending-now', label: 'Store Picks', description: 'Show real products selected from the store catalog', icon: () => null,
    defaultProps: { title: 'Store Picks', limit: 4 }, category: 'products',
  },
  {
    type: 'image-grid',
    label: 'Image Grid',
    description: 'A responsive gallery of uploaded or linked images',
    icon: () => null,
    defaultProps: {
      title: 'Gallery',
      columns: 3,
      images: [],
    },
    category: 'media',
  },
  {
    type: 'video-grid',
    label: 'Video Grid',
    description: 'Show multiple uploaded videos or YouTube links',
    icon: () => null,
    defaultProps: {
      title: 'Videos',
      columns: 2,
      videos: [],
    },
    category: 'media',
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
      altText: '{{companyName}}',
      hidden: false,
      // Draw the sign over the page background instead of on its own band.
      transparent: false,
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
      // Editable placeholders, not claims. These shipped as a 50,000 m2 factory with
      // 3,000 workers serving 90+ countries — published verbatim by any seller who
      // dragged the module in and never opened it.
      stats: [
        { value: '', label: 'Metric 1', suffix: '' },
        { value: '', label: 'Metric 2', suffix: '' },
        { value: '', label: 'Metric 3', suffix: '' },
        { value: '', label: 'Metric 4', suffix: '' },
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
      // Blank rather than wrong — see the stats module above.
      tradeInfo: {
        yearsInBusiness: '',
        mainMarkets: '',
        exportPercentage: '',
        nearestPort: '',
      },
      rdInfo: {
        rdEngineers: '',
        rdStaff: '',
        oemServices: false,
        odmServices: false,
      },
      productionInfo: {
        factorySize: '',
        workers: '',
        monthlyCapacity: '',
        productionLines: '',
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
      // Starts empty: a certification is a claim about a document the seller holds, and
      // ISO 9001 / CE / FCC / RoHS were being asserted on behalf of sellers who had none.
      // The renderer hides the module until the seller adds one.
      certifications: [],
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
      // Empty until the seller fills it in; the renderer hides the module meanwhile.
      metrics: [],
      responseTime: '',
      onTimeDelivery: '',
      transactionLevel: '',
    },
    category: 'company',
  },
  {
    // Alibaba's "hot zone": one designed image with clickable regions. Regions are stored
    // as percentages of the image, so the same artwork works at every width — this is the
    // module that lets a seller ship their own layout without a component for it.
    type: 'hot-zone',
    label: 'Designed Banner (Hot Zone)',
    description: 'Your own artwork with clickable areas that link to products or pages',
    icon: () => null,
    defaultProps: {
      title: '',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
      alt: 'Featured categories',
      regions: [
        { label: 'Shop now', href: '/products', x: 5, y: 60, w: 28, h: 30 },
      ],
    },
    category: 'content',
  },
  {
    // Every Alibaba storefront ends with an inline inquiry form. This is the lead-capture
    // module the builder was missing.
    type: 'inquiry-form',
    label: 'Inquiry Form',
    description: 'Let buyers send you a message or quote request without leaving the page',
    icon: () => null,
    defaultProps: {
      title: 'Send us an inquiry',
      description: 'Tell us what you need — quantities, specifications, delivery area — and we will reply with a quote.',
      buttonText: 'Send inquiry',
      backgroundColor: '#232f3e',
      textColor: '#ffffff',
    },
    category: 'company',
  },
];

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  storeId: 0,
  template: 'showcase',
  shopSign: {
    imageUrl: null,
    altText: '{{companyName}}',
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
  header: {
    // Null, not placeholder text: the public store page reads
    // `savedHeader.companyName || store.name`, so a literal 'Your Company' here won
    // over the seller's real name and every default storefront was headed "Your Company".
    companyName: null,
    tagline: null,
    profileImage: null,
    verificationLabel: 'Verified Supplier',
    yearsActive: 'New supplier',
  },
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
    id: 'default-ready',
    name: 'Default Ready Store',
    description: 'Image-free starter built from your own store details — name, description, category, contacts and location. Add photos whenever you are ready.',
    preview: 'data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 400 225%22%3E%3Crect width%3D%22400%22 height%3D%22225%22 fill%3D%22%23f5f7fa%22%2F%3E%3Crect width%3D%22400%22 height%3D%2286%22 fill%3D%22%23233548%22%2F%3E%3Crect x%3D%2224%22 y%3D%2224%22 width%3D%22150%22 height%3D%2214%22 rx%3D%227%22 fill%3D%22%23ff6a00%22%2F%3E%3Crect x%3D%2224%22 y%3D%2248%22 width%3D%22240%22 height%3D%228%22 rx%3D%224%22 fill%3D%22%23ffffff%22 opacity%3D%22.5%22%2F%3E%3Crect x%3D%2224%22 y%3D%22110%22 width%3D%22108%22 height%3D%2270%22 rx%3D%228%22 fill%3D%22%23ffffff%22 stroke%3D%22%23dde3ea%22%2F%3E%3Crect x%3D%22146%22 y%3D%22110%22 width%3D%22108%22 height%3D%2270%22 rx%3D%228%22 fill%3D%22%23ffffff%22 stroke%3D%22%23dde3ea%22%2F%3E%3Crect x%3D%22268%22 y%3D%22110%22 width%3D%22108%22 height%3D%2270%22 rx%3D%228%22 fill%3D%22%23ffffff%22 stroke%3D%22%23dde3ea%22%2F%3E%3C%2Fsvg%3E',
    category: 'starter',
    config: {
      template: 'default-ready',
      // No shop sign, no hero photo, no gallery: a brand-new seller has no photography,
      // and stock imagery makes every default store look like somebody else's business.
      // The design carries itself on type, colour and the seller's own words. The one
      // picture it will ever show is the store/office photo the seller uploaded.
      shopSign: null,
      sections: [
        { id: 'home', name: 'Home', slug: 'home', modules: [
          { id: 'default-welcome', type: 'marketing', position: 1, props: {
            title: '{{companyName}}',
            description: '{{description}}',
            buttonText: 'Browse products',
            buttonUrl: '/products',
            backgroundColor: '#233548',
            textColor: '#ffffff',
          } },
          { id: 'default-features', type: 'features', position: 2, props: {
            title: 'Why buy from {{companyName}}',
            backgroundColor: '#ffffff',
            textColor: '#233548',
            features: [
              { title: '{{category}}', description: 'Our main line of business.', icon: 'package' },
              { title: 'Based in {{location}}', description: 'Collect locally or arrange delivery.', icon: 'map-pin' },
              { title: 'Direct contact', description: 'Reach us on {{phone}}.', icon: 'phone' },
            ],
          } },
          { id: 'default-products', type: 'recommended-products', position: 3, props: {
            title: 'From our catalog', productSource: 'all', productIds: [], limit: 8, columns: 4,
          } },
          { id: 'default-stats', type: 'stats', position: 4, props: {
            title: 'How we work',
            backgroundColor: '#1a5f4a',
            textColor: '#ffffff',
            backgroundImage: '',
            stats: [
              { value: 'Wholesale', label: 'Order sizes', suffix: '' },
              { value: 'Local', label: 'Buyer support', suffix: '' },
              { value: 'Direct', label: 'From the supplier', suffix: '' },
              { value: 'BIF', label: 'Priced in', suffix: '' },
            ],
          } },
          { id: 'default-inquiry', type: 'inquiry-form', position: 5, props: {
            title: 'Send {{companyName}} an inquiry',
            description: 'Tell us the product, the quantity and where it needs to go.',
            buttonText: 'Send inquiry',
            backgroundColor: '#233548',
            textColor: '#ffffff',
          } },
        ] },
        { id: 'products', name: 'Products', slug: 'products', modules: [
          { id: 'products-catalog', type: 'recommended-products', position: 1, props: {
            title: 'Product catalog', productSource: 'all', productIds: [], limit: 12, columns: 4,
          } },
        ] },
        { id: 'company-profile', name: 'Company Profile', slug: 'company-profile', modules: [
          { id: 'company-about', type: 'company', position: 1, props: {
            title: 'About {{companyName}}',
            description: '{{description}}',
            showCertification: true, showYearsActive: true, showEmployees: true, layout: 'cards',
          } },
          { id: 'company-capability', type: 'stats', position: 2, props: {
            title: 'At a glance',
            backgroundColor: '#f5f7fa',
            textColor: '#233548',
            backgroundImage: '',
            stats: [
              { value: '{{category}}', label: 'Business category', suffix: '' },
              { value: '{{location}}', label: 'Based in', suffix: '' },
              { value: '{{yearsActive}}', label: 'Trading', suffix: '' },
            ],
          } },
        ] },
        { id: 'contacts', name: 'Contacts', slug: 'contacts', modules: [
          { id: 'default-contact', type: 'company', position: 1, props: {
            title: 'Contact {{companyName}}',
            description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
            showCertification: false, showYearsActive: false, showEmployees: false, layout: 'cards',
          } },
          { id: 'contact-inquiry', type: 'inquiry-form', position: 2, props: {
            title: 'Message us',
            description: 'We reply to inquiries from buyers across Burundi.',
            buttonText: 'Send inquiry',
            backgroundColor: '#1a5f4a',
            textColor: '#ffffff',
          } },
        ] },
      ],
    },
  },
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
        altText: '{{companyName}}',
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
        altText: '{{companyName}}',
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
        altText: '{{companyName}}',
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
    name: 'Fresh Produce & Agriculture',
    description: 'Agriculture storefront: rotating hero, product categories, featured rows, video and supplier profile — written from your own store details.',
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
              id: 'hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  { title: '{{companyName}}', subtitle: '{{description}}', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', buttonText: 'View products', buttonUrl: '/products' },
                  { title: 'Supplying {{location}}', subtitle: 'Wholesale {{category}} with dependable supply and direct contact.', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', buttonText: 'Contact supplier', buttonUrl: '/contacts' },
                ],
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
                title: 'How we work',
                // Facts about this seller, not invented factory figures. The previous
                // defaults advertised a 2,000 m2 site and 50+ export countries to every
                // trader who picked this design.
                stats: [
                  { value: '{{category}}', label: 'Main line', suffix: '' },
                  { value: '{{location}}', label: 'Based in', suffix: '' },
                  { value: 'Wholesale', label: 'Order sizes', suffix: '' },
                  { value: 'BIF', label: 'Priced in', suffix: '' },
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
                title: 'Why buy from {{companyName}}',
                features: [
                  { icon: 'package', title: 'Fresh stock', description: 'Produce moved quickly from harvest to buyer.' },
                  { icon: 'professional', title: 'Checked before it ships', description: 'Every order is sorted and inspected before collection.' },
                  { icon: 'phone', title: 'Direct contact', description: 'Reach us on {{phone}} — no middleman.' },
                  { icon: 'map-pin', title: 'Collect or deliver', description: 'Pick up in {{location}} or arrange delivery.' },
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
                description: 'Tell us the crop, the quantity and when you need it, and we will quote you.',
                buttonText: 'Send an inquiry',
                buttonUrl: '/contacts',
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
                title: 'About {{companyName}}',
                description: '{{description}}',
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
              id: 'company-capacity-1',
              type: 'company-capacity',
              props: {
                title: '{{companyName}}',
                // Blank rather than wrong: the seller fills these in from the builder.
                // They used to ship as "2018 / East Africa / 95% export".
                tradeInfo: { yearsInBusiness: '', mainMarkets: '{{location}}', exportPercentage: '', nearestPort: '' },
                rdInfo: { rdEngineers: '', rdStaff: '', oemServices: false, odmServices: false },
                productionInfo: { factorySize: '', workers: '', monthlyCapacity: '', productionLines: '' },
              },
              position: 1,
            },
            {
              id: 'company-about-1',
              type: 'company',
              props: {
                title: 'Our business',
                description: '{{description}}',
                showCertification: false,
                showYearsActive: true,
                showEmployees: false,
                layout: 'cards',
              },
              position: 2,
            },
          ],
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards',
              },
              position: 1,
            },
            {
              id: 'contacts-inquiry-1',
              type: 'inquiry-form',
              props: {
                title: 'Send {{companyName}} an inquiry',
                description: 'Tell us the product, the quantity and where it needs to go.',
                buttonText: 'Send inquiry',
                backgroundColor: '#0f4fd8',
                textColor: '#ffffff',
              },
              position: 2,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'electronics',
    name: 'Electronics & Devices',
    description: 'Electronics storefront: product hero, category cards, a category grid and supplier credentials — written from your own store details.',
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
                title: '{{companyName}}',
                subtitle: '{{description}}',
                imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
                buttonText: 'Shop products',
                buttonUrl: '/products',
                height: 280,
                brand: '{{companyName}}',
              },
              position: 1,
            },
            {
              id: 'category-cards-1',
              type: 'category-cards',
              props: {
                title: 'Shop by category',
                // Two editable slots. These used to name a specific radio manufacturer's
                // product lines (K68, DM-32), which no seller here sells.
                categories: [
                  { name: 'Category 1', sublabel: '', imageUrl: '', link: '#' },
                  { name: 'Category 2', sublabel: '', imageUrl: '', link: '#' },
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
                title: 'How we work',
                stats: [
                  { value: '{{category}}', label: 'Main line', suffix: '' },
                  { value: '{{location}}', label: 'Based in', suffix: '' },
                  { value: 'Wholesale', label: 'Order sizes', suffix: '' },
                  { value: 'BIF', label: 'Priced in', suffix: '' },
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
                title: 'Why buy from {{companyName}}',
                features: [
                  { icon: 'package', title: 'Genuine stock', description: 'Devices sourced and checked before they are listed.' },
                  { icon: 'professional', title: 'Tested before it ships', description: 'Every unit is powered on and inspected.' },
                  { icon: 'phone', title: 'Direct contact', description: 'Reach us on {{phone}} — no middleman.' },
                  { icon: 'map-pin', title: 'Collect or deliver', description: 'Pick up in {{location}} or arrange delivery.' },
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
              id: 'company-capacity-1',
              type: 'company-capacity',
              props: {
                title: '{{companyName}}',
                // Blank rather than wrong: this shipped as a 50,000 m2 factory with 500+
                // workers exporting through Xiamen Port, for any seller who picked it.
                tradeInfo: { yearsInBusiness: '', mainMarkets: '{{location}}', exportPercentage: '', nearestPort: '' },
                rdInfo: { rdEngineers: '', rdStaff: '', oemServices: false, odmServices: false },
                productionInfo: { factorySize: '', workers: '', monthlyCapacity: '', productionLines: '' },
              },
              position: 1,
            },
            {
              id: 'company-about-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: false,
                showYearsActive: true,
                showEmployees: false,
                layout: 'cards',
              },
              position: 2,
            },
          ],
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards',
              },
              position: 1,
            },
            {
              id: 'contacts-inquiry-1',
              type: 'inquiry-form',
              props: {
                title: 'Send {{companyName}} an inquiry',
                description: 'Tell us the product, the quantity and where it needs to go.',
                buttonText: 'Send inquiry',
                backgroundColor: '#232f3e',
                textColor: '#ffffff',
              },
              position: 2,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'warehouse',
    name: 'Warehouse & Wholesale',
    description: 'A complete warehouse storefront with campaigns, product discovery, fulfillment strengths, video, and supplier trust details',
    preview: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
    category: 'warehouse',
    config: {
      template: 'warehouse',
      shopSign: null,
      sections: [
        {
          id: 'home', name: 'Home', slug: 'home', modules: [
            { id: 'warehouse-slides', type: 'hero-slideshow', position: 1, props: { autoplaySeconds: 5, slides: [
              { title: 'Ready to ship from our warehouse', subtitle: 'Wholesale inventory, dependable fulfillment, and flexible order quantities.', imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', buttonText: 'Browse inventory', buttonUrl: '/products' },
              { title: 'Built for business buyers', subtitle: 'Request samples, compare products, and contact our team.', imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80', buttonText: 'Contact us', buttonUrl: '/contacts' },
            ] } },
            { id: 'warehouse-categories', type: 'category-cards', position: 2, props: { title: 'Shop by category', backgroundColor: '#1677ff', textColor: '#ffffff', categories: [
              { name: 'Ready to Ship', sublabel: 'Fast', imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=400&q=80', link: '/products' },
              { name: 'Bulk Orders', sublabel: 'Wholesale', imageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=400&q=80', link: '/products' },
            ] } },
            { id: 'warehouse-products', type: 'recommended-products', position: 3, props: { title: 'Featured warehouse inventory', productSource: 'all', productIds: [], limit: 8, columns: 4 } },
            { id: 'warehouse-stats', type: 'stats', position: 4, props: { title: 'Fulfillment capability', backgroundColor: '#0f4fd8', textColor: '#ffffff', stats: [
              { value: '', label: 'Warehouse area', suffix: ' m²' }, { value: '', label: 'Dispatch target', suffix: ' hrs' }, { value: '', label: 'Units available', suffix: '' }, { value: '', label: 'On-time shipping', suffix: '' },
            ] } },
            { id: 'warehouse-video', type: 'video', position: 5, props: { title: 'Warehouse tour', videoUrl: '', videoType: 'upload', aspectRatio: '16:9', autoplay: false } },
          ],
        },
        { id: 'products', name: 'Products', slug: 'products', modules: [
          { id: 'warehouse-catalog', type: 'double-row-products', position: 1, props: { title: 'All warehouse products', productSource: 'all', productIds: [], limit: 10, rows: 2, columns: 5 } },
        ] },
        { id: 'company-profile', name: 'Company Profile', slug: 'company-profile', modules: [
          { id: 'warehouse-company', type: 'company', position: 1, props: { title: '{{companyName}} — warehouse and company profile', description: '{{description}}', showCertification: true, showYearsActive: true, showEmployees: true, layout: 'cards' } },
          { id: 'warehouse-capacity', type: 'company-capacity', position: 2, props: { title: 'Operational capability', tradeInfo: { yearsInBusiness: '', mainMarkets: '', exportPercentage: '', nearestPort: '' }, rdInfo: { rdEngineers: '', rdStaff: '', oemServices: false, odmServices: false }, productionInfo: { factorySize: '', workers: '', monthlyCapacity: '', productionLines: '' } } },
          { id: 'warehouse-certifications', type: 'certifications', position: 3, props: { title: 'Verification and certifications', certifications: [] } },
        ] },
        { id: 'contacts', name: 'Contacts', slug: 'contacts', modules: [] },
      ],
    },
  },


  // ---- Authored from the Alibaba canvas research: banner → (designed band + one product
  // ---- row) repeated → capability/company → inquiry form. These nine previously existed
  // ---- only as empty rows in the database.
  {
    id: 'fashion-store',
    name: 'Fashion Store',
    description: 'Editorial fashion storefront with a lookbook banner, category wall, and size-ready product rows',
    preview: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80',
    category: 'fashion',
    config: {
      template: 'fashion-store',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'New season, new stock',
                    subtitle: 'Wholesale fashion for boutiques and market traders',
                    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'See the collection',
                    buttonUrl: '/products'
                  },
                  {
                    title: 'Order by the bundle',
                    subtitle: 'Mixed sizes, one price, delivered to your shop',
                    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'View bundles',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'Women',
                    href: '/products',
                    x: 3,
                    y: 10,
                    w: 30,
                    h: 80
                  },
                  {
                    label: 'Men',
                    href: '/products',
                    x: 35,
                    y: 10,
                    w: 30,
                    h: 80
                  },
                  {
                    label: 'Kids',
                    href: '/products',
                    x: 67,
                    y: 10,
                    w: 30,
                    h: 80
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'This week’s best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Fabric you can trust',
                subtitle: 'Every piece checked before it ships — no surprises at your counter',
                imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Just arrived',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-stats-6',
              type: 'stats',
              props: {
                title: 'Why boutiques buy from us',
                backgroundColor: '#1f1d1a',
                textColor: '#f5efe6',
                backgroundImage: '',
                stats: [
                  {
                    value: 'MOQ',
                    label: 'Flexible order sizes',
                    suffix: ''
                  },
                  {
                    value: '48h',
                    label: 'Quote turnaround',
                    suffix: ''
                  },
                  {
                    value: 'BIF',
                    label: 'Local pricing',
                    suffix: ''
                  },
                  {
                    value: 'Verified',
                    label: 'Supplier status',
                    suffix: ''
                  }
                ]
              },
              position: 6
            },
            {
              id: 'home-inquiry-form-7',
              type: 'inquiry-form',
              props: {
                title: 'Ask for a wholesale price list',
                description: 'Tell us your shop size and the styles you move fastest.',
                buttonText: 'Send inquiry',
                backgroundColor: '#1f1d1a',
                textColor: '#f5efe6'
              },
              position: 7
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'tech-store',
    name: 'Tech Store',
    description: 'Electronics storefront with a spec-led hero, category hot zone, and comparison-ready product rows',
    preview: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    category: 'tech',
    config: {
      template: 'tech-store',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Genuine electronics, wholesale prices',
                    subtitle: 'Phones, accessories and computing for resellers',
                    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Browse devices',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Departments',
                imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80',
                alt: 'Departments',
                regions: [
                  {
                    label: 'Phones',
                    href: '/products',
                    x: 2,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Computers',
                    href: '/products',
                    x: 35,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Accessories',
                    href: '/products',
                    x: 68,
                    y: 8,
                    w: 30,
                    h: 84
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Top sellers this month',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Warranty on every unit',
                subtitle: 'Sealed, serial-tracked stock with supplier-backed warranty',
                imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-features-6',
              type: 'features',
              props: {
                title: 'Built for resellers',
                features: [
                  {
                    title: 'Sealed stock',
                    description: 'Serial numbers logged on every unit'
                  },
                  {
                    title: 'Bulk pricing',
                    description: 'Tiered prices from 10 units'
                  },
                  {
                    title: 'Fast dispatch',
                    description: 'Same-day for in-stock items'
                  },
                  {
                    title: 'Tech support',
                    description: 'Help with setup and returns'
                  }
                ]
              },
              position: 6
            },
            {
              id: 'home-inquiry-form-7',
              type: 'inquiry-form',
              props: {
                title: 'Request a bulk quote',
                description: 'Tell us the models and quantities — we reply with tiered pricing.',
                buttonText: 'Send inquiry',
                backgroundColor: '#0b1220',
                textColor: '#ffffff'
              },
              position: 7
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kids-clothing',
    name: 'Kids Clothing',
    description: 'Bright, friendly children’s wear storefront with age-group hot zone and quick-buy rows',
    preview: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=400&q=80',
    category: 'fashion',
    config: {
      template: 'kids-clothing',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Clothes that keep up with kids',
                    subtitle: 'Durable wholesale childrenswear for shops and schools',
                    imageUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop by age',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by age',
                imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by age',
                regions: [
                  {
                    label: 'Babies',
                    href: '/products',
                    x: 2,
                    y: 10,
                    w: 23,
                    h: 80
                  },
                  {
                    label: 'Toddlers',
                    href: '/products',
                    x: 27,
                    y: 10,
                    w: 23,
                    h: 80
                  },
                  {
                    label: 'Kids',
                    href: '/products',
                    x: 52,
                    y: 10,
                    w: 22,
                    h: 80
                  },
                  {
                    label: 'School',
                    href: '/products',
                    x: 76,
                    y: 10,
                    w: 22,
                    h: 80
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Parents’ favourites',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'School uniforms in bulk',
                subtitle: 'Order by class size — mixed sizes at one price',
                imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'New this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-stats-6',
              type: 'stats',
              props: {
                title: 'Trusted by shops and schools',
                backgroundColor: '#fff4e0',
                textColor: '#7c2d12',
                backgroundImage: '',
                stats: [
                  {
                    value: 'MOQ',
                    label: 'Flexible order sizes',
                    suffix: ''
                  },
                  {
                    value: '48h',
                    label: 'Quote turnaround',
                    suffix: ''
                  },
                  {
                    value: 'BIF',
                    label: 'Local pricing',
                    suffix: ''
                  },
                  {
                    value: 'Verified',
                    label: 'Supplier status',
                    suffix: ''
                  }
                ]
              },
              position: 6
            },
            {
              id: 'home-inquiry-form-7',
              type: 'inquiry-form',
              props: {
                title: 'Order uniforms or stock for your shop',
                description: 'Tell us the age range, quantities and delivery area.',
                buttonText: 'Send inquiry',
                backgroundColor: '#f97316',
                textColor: '#ffffff'
              },
              position: 7
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'luxury-fashion',
    name: 'Luxury Fashion',
    description: 'Restrained, premium storefront — dark palette, wide imagery, one row of product at a time',
    preview: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
    category: 'fashion',
    config: {
      template: 'luxury-fashion',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Considered pieces. Serious quantities.',
                    subtitle: 'Premium wholesale for boutiques that sell on quality',
                    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'View the collection',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-image-text-2',
              type: 'image-text',
              props: {
                title: 'Made to be worn for years',
                subtitle: 'Natural fabrics, finished by hand, sourced responsibly',
                imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'center',
                height: 320,
                hideBottom: true
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'The edit',
                productSource: 'all',
                productIds: [],
                limit: 3,
                columns: 3,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-hot-zone-4',
              type: 'hot-zone',
              props: {
                title: 'Collections',
                imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1600&q=80',
                alt: 'Collections',
                regions: [
                  {
                    label: 'Tailoring',
                    href: '/products',
                    x: 3,
                    y: 10,
                    w: 45,
                    h: 80
                  },
                  {
                    label: 'Evening',
                    href: '/products',
                    x: 52,
                    y: 10,
                    w: 45,
                    h: 80
                  }
                ]
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Recently added',
                productSource: 'all',
                productIds: [],
                limit: 3,
                columns: 3,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-company-6',
              type: 'company',
              props: {
                title: 'The house',
                description: 'Tell the story behind the label — atelier, materials, and the people who make each piece.',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 6
            },
            {
              id: 'home-inquiry-form-7',
              type: 'inquiry-form',
              props: {
                title: 'Private wholesale enquiries',
                description: 'Boutique buyers: tell us your market and we will send the line sheet.',
                buttonText: 'Send inquiry',
                backgroundColor: '#0f0f0f',
                textColor: '#e7d9b8'
              },
              position: 7
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'amazon-computers',
    name: 'Computers Store',
    description: 'Computers department storefront with category hot zone, deal rows, and inquiry form',
    preview: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80',
    category: 'retail',
    config: {
      template: 'amazon-computers',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Computers at wholesale prices',
                    subtitle: 'Laptops, desktops and peripherals for offices, schools and resellers',
                    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop all',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'Laptops',
                    href: '/products',
                    x: 2,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Desktops',
                    href: '/products',
                    x: 35,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Accessories',
                    href: '/products',
                    x: 68,
                    y: 8,
                    w: 30,
                    h: 84
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Office in a box',
                subtitle: 'Bulk laptop bundles configured and ready to deploy',
                imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Deals this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-image-text-6',
              type: 'image-text',
              props: {
                title: 'Repairs and upgrades',
                subtitle: 'RAM, SSD and screen replacements while you wait',
                imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 6
            },
            {
              id: 'home-recommended-products-7',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 7
            },
            {
              id: 'home-features-8',
              type: 'features',
              props: {
                title: 'Why buy from {{companyName}}',
                features: [
                  {
                    title: 'Genuine stock',
                    description: 'Sourced from authorised suppliers'
                  },
                  {
                    title: 'Bulk discounts',
                    description: 'Better prices as quantity grows'
                  },
                  {
                    title: 'Fast delivery',
                    description: 'Across Bujumbura and beyond'
                  },
                  {
                    title: 'Easy returns',
                    description: 'Damaged goods replaced quickly'
                  }
                ]
              },
              position: 8
            },
            {
              id: 'home-inquiry-form-9',
              type: 'inquiry-form',
              props: {
                title: 'Need a quote?',
                description: 'Send quantities and models — we reply within one business day.',
                buttonText: 'Send inquiry',
                backgroundColor: '#131921',
                textColor: '#ffffff'
              },
              position: 9
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'amazon-phones',
    name: 'Phones Store',
    description: 'Phones department storefront with category hot zone, deal rows, and inquiry form',
    preview: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
    category: 'retail',
    config: {
      template: 'amazon-phones',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Phones at wholesale prices',
                    subtitle: 'Smartphones, feature phones and accessories at trade prices',
                    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop all',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'Smartphones',
                    href: '/products',
                    x: 2,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Feature phones',
                    href: '/products',
                    x: 35,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Accessories',
                    href: '/products',
                    x: 68,
                    y: 8,
                    w: 30,
                    h: 84
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Sealed and genuine',
                subtitle: 'Every phone serial-logged with supplier warranty',
                imageUrl: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Deals this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-image-text-6',
              type: 'image-text',
              props: {
                title: 'Cases, chargers, screens',
                subtitle: 'High-margin accessories to sell alongside every handset',
                imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 6
            },
            {
              id: 'home-recommended-products-7',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 7
            },
            {
              id: 'home-features-8',
              type: 'features',
              props: {
                title: 'Why buy from {{companyName}}',
                features: [
                  {
                    title: 'Genuine stock',
                    description: 'Sourced from authorised suppliers'
                  },
                  {
                    title: 'Bulk discounts',
                    description: 'Better prices as quantity grows'
                  },
                  {
                    title: 'Fast delivery',
                    description: 'Across Bujumbura and beyond'
                  },
                  {
                    title: 'Easy returns',
                    description: 'Damaged goods replaced quickly'
                  }
                ]
              },
              position: 8
            },
            {
              id: 'home-inquiry-form-9',
              type: 'inquiry-form',
              props: {
                title: 'Need a quote?',
                description: 'Send quantities and models — we reply within one business day.',
                buttonText: 'Send inquiry',
                backgroundColor: '#131921',
                textColor: '#ffffff'
              },
              position: 9
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'amazon-clothing',
    name: 'Clothing Store',
    description: 'Clothing department storefront with category hot zone, deal rows, and inquiry form',
    preview: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
    category: 'retail',
    config: {
      template: 'amazon-clothing',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Clothing at wholesale prices',
                    subtitle: 'Everyday wear for men, women and kids, by the bundle',
                    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop all',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'Women',
                    href: '/products',
                    x: 3,
                    y: 10,
                    w: 30,
                    h: 80
                  },
                  {
                    label: 'Men',
                    href: '/products',
                    x: 35,
                    y: 10,
                    w: 30,
                    h: 80
                  },
                  {
                    label: 'Kids',
                    href: '/products',
                    x: 67,
                    y: 10,
                    w: 30,
                    h: 80
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Mixed bundles',
                subtitle: 'Assorted sizes at one price — easy to stock a rail',
                imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Deals this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-image-text-6',
              type: 'image-text',
              props: {
                title: 'Workwear and uniforms',
                subtitle: 'Durable pieces for teams, schools and shops',
                imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 6
            },
            {
              id: 'home-recommended-products-7',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 7
            },
            {
              id: 'home-features-8',
              type: 'features',
              props: {
                title: 'Why buy from {{companyName}}',
                features: [
                  {
                    title: 'Genuine stock',
                    description: 'Sourced from authorised suppliers'
                  },
                  {
                    title: 'Bulk discounts',
                    description: 'Better prices as quantity grows'
                  },
                  {
                    title: 'Fast delivery',
                    description: 'Across Bujumbura and beyond'
                  },
                  {
                    title: 'Easy returns',
                    description: 'Damaged goods replaced quickly'
                  }
                ]
              },
              position: 8
            },
            {
              id: 'home-inquiry-form-9',
              type: 'inquiry-form',
              props: {
                title: 'Need a quote?',
                description: 'Send quantities and models — we reply within one business day.',
                buttonText: 'Send inquiry',
                backgroundColor: '#131921',
                textColor: '#ffffff'
              },
              position: 9
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'amazon-electronics',
    name: 'Electronics Store',
    description: 'Electronics department storefront with category hot zone, deal rows, and inquiry form',
    preview: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=400&q=80',
    category: 'retail',
    config: {
      template: 'amazon-electronics',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Electronics at wholesale prices',
                    subtitle: 'TVs, audio, solar and small appliances for resellers',
                    imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop all',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'TV & audio',
                    href: '/products',
                    x: 2,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Solar & power',
                    href: '/products',
                    x: 35,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Appliances',
                    href: '/products',
                    x: 68,
                    y: 8,
                    w: 30,
                    h: 84
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Solar that sells',
                subtitle: 'Panels, batteries and lights for homes off the grid',
                imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Deals this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-image-text-6',
              type: 'image-text',
              props: {
                title: 'Tested before dispatch',
                subtitle: 'Every unit powered on and checked',
                imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 6
            },
            {
              id: 'home-recommended-products-7',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 7
            },
            {
              id: 'home-features-8',
              type: 'features',
              props: {
                title: 'Why buy from {{companyName}}',
                features: [
                  {
                    title: 'Genuine stock',
                    description: 'Sourced from authorised suppliers'
                  },
                  {
                    title: 'Bulk discounts',
                    description: 'Better prices as quantity grows'
                  },
                  {
                    title: 'Fast delivery',
                    description: 'Across Bujumbura and beyond'
                  },
                  {
                    title: 'Easy returns',
                    description: 'Damaged goods replaced quickly'
                  }
                ]
              },
              position: 8
            },
            {
              id: 'home-inquiry-form-9',
              type: 'inquiry-form',
              props: {
                title: 'Need a quote?',
                description: 'Send quantities and models — we reply within one business day.',
                buttonText: 'Send inquiry',
                backgroundColor: '#131921',
                textColor: '#ffffff'
              },
              position: 9
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
  {
    id: 'amazon-home',
    name: 'Home & Furniture Store',
    description: 'Home & Furniture department storefront with category hot zone, deal rows, and inquiry form',
    preview: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
    category: 'retail',
    config: {
      template: 'amazon-home',
      shopSign: {
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80',
        altText: '{{companyName}}',
        hidden: false
      },
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: 'home-hero-slideshow-1',
              type: 'hero-slideshow',
              props: {
                autoplaySeconds: 5,
                slides: [
                  {
                    title: 'Home & Furniture at wholesale prices',
                    subtitle: 'Furniture, kitchen and homeware for shops and landlords',
                    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80',
                    buttonText: 'Shop all',
                    buttonUrl: '/products'
                  }
                ],
                hideBottom: true
              },
              position: 1
            },
            {
              id: 'home-hot-zone-2',
              type: 'hot-zone',
              props: {
                title: 'Shop by category',
                imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
                alt: 'Shop by category',
                regions: [
                  {
                    label: 'Furniture',
                    href: '/products',
                    x: 2,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Kitchen',
                    href: '/products',
                    x: 35,
                    y: 8,
                    w: 31,
                    h: 84
                  },
                  {
                    label: 'Decor',
                    href: '/products',
                    x: 68,
                    y: 8,
                    w: 30,
                    h: 84
                  }
                ]
              },
              position: 2
            },
            {
              id: 'home-recommended-products-3',
              type: 'recommended-products',
              props: {
                title: 'Best sellers',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 3
            },
            {
              id: 'home-image-text-4',
              type: 'image-text',
              props: {
                title: 'Furnish a whole room',
                subtitle: 'Sets priced for landlords and guesthouses',
                imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'left',
                height: 260,
                hideBottom: true
              },
              position: 4
            },
            {
              id: 'home-recommended-products-5',
              type: 'recommended-products',
              props: {
                title: 'Deals this week',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 5
            },
            {
              id: 'home-image-text-6',
              type: 'image-text',
              props: {
                title: 'Made locally',
                subtitle: 'Solid wood pieces from Burundian workshops',
                imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1600&q=80',
                linkUrl: '/products',
                textPosition: 'right',
                height: 260,
                hideBottom: true
              },
              position: 6
            },
            {
              id: 'home-recommended-products-7',
              type: 'recommended-products',
              props: {
                title: 'New arrivals',
                productSource: 'all',
                productIds: [],
                limit: 4,
                columns: 4,
                singleRow: true
              },
              position: 7
            },
            {
              id: 'home-features-8',
              type: 'features',
              props: {
                title: 'Why buy from {{companyName}}',
                features: [
                  {
                    title: 'Genuine stock',
                    description: 'Sourced from authorised suppliers'
                  },
                  {
                    title: 'Bulk discounts',
                    description: 'Better prices as quantity grows'
                  },
                  {
                    title: 'Fast delivery',
                    description: 'Across Bujumbura and beyond'
                  },
                  {
                    title: 'Easy returns',
                    description: 'Damaged goods replaced quickly'
                  }
                ]
              },
              position: 8
            },
            {
              id: 'home-inquiry-form-9',
              type: 'inquiry-form',
              props: {
                title: 'Need a quote?',
                description: 'Send quantities and models — we reply within one business day.',
                buttonText: 'Send inquiry',
                backgroundColor: '#131921',
                textColor: '#ffffff'
              },
              position: 9
            }
          ]
        },
        {
          id: 'products',
          name: 'Products',
          slug: 'products',
          modules: [
            {
              id: 'products-recommended-products-1',
              type: 'recommended-products',
              props: {
                title: 'Product catalog',
                productSource: 'all',
                productIds: [],
                limit: 12,
                columns: 4
              },
              position: 1
            }
          ]
        },
        {
          id: 'company-profile',
          name: 'Company Profile',
          slug: 'company-profile',
          modules: [
            {
              id: 'company-profile-company-1',
              type: 'company',
              props: {
                title: 'About {{companyName}}',
                description: '{{description}}',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
                layout: 'cards'
              },
              position: 1
            }
          ]
        },
        {
          id: 'contacts',
          name: 'Contacts',
          slug: 'contacts',
          modules: [
            {
              id: 'contacts-company-1',
              type: 'company',
              props: {
                title: 'Contact {{companyName}}',
                description: 'Phone: {{phone}}\nEmail: {{email}}\nLocation: {{address}}',
                showCertification: false,
                showYearsActive: false,
                showEmployees: false,
                layout: 'cards'
              },
              position: 1
            }
          ]
        }
      ]
    }
  },
];

export async function loadStorefrontTemplates(apiBase: string): Promise<StorefrontTemplate[]> {
  try {
    const response = await fetch(`${apiBase}/api/storefront-templates`);
    if (!response.ok) throw new Error(`Templates API returned ${response.status}`);
    const templates = await response.json() as StorefrontTemplate[];
    return templates.filter((template) => template?.id && template?.config?.sections);
  } catch (error) {
    console.warn('Using offline template catalog.', error);
    return STOREFRONT_TEMPLATES;
  }
}
