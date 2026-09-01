import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  marketplaceUsersTable,
  burundiProvincesTable,
  burundiCommunesTable,
  burundiZonesTable,
  sellerShopPicturesTable,
  buyerAddressesTable,
  sellerProductsTable,
  productPicturesTable,
  sellerDeliveryZonesTable,
} from "@workspace/db";

const router: IRouter = Router();

// Middleware to verify user is authenticated
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    if (token.startsWith('nz_')) {
      const payload = JSON.parse(Buffer.from(token.slice(3), 'base64').toString());
      req.userId = payload.id;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// === BURUNDI LOCATION DATA ENDPOINTS ===

// Get all provinces
router.get("/locations/provinces", async (_req, res) => {
  const provinces = await db.select().from(burundiProvincesTable);
  res.json(provinces);
});

// Get communes by province
router.get("/locations/provinces/:provinceId/communes", async (req, res) => {
  const provinceId = parseInt(req.params.provinceId);
  const communes = await db
    .select()
    .from(burundiCommunesTable)
    .where(eq(burundiCommunesTable.provinceId, provinceId));
  res.json(communes);
});

// Get zones by commune
router.get("/locations/communes/:communeId/zones", async (req, res) => {
  const communeId = parseInt(req.params.communeId);
  const zones = await db
    .select()
    .from(burundiZonesTable)
    .where(eq(burundiZonesTable.communeId, communeId));
  res.json(zones);
});

// === SELLER PROFILE ENDPOINTS ===

// Get seller profile
router.get("/sellers/:sellerId/profile", async (req, res) => {
  const sellerId = parseInt(req.params.sellerId);
  const [seller] = await db
    .select()
    .from(marketplaceUsersTable)
    .where(eq(marketplaceUsersTable.id, sellerId));
  
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Privacy: Only show approximate location if not verified
  const publicProfile = {
    id: seller.id,
    businessName: seller.businessName,
    businessDescription: seller.businessDescription,
    rating: seller.rating,
    responseTimeHours: seller.responseTimeHours,
    totalOrders: seller.totalOrders,
    verificationStatus: seller.verificationStatus,
    // Show general location only
    province: seller.province,
    city: seller.city,
    // Only show approximate coordinates
    shopLatitude: seller.shopLocationApproximate ? seller.shopLatitude : null,
    shopLongitude: seller.shopLocationApproximate ? seller.shopLongitude : null,
    shopLocationApproximate: seller.shopLocationApproximate,
    profilePicture: seller.profilePicture,
    offersDelivery: seller.offersDelivery,
    offersPickup: seller.offersPickup,
  };

  res.json(publicProfile);
});

// Update seller profile
router.patch("/sellers/profile", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const updates = req.body;

  const [updated] = await db
    .update(marketplaceUsersTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceUsersTable.id, sellerId))
    .returning();

  res.json(updated);
});

// Upload shop picture
router.post("/sellers/shop-pictures", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const { pictureUrl, pictureType, isPrimary } = req.body;

  // If setting as primary, remove primary from other pictures
  if (isPrimary) {
    await db
      .update(sellerShopPicturesTable)
      .set({ isPrimary: false })
      .where(eq(sellerShopPicturesTable.sellerId, sellerId));
  }

  const [picture] = await db
    .insert(sellerShopPicturesTable)
    .values({
      sellerId,
      pictureUrl,
      pictureType,
      isPrimary: isPrimary || false,
    })
    .returning();

  res.status(201).json(picture);
});

// Get seller shop pictures
router.get("/sellers/:sellerId/shop-pictures", async (req, res) => {
  const sellerId = parseInt(req.params.sellerId);
  const pictures = await db
    .select()
    .from(sellerShopPicturesTable)
    .where(eq(sellerShopPicturesTable.sellerId, sellerId))
    .orderBy(desc(sellerShopPicturesTable.isPrimary), desc(sellerShopPicturesTable.uploadedAt));

  res.json(pictures);
});

// === BUYER ADDRESS ENDPOINTS ===

// Add buyer address
router.post("/buyers/addresses", requireAuth, async (req, res) => {
  const buyerId = req.userId;
  const addressData = req.body;

  // If setting as default, remove default from other addresses
  if (addressData.isDefault) {
    await db
      .update(buyerAddressesTable)
      .set({ isDefault: false })
      .where(eq(buyerAddressesTable.buyerId, buyerId));
  }

  const [address] = await db
    .insert(buyerAddressesTable)
    .values({
      buyerId,
      ...addressData,
    })
    .returning();

  res.status(201).json(address);
});

// Get buyer addresses
router.get("/buyers/addresses", requireAuth, async (req, res) => {
  const buyerId = req.userId;
  const addresses = await db
    .select()
    .from(buyerAddressesTable)
    .where(eq(buyerAddressesTable.buyerId, buyerId))
    .orderBy(desc(buyerAddressesTable.isDefault), desc(buyerAddressesTable.createdAt));

  res.json(addresses);
});

// Update buyer address
router.patch("/buyers/addresses/:addressId", requireAuth, async (req, res) => {
  const buyerId = req.userId;
  const addressId = parseInt(req.params.addressId);
  const updates = req.body;

  // Verify address belongs to buyer
  const [existing] = await db
    .select()
    .from(buyerAddressesTable)
    .where(and(
      eq(buyerAddressesTable.id, addressId),
      eq(buyerAddressesTable.buyerId, buyerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Address not found" });
  }

  // If setting as default, remove default from other addresses
  if (updates.isDefault) {
    await db
      .update(buyerAddressesTable)
      .set({ isDefault: false })
      .where(eq(buyerAddressesTable.buyerId, buyerId));
  }

  const [updated] = await db
    .update(buyerAddressesTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(buyerAddressesTable.id, addressId))
    .returning();

  res.json(updated);
});

// Delete buyer address
router.delete("/buyers/addresses/:addressId", requireAuth, async (req, res) => {
  const buyerId = req.userId;
  const addressId = parseInt(req.params.addressId);

  // Verify address belongs to buyer
  const [existing] = await db
    .select()
    .from(buyerAddressesTable)
    .where(and(
      eq(buyerAddressesTable.id, addressId),
      eq(buyerAddressesTable.buyerId, buyerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Address not found" });
  }

  await db
    .delete(buyerAddressesTable)
    .where(eq(buyerAddressesTable.id, addressId));

  res.status(204).send();
});

// === SELLER PRODUCT ENDPOINTS ===

// Add seller product
router.post("/sellers/products", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const productData = req.body;

  const [product] = await db
    .insert(sellerProductsTable)
    .values({
      sellerId,
      ...productData,
    })
    .returning();

  res.status(201).json(product);
});

// Get seller products
router.get("/sellers/products", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const products = await db
    .select()
    .from(sellerProductsTable)
    .where(eq(sellerProductsTable.sellerId, sellerId))
    .orderBy(desc(sellerProductsTable.createdAt));

  res.json(products);
});

// Update seller product
router.patch("/sellers/products/:productId", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const productId = parseInt(req.params.productId);
  const updates = req.body;

  // Verify product belongs to seller
  const [existing] = await db
    .select()
    .from(sellerProductsTable)
    .where(and(
      eq(sellerProductsTable.id, productId),
      eq(sellerProductsTable.sellerId, sellerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  const [updated] = await db
    .update(sellerProductsTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(sellerProductsTable.id, productId))
    .returning();

  res.json(updated);
});

// Delete seller product
router.delete("/sellers/products/:productId", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const productId = parseInt(req.params.productId);

  // Verify product belongs to seller
  const [existing] = await db
    .select()
    .from(sellerProductsTable)
    .where(and(
      eq(sellerProductsTable.id, productId),
      eq(sellerProductsTable.sellerId, sellerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  await db
    .delete(sellerProductsTable)
    .where(eq(sellerProductsTable.id, productId));

  res.status(204).send();
});

// Add product picture
router.post("/sellers/products/:productId/pictures", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const productId = parseInt(req.params.productId);
  const { pictureUrl, isPrimary, displayOrder } = req.body;

  // Verify product belongs to seller
  const [product] = await db
    .select()
    .from(sellerProductsTable)
    .where(and(
      eq(sellerProductsTable.id, productId),
      eq(sellerProductsTable.sellerId, sellerId)
    ));

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // If setting as primary, remove primary from other pictures
  if (isPrimary) {
    await db
      .update(productPicturesTable)
      .set({ isPrimary: false })
      .where(eq(productPicturesTable.productId, productId));
  }

  const [picture] = await db
    .insert(productPicturesTable)
    .values({
      productId,
      pictureUrl,
      isPrimary: isPrimary || false,
      displayOrder: displayOrder || 0,
    })
    .returning();

  res.status(201).json(picture);
});

// Get product pictures
router.get("/sellers/products/:productId/pictures", async (req, res) => {
  const productId = parseInt(req.params.productId);
  const pictures = await db
    .select()
    .from(productPicturesTable)
    .where(eq(productPicturesTable.productId, productId))
    .orderBy(productPicturesTable.displayOrder, desc(productPicturesTable.isPrimary));

  res.json(pictures);
});

// === SELLER DELIVERY ZONES ENDPOINTS ===

// Add delivery zone
router.post("/sellers/delivery-zones", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const zoneData = req.body;

  const [zone] = await db
    .insert(sellerDeliveryZonesTable)
    .values({
      sellerId,
      ...zoneData,
    })
    .returning();

  res.status(201).json(zone);
});

// Get seller delivery zones
router.get("/sellers/delivery-zones", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const zones = await db
    .select()
    .from(sellerDeliveryZonesTable)
    .where(eq(sellerDeliveryZonesTable.sellerId, sellerId));

  res.json(zones);
});

// Update delivery zone
router.patch("/sellers/delivery-zones/:zoneId", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const zoneId = parseInt(req.params.zoneId);
  const updates = req.body;

  // Verify zone belongs to seller
  const [existing] = await db
    .select()
    .from(sellerDeliveryZonesTable)
    .where(and(
      eq(sellerDeliveryZonesTable.id, zoneId),
      eq(sellerDeliveryZonesTable.sellerId, sellerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Delivery zone not found" });
  }

  const [updated] = await db
    .update(sellerDeliveryZonesTable)
    .set(updates)
    .where(eq(sellerDeliveryZonesTable.id, zoneId))
    .returning();

  res.json(updated);
});

// Delete delivery zone
router.delete("/sellers/delivery-zones/:zoneId", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const zoneId = parseInt(req.params.zoneId);

  // Verify zone belongs to seller
  const [existing] = await db
    .select()
    .from(sellerDeliveryZonesTable)
    .where(and(
      eq(sellerDeliveryZonesTable.id, zoneId),
      eq(sellerDeliveryZonesTable.sellerId, sellerId)
    ));

  if (!existing) {
    return res.status(404).json({ error: "Delivery zone not found" });
  }

  await db
    .delete(sellerDeliveryZonesTable)
    .where(eq(sellerDeliveryZonesTable.id, zoneId));

  res.status(204).send();
});

// === SELLER ID VERIFICATION ===

// Upload seller ID document for verification
router.post("/sellers/verify-id", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const { idDocumentUrl, idDocumentType, idDocumentName } = req.body;

  if (!idDocumentUrl || !idDocumentType) {
    return res.status(400).json({ error: "ID document URL and type are required" });
  }

  const [updated] = await db
    .update(marketplaceUsersTable)
    .set({
      idDocumentUrl,
      idDocumentType,
      idDocumentName: idDocumentName || null,
      verificationStatus: 'under_review',
      verificationSubmittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceUsersTable.id, sellerId))
    .returning();

  res.json(updated);
});

// Get seller verification status
router.get("/sellers/verification-status", requireAuth, async (req, res) => {
  const sellerId = req.userId;
  const [seller] = await db
    .select({
      verificationStatus: marketplaceUsersTable.verificationStatus,
      idDocumentType: marketplaceUsersTable.idDocumentType,
      idDocumentName: marketplaceUsersTable.idDocumentName,
      verificationSubmittedAt: marketplaceUsersTable.verificationSubmittedAt,
    })
    .from(marketplaceUsersTable)
    .where(eq(marketplaceUsersTable.id, sellerId));

  res.json(seller || {});
});

// === DELETE ACCOUNT ===

router.delete("/account", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    // Delete the user — cascading deletes handle related data
    await db.delete(marketplaceUsersTable).where(eq(marketplaceUsersTable.id, userId));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: err.message || "Failed to delete account" });
  }
});

export default router;

// === ONBOARDING ENDPOINTS ===

// Save buyer onboarding
router.post("/onboarding/buyer", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { name, province, city, zone, landmark, deliveryPhone, preferredLanguage } = req.body;

  const [updated] = await db
    .update(marketplaceUsersTable)
    .set({
      name,
      province,
      city,
      zone,
      landmark,
      deliveryPhone,
      preferredLanguage,
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceUsersTable.id, userId))
    .returning();

  res.json(updated);
});

// Save seller onboarding
router.post("/onboarding/seller", requireAuth, async (req, res) => {
  const userId = req.userId;
  const {
    name, businessName, sellerFullName, province, city, zone, landmark,
    productCategories, offersDelivery, offersPickup, deliveryAreas,
    businessDescription, shopLatitude, shopLongitude, shopLocationApproximate,
    openingHours, deliveryFeeStructure,
  } = req.body;

  const [updated] = await db
    .update(marketplaceUsersTable)
    .set({
      name: sellerFullName || name,
      businessName,
      sellerFullName,
      province,
      city,
      zone,
      landmark,
      productCategories,
      offersDelivery,
      offersPickup,
      deliveryAreas,
      businessDescription,
      shopLatitude,
      shopLongitude,
      shopLocationApproximate: shopLocationApproximate ?? true,
      openingHours,
      deliveryFeeStructure,
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceUsersTable.id, userId))
    .returning();

  res.json(updated);
});
