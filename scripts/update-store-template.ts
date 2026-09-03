import { db } from '../lib/db/src/index';
import { storesTable } from '../lib/db/src/schema/marketplace';
import { eq } from 'drizzle-orm';

async function updateExistingStore() {
  try {
    console.log('Looking for existing stores...');
    
    // Get first store
    const stores = await db.select().from(storesTable).limit(1);
    
    if (stores.length === 0) {
      console.log('No stores found in database. Creating a sample store...');
      
      // Create a sample store
      const [newStore] = await db.insert(storesTable).values({
        sellerId: 1,
        name: 'Sample US Warehouse Store',
        description: 'Professional wholesale supplier with US warehouse distribution',
        slug: 'sample-us-warehouse-store',
        status: 'active',
        businessCategory: 'Electronics',
      }).returning();
      
      console.log('Created sample store:', newStore.name, 'ID:', newStore.id);
      
      await applyTemplateToStore(newStore.id, newStore.name, newStore.description);
      return;
    }
    
    const store = stores[0];
    console.log('Found existing store:', store.name, 'ID:', store.id);
    
    await applyTemplateToStore(store.id, store.name, store.description);
    
  } catch (error) {
    console.error('Error updating store:', error);
    process.exit(1);
  }
}

async function applyTemplateToStore(storeId: number, storeName: string, storeDescription: string | null) {
  const timestamp = Date.now();
  
  // Define Alibaba US Warehouse template
  const alibabaTemplate = {
    sections: [
      {
        id: 'home',
        name: 'Home',
        slug: 'home',
        modules: [
          {
            id: `hero-${timestamp}`,
            type: 'hero',
            props: {
              title: 'Premium Quality Products',
              subtitle: 'Direct from US Warehouse - Fast Shipping',
              imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
              buttonText: 'Shop Now',
              buttonUrl: '/products',
              brand: storeName,
            },
            position: 0,
          },
          {
            id: `category-cards-${timestamp}`,
            type: 'category-cards',
            props: {
              title: 'Shop by Category',
              backgroundColor: '#1677ff',
              textColor: '#ffffff',
              categories: [
                { name: 'Electronics', sublabel: 'Hot', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=120&h=100&q=80', link: '/electronics' },
                { name: 'Clothing', sublabel: 'New', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=120&h=100&q=80', link: '/clothing' },
                { name: 'Home & Garden', sublabel: 'Sale', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=120&h=100&q=80', link: '/home-garden' },
                { name: 'Sports', sublabel: 'Trending', imageUrl: 'https://images.unsplash.com/photo-1461896836934-120&h=100&q=80', link: '/sports' },
              ],
            },
            position: 1,
          },
          {
            id: `stats-${timestamp}`,
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
            id: `recommended-products-${timestamp}`,
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
            id: `product-category-${timestamp}`,
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
            id: `company-${timestamp}`,
            type: 'company',
            props: {
              title: 'About Our Company',
              description: storeDescription || 'We are a leading supplier with 15+ years of experience in providing quality products to businesses worldwide.',
              showCertification: true,
              showYearsActive: true,
              showEmployees: true,
            },
            position: 0,
          },
          {
            id: `company-capacity-${timestamp}`,
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
            id: `certifications-${timestamp}`,
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
            id: `company-performance-${timestamp}`,
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
            id: `features-${timestamp}`,
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
            id: `warehouse-info-${timestamp}`,
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
  };

  const storefrontConfig = {
    storeId: storeId,
    template: 'alibaba-us-warehouse',
    shopSign: {
      imageUrl: null,
      altText: `${storeName} Banner`,
      hidden: false,
    },
    sections: alibabaTemplate.sections,
    updatedAt: new Date().toISOString(),
  };

  // Update the store
  await db.update(storesTable)
    .set({
      storeTemplate: 'alibaba-us-warehouse',
      storefrontConfig: storefrontConfig as any,
      updatedAt: new Date(),
    })
    .where(eq(storesTable.id, storeId));

  console.log('✅ Store updated successfully with Alibaba US Warehouse template');
  console.log('📦 Store ID:', storeId);
  console.log('🎨 Template:', 'alibaba-us-warehouse');
  console.log('🔗 Access at: http://localhost:5173/seller/1/storefront');
  
  process.exit(0);
}

updateExistingStore();