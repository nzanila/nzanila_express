import { Router } from "express";
import { db } from "../../db";
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
    const { sellerId, name, description, category, phone, email, province, commune, zone, address } = req.body;

    if (!sellerId || !name) {
      return res.status(400).json({ error: "sellerId and name are required" });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
    const [updated] = await db
      .update(storesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(storesTable.id, parseInt(req.params.id)))
      .returning();

    res.json({ store: updated });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ error: "Failed to update store" });
  }
});

export default router;
