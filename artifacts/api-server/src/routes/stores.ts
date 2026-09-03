import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, newProductsTable, categoriesTable, marketplaceUsersTable } from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const router = Router();

// GET /api/stores/seller/:sellerId - Get store by seller ID
// Keep this before /:slug so "seller" is not treated as a store slug.
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.sellerId, parseInt(req.params.sellerId)));

    if (!store) {
      return res.status(404).json({ error: "No store found for this seller" });
    }

    res.json({ store });
  } catch (error) {
    console.error("Error fetching seller store:", error);
    res.status(500).json({ error: "Failed to fetch store" });
  }
});

// GET /api/stores/:slug - Get store by slug
router.get("/:slug", async (req, res) => {
  try {
    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.slug, req.params.slug));

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Get seller info
    const [seller] = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.id, store.sellerId));

    // Get product count
    const productCount = await db
      .select({ count: newProductsTable.id })
      .from(newProductsTable)
      .where(eq(newProductsTable.storeId, store.id));

    res.json({ 
      store: {
        ...store,
        sellerName: seller?.name,
        productCount: productCount.length,
      }
    });
  } catch (error) {
    console.error("Error fetching store:", error);
    res.status(500).json({ error: "Failed to fetch store" });
  }
});

// GET /api/stores/:id/products - Get store products
router.get("/:id/products", async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    
    const products = await db
      .select()
      .from(newProductsTable)
      .where(eq(newProductsTable.storeId, storeId))
      .orderBy(desc(newProductsTable.createdAt));

    // Get category names
    const productsWithCategories = await Promise.all(
      products.map(async (product) => {
        let categoryName = 'Other';
        if (product.categoryId) {
          const [category] = await db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, product.categoryId));
          if (category) categoryName = category.name;
        }
        return { ...product, category: categoryName };
      })
    );

    res.json({ products: productsWithCategories });
  } catch (error) {
    console.error("Error fetching store products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/stores - List all stores
router.get("/", async (req, res) => {
  try {
    const stores = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.status, "active"))
      .orderBy(desc(storesTable.rating));

    res.json({ stores });
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ error: "Failed to fetch stores" });
  }
});

// POST /api/stores - Create store
router.post("/", async (req, res) => {
  try {
    const { sellerId, name, description, category, phone, email, province, commune, zone, address, template = "alibaba-us-warehouse" } = req.body;

    if (!sellerId || !name) {
      return res.status(400).json({ error: "sellerId and name are required" });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Define default Alibaba US Warehouse template inline
    const alibabaTemplate = {
      sections: [
        {
          id: 'home',
          name: 'Home',
          slug: 'home',
          modules: [
            {
              id: `hero-${Date.now()}`,
              type: 'hero',
              props: {
                title: 'Premium Quality Products',
                subtitle: 'Direct from US Warehouse - Fast Shipping',
                imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
                buttonText: 'Shop Now',
                buttonUrl: '/products',
                brand: name,
              },
              position: 0,
            },
            {
              id: `category-cards-${Date.now()}`,
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
              id: `stats-${Date.now()}`,
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
              id: `recommended-products-${Date.now()}`,
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
              id: `product-category-${Date.now()}`,
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
              id: `company-${Date.now()}`,
              type: 'company',
              props: {
                title: 'About Our Company',
                description: description || 'We are a leading supplier with 15+ years of experience in providing quality products to businesses worldwide.',
                showCertification: true,
                showYearsActive: true,
                showEmployees: true,
              },
              position: 0,
            },
            {
              id: `company-capacity-${Date.now()}`,
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
              id: `certifications-${Date.now()}`,
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
              id: `company-performance-${Date.now()}`,
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
              id: `features-${Date.now()}`,
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
              id: `warehouse-info-${Date.now()}`,
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

    const selectedTemplate = alibabaTemplate;

    // Create storefront config from template
    const storefrontConfig = {
      storeId: sellerId,
      template: template,
      shopSign: {
        imageUrl: null,
        altText: `${name} Banner`,
        hidden: false,
      },
      sections: selectedTemplate.sections.map(section => ({
        ...section,
        modules: section.modules.map(module => ({
          ...module,
          id: `${module.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
      })),
      updatedAt: new Date().toISOString(),
    };

    const [store] = await db
      .insert(storesTable)
      .values({
        sellerId,
        name,
        description,
        slug,
        status: "active",
        province,
        commune,
        zone,
        address,
        phone,
        email,
        businessCategory: category,
        storeTemplate: template,
        storefrontConfig: storefrontConfig as any,
      })
      .returning();

    res.status(201).json({ store });
  } catch (error) {
    console.error("Error creating store:", error);
    res.status(500).json({ error: "Failed to create store" });
  }
});

// PATCH /api/stores/:id - Update store
router.patch("/:id", async (req, res) => {
  try {
    const { applyTemplate, ...updateData } = req.body;

    let finalUpdateData = { ...updateData, updatedAt: new Date() };

    // If applyTemplate is requested, update the storefront config
    if (applyTemplate) {
      const existingStore = await db
        .select()
        .from(storesTable)
        .where(eq(storesTable.id, parseInt(req.params.id)));

      if (existingStore.length > 0) {
        const store = existingStore[0];

        // Define Alibaba US Warehouse template
        const alibabaTemplate = {
          sections: [
            {
              id: 'home',
              name: 'Home',
              slug: 'home',
              modules: [
                {
                  id: `hero-${Date.now()}`,
                  type: 'hero',
                  props: {
                    title: 'Premium Quality Products',
                    subtitle: 'Direct from US Warehouse - Fast Shipping',
                    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
                    buttonText: 'Shop Now',
                    buttonUrl: '/products',
                    brand: store.name,
                  },
                  position: 0,
                },
                {
                  id: `category-cards-${Date.now()}`,
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
                  id: `stats-${Date.now()}`,
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
                  id: `recommended-products-${Date.now()}`,
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
                  id: `product-category-${Date.now()}`,
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
                  id: `company-${Date.now()}`,
                  type: 'company',
                  props: {
                    title: 'About Our Company',
                    description: store.description || 'We are a leading supplier with 15+ years of experience in providing quality products to businesses worldwide.',
                    showCertification: true,
                    showYearsActive: true,
                    showEmployees: true,
                  },
                  position: 0,
                },
                {
                  id: `company-capacity-${Date.now()}`,
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
                  id: `certifications-${Date.now()}`,
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
                  id: `company-performance-${Date.now()}`,
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
                  id: `features-${Date.now()}`,
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
                  id: `warehouse-info-${Date.now()}`,
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
          storeId: store.sellerId,
          template: 'alibaba-us-warehouse',
          shopSign: {
            imageUrl: store.banner || null,
            altText: `${store.name} Banner`,
            hidden: false,
          },
          sections: alibabaTemplate.sections,
          updatedAt: new Date().toISOString(),
        };

        finalUpdateData = {
          ...finalUpdateData,
          storeTemplate: 'alibaba-us-warehouse',
          storefrontConfig: storefrontConfig as any,
        };
      }
    }

    const [updated] = await db
      .update(storesTable)
      .set(finalUpdateData)
      .where(eq(storesTable.id, parseInt(req.params.id)))
      .returning();

    res.json({ store: updated });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ error: "Failed to update store" });
  }
});

export default router;
