import { Router } from "express";
import { db } from "@workspace/db";
import {
  newProductsTable,
  productVariantsTable,
  variantOptionsTable,
  productPriceTiersTable,
  newProductPicturesTable,
  categoriesTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc, sql, ilike } from "drizzle-orm";

const router = Router();

// Helper: generate slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET /api/products - List products (buyer-facing)
router.get("/", async (req, res) => {
  try {
    const { category, search, status, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = eq(newProductsTable.status, "approved");

    if (category) {
      const [cat] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, category as string));

      if (cat) {
        where = and(where, eq(newProductsTable.categoryId, cat.id))!;
      }
    }

    if (search) {
      where = and(where, ilike(newProductsTable.name, `%${search}%`))!;
    }

    const products = await db
      .select()
      .from(newProductsTable)
      .where(where)
      .orderBy(desc(newProductsTable.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json({ products, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/seller/:sellerId - List seller's products
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const { status } = req.query;
    const where = status
      ? and(
          eq(newProductsTable.sellerId, parseInt(req.params.sellerId)),
          eq(newProductsTable.status, status as string)
        )
      : eq(newProductsTable.sellerId, parseInt(req.params.sellerId));

    const products = await db
      .select()
      .from(newProductsTable)
      .where(where)
      .orderBy(desc(newProductsTable.createdAt));

    // Fetch variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        const variants = await db
          .select()
          .from(productVariantsTable)
          .where(eq(productVariantsTable.productId, product.id));

        const pictures = await db
          .select()
          .from(newProductPicturesTable)
          .where(eq(newProductPicturesTable.productId, product.id))
          .orderBy(asc(newProductPicturesTable.displayOrder));

        return { ...product, variants, pictures };
      })
    );

    res.json({ products: productsWithVariants });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id - Get single product
router.get("/:id", async (req, res) => {
  try {
    const [product] = await db
      .select()
      .from(newProductsTable)
      .where(eq(newProductsTable.id, parseInt(req.params.id)));

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, product.id));

    const pictures = await db
      .select()
      .from(newProductPicturesTable)
      .where(eq(newProductPicturesTable.productId, product.id))
      .orderBy(asc(newProductPicturesTable.displayOrder));

    const priceTiers = await db
      .select()
      .from(productPriceTiersTable)
      .where(eq(productPriceTiersTable.productId, product.id))
      .orderBy(asc(productPriceTiersTable.minimumQuantity));

    const options = await db
      .select()
      .from(variantOptionsTable)
      .where(eq(variantOptionsTable.productId, product.id))
      .orderBy(asc(variantOptionsTable.displayOrder));

    res.json({ product, variants, pictures, priceTiers, options });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products - Create product (Step-by-step)
router.post("/", async (req, res) => {
  try {
    const {
      sellerId,
      storeId,
      categoryId,
      customCategorySuggestion,
      name,
      description,
      basePrice,
      unitType,
      customUnit,
      unitQuantity,
      unitMeasurement,
      stockQuantity,
      minimumOrderQuantity,
      condition,
      deliveryAvailable,
      pickupAvailable,
      deliveryAreas,
      preparationTime,
      // Category-specific fields
      brand,
      model,
      storageCapacity,
      warranty,
      includedAccessories,
      material,
      color,
      size,
      lengthCm,
      widthCm,
      heightCm,
      serviceDescription,
      priceType,
      serviceArea,
      availability,
      estimatedCompletionTime,
      // Media
      primaryImage,
    } = req.body;

    if (!sellerId || !name || !basePrice) {
      return res.status(400).json({ error: "sellerId, name, and basePrice are required" });
    }

    const slug = slugify(name);

    const [product] = await db
      .insert(newProductsTable)
      .values({
        sellerId,
        storeId,
        categoryId,
        customCategorySuggestion,
        name,
        slug,
        description,
        basePrice,
        unitType: unitType || "piece",
        customUnit,
        unitQuantity,
        unitMeasurement,
        stockQuantity: stockQuantity || 0,
        minimumOrderQuantity: minimumOrderQuantity || 1,
        condition: condition || "new",
        status: "draft",
        deliveryAvailable: deliveryAvailable !== false,
        pickupAvailable: pickupAvailable || false,
        deliveryAreas,
        preparationTime,
        brand,
        model,
        storageCapacity,
        warranty,
        includedAccessories,
        material,
        color,
        size,
        lengthCm,
        widthCm,
        heightCm,
        serviceDescription,
        priceType,
        serviceArea,
        availability,
        estimatedCompletionTime,
        primaryImage,
      })
      .returning();

    res.status(201).json({ product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PATCH /api/products/:id - Update product
router.patch("/:id", async (req, res) => {
  try {
    const [updated] = await db
      .update(newProductsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(newProductsTable.id, parseInt(req.params.id)))
      .returning();

    res.json({ product: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// POST /api/products/:id/submit - Submit product for review
router.post("/:id/submit", async (req, res) => {
  try {
    const [updated] = await db
      .update(newProductsTable)
      .set({
        status: "pending_review",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newProductsTable.id, parseInt(req.params.id)))
      .returning();

    res.json({ product: updated });
  } catch (error) {
    console.error("Error submitting product:", error);
    res.status(500).json({ error: "Failed to submit product" });
  }
});

// POST /api/products/:id/variants - Add variant
router.post("/:id/variants", async (req, res) => {
  try {
    const { name, sku, price, stockQuantity, attributesJson, imageUrl } = req.body;

    const [variant] = await db
      .insert(productVariantsTable)
      .values({
        productId: parseInt(req.params.id),
        name,
        sku,
        price,
        stockQuantity: stockQuantity || 0,
        attributesJson,
        imageUrl,
      })
      .returning();

    res.status(201).json({ variant });
  } catch (error) {
    console.error("Error creating variant:", error);
    res.status(500).json({ error: "Failed to create variant" });
  }
});

// DELETE /api/products/:id/variants/:variantId
router.delete("/:id/variants/:variantId", async (req, res) => {
  try {
    await db
      .delete(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.id, parseInt(req.params.variantId)),
          eq(productVariantsTable.productId, parseInt(req.params.id))
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting variant:", error);
    res.status(500).json({ error: "Failed to delete variant" });
  }
});

// POST /api/products/:id/options - Add variant option
router.post("/:id/options", async (req, res) => {
  try {
    const { optionType, optionValue, displayOrder } = req.body;

    const [option] = await db
      .insert(variantOptionsTable)
      .values({
        productId: parseInt(req.params.id),
        optionType,
        optionValue,
        displayOrder: displayOrder || 0,
      })
      .returning();

    res.status(201).json({ option });
  } catch (error) {
    console.error("Error creating option:", error);
    res.status(500).json({ error: "Failed to create option" });
  }
});

// POST /api/products/:id/price-tiers - Add price tier
router.post("/:id/price-tiers", async (req, res) => {
  try {
    const { variantId, minimumQuantity, maximumQuantity, pricePerUnit } = req.body;

    const [tier] = await db
      .insert(productPriceTiersTable)
      .values({
        productId: parseInt(req.params.id),
        variantId,
        minimumQuantity,
        maximumQuantity,
        pricePerUnit,
      })
      .returning();

    res.status(201).json({ tier });
  } catch (error) {
    console.error("Error creating price tier:", error);
    res.status(500).json({ error: "Failed to create price tier" });
  }
});

// POST /api/products/:id/pictures - Add picture
router.post("/:id/pictures", async (req, res) => {
  try {
    const { pictureUrl, altText, isPrimary, displayOrder, variantId } = req.body;

    const [picture] = await db
      .insert(newProductPicturesTable)
      .values({
        productId: parseInt(req.params.id),
        variantId,
        pictureUrl,
        altText,
        isPrimary: isPrimary || false,
        displayOrder: displayOrder || 0,
      })
      .returning();

    res.status(201).json({ picture });
  } catch (error) {
    console.error("Error creating picture:", error);
    res.status(500).json({ error: "Failed to create picture" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    await db
      .delete(newProductsTable)
      .where(eq(newProductsTable.id, parseInt(req.params.id)));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
