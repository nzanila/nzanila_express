import {
  pgTable,
  serial,
  text,
  numeric,
  real,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const suppliersTable = pgTable("marketplace_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  rating: real("rating").notNull().default(4.8),
  responseRate: integer("response_rate").notNull().default(95),
  yearsActive: integer("years_active").notNull().default(5),
  verified: boolean("verified").notNull().default(false),
  productCount: integer("product_count").notNull().default(0),
  image: text("image").notNull(),
  specialty: text("specialty").notNull(),
});

export const productsTable = pgTable("marketplace_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: numeric("price").notNull(),
  compareAtPrice: numeric("compare_at_price"),
  moq: integer("moq").notNull().default(1),
  rating: real("rating").notNull().default(4.7),
  reviews: integer("reviews").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  image: text("image").notNull(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  verified: boolean("verified").notNull().default(false),
  unit: text("unit").notNull().default("piece"),
  description: text("description").notNull(),
  shipping: text("shipping").notNull().default("Ships in 5–8 days"),
  featured: boolean("featured").notNull().default(false),
});

export const cartItemsTable = pgTable("marketplace_cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const ordersTable = pgTable("marketplace_orders", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull().default("processing"),
  total: numeric("total").notNull(),
  itemCount: integer("item_count").notNull(),
  buyerName: text("buyer_name").notNull().default("Demo buyer"),
  destination: text("destination").notNull(),
});

export const orderItemsTable = pgTable("marketplace_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  supplierName: text("supplier_name").notNull(),
});

export const marketplaceUsersTable = pgTable("marketplace_users", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id").notNull(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role").notNull(),
  location: text("location").notNull().default("Bujumbura"),
  verified: boolean("verified").notNull().default(false),
  avatar: text("avatar").notNull().default(""),
  otpCode: text("otp_code"),
  otpExpiresAt: text("otp_expires_at"),
  preferredLanguage: text("preferred_language").default("rn"),
  province: text("province"),
  city: text("city"),
  zone: text("zone"),
  landmark: text("landmark"),
  deliveryPhone: text("delivery_phone"),
  businessName: text("business_name"),
  sellerFullName: text("seller_full_name"),
  productCategories: text("product_categories").array(),
  offersDelivery: boolean("offers_delivery"),
  offersPickup: boolean("offers_pickup"),
  deliveryAreas: text("delivery_areas"),
  verificationStatus: text("verification_status").default("not_submitted"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  passwordHash: text("password_hash"),
  profilePicture: text("profile_picture"),
  businessDescription: text("business_description"),
  openingHours: jsonb("opening_hours"),
  deliveryFeeStructure: jsonb("delivery_fee_structure"),
  shopLatitude: real("shop_latitude"),
  shopLongitude: real("shop_longitude"),
  shopLocationApproximate: boolean("shop_location_approximate").default(true),
  shopAddress: text("shop_address"),
  shopDirections: text("shop_directions"),
  shopPhone: text("shop_phone"),
  meetAtPublicLandmark: boolean("meet_at_public_landmark").default(false),
  addressName: text("address_name"),
  directions: text("directions"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  approximateAddress: text("approximate_address"),
  rating: real("rating").default(0),
  responseTimeHours: integer("response_time_hours").default(24),
  totalOrders: integer("total_orders").default(0),
  idDocumentUrl: text("id_document_url"),
  idDocumentType: text("id_document_type"),
  idDocumentName: text("id_document_name"),
  verificationSubmittedAt: timestamp("verification_submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Supplier = typeof suppliersTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type MarketplaceUser = typeof marketplaceUsersTable.$inferSelect;

// Burundi location tables
export const burundiProvincesTable = pgTable("burundi_provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr").notNull(),
  nameRn: text("name_rn").notNull(),
  nameSw: text("name_sw").notNull(),
});

export const burundiCommunesTable = pgTable("burundi_communes", {
  id: serial("id").primaryKey(),
  provinceId: integer("province_id").notNull().references(() => burundiProvincesTable.id),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr").notNull(),
  nameRn: text("name_rn").notNull(),
  nameSw: text("name_sw").notNull(),
});

export const burundiZonesTable = pgTable("burundi_zones", {
  id: serial("id").primaryKey(),
  communeId: integer("commune_id").notNull().references(() => burundiCommunesTable.id),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  nameFr: text("name_fr").notNull(),
  nameRn: text("name_rn").notNull(),
  nameSw: text("name_sw").notNull(),
});

// Seller shop pictures
export const sellerShopPicturesTable = pgTable("seller_shop_pictures", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  pictureUrl: text("picture_url").notNull(),
  pictureType: text("picture_type").notNull(),
  isPrimary: boolean("is_primary").default(false),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Buyer addresses
export const buyerAddressesTable = pgTable("buyer_addresses", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  addressName: text("address_name").notNull(),
  recipientName: text("recipient_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  provinceId: integer("province_id").references(() => burundiProvincesTable.id),
  province: text("province"),
  communeId: integer("commune_id").references(() => burundiCommunesTable.id),
  commune: text("commune"),
  zoneId: integer("zone_id").references(() => burundiZonesTable.id),
  zone: text("zone"),
  landmark: text("landmark"),
  detailedDirections: text("detailed_directions"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Seller products
export const sellerProductsTable = pgTable("seller_products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  unit: text("unit").notNull().default("piece"),
  minimumOrderQuantity: integer("minimum_order_quantity").notNull().default(1),
  availableStock: integer("available_stock").notNull().default(0),
  condition: text("condition").notNull().default("new"),
  deliveryAvailable: boolean("delivery_available").default(true),
  pickupAvailable: boolean("pickup_available").default(false),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product pictures
export const productPicturesTable = pgTable("product_pictures", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => sellerProductsTable.id, { onDelete: "cascade" }),
  pictureUrl: text("picture_url").notNull(),
  isPrimary: boolean("is_primary").default(false),
  displayOrder: integer("display_order").default(0),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Seller delivery zones
export const sellerDeliveryZonesTable = pgTable("seller_delivery_zones", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  provinceId: integer("province_id").references(() => burundiProvincesTable.id),
  communeId: integer("commune_id").references(() => burundiCommunesTable.id),
  zoneId: integer("zone_id").references(() => burundiZonesTable.id),
  deliveryFee: numeric("delivery_fee"),
  estimatedDeliveryDays: integer("estimated_delivery_days"),
  isAvailable: boolean("is_available").default(true),
});

export type BurundiProvince = typeof burundiProvincesTable.$inferSelect;
export type BurundiCommune = typeof burundiCommunesTable.$inferSelect;
export type BurundiZone = typeof burundiZonesTable.$inferSelect;
export type SellerShopPicture = typeof sellerShopPicturesTable.$inferSelect;
export type BuyerAddress = typeof buyerAddressesTable.$inferSelect;
export type SellerProduct = typeof sellerProductsTable.$inferSelect;
export type ProductPicture = typeof productPicturesTable.$inferSelect;
export type SellerDeliveryZone = typeof sellerDeliveryZonesTable.$inferSelect;