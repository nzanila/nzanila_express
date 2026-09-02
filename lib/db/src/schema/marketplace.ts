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

// Seller stores (multi-store support)
export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  banner: text("banner"),
  status: text("status").notNull().default("active"), // active, inactive, pending
  province: text("province"),
  commune: text("commune"),
  zone: text("zone"),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  phone: text("phone"),
  email: text("email"),
  businessCategory: text("business_category"),
  operatingHours: jsonb("operating_hours"),
  verificationType: text("verification_type"),
  yearsActive: integer("years_active").default(0),
  mainCategories: text("main_categories").array().default([]),
  badges: text("badges").array().default([]),
  responseRate: integer("response_rate").default(0),
  responseTime: text("response_time"),
  onTimeDelivery: integer("on_time_delivery").default(0),
  employeeCount: text("employee_count"),
  yearEstablished: integer("year_established"),
  certifications: text("certifications").array().default([]),
  performanceMetrics: jsonb("performance_metrics").default({}),
  manufacturerCapabilities: jsonb("manufacturer_capabilities").default({}),
  customizations: jsonb("customizations").default([]),
  tradeCapabilities: jsonb("trade_capabilities").default({}),
  productionCapacity: jsonb("production_capacity").default({}),
  galleryImages: text("gallery_images").array().default([]),
  videoItems: jsonb("video_items").default([]),
  eventImages: text("event_images").array().default([]),
  contactInfo: jsonb("contact_info").default({}),
  storeTemplate: text("store_template").notNull().default("showcase"),
  storeSections: jsonb("store_sections").notNull().default(["hero", "categories", "featured", "story", "videos", "certificates", "events"]),
  storefrontConfig: jsonb("storefront_config").default({}),
  rating: real("rating").default(0),
  totalSales: integer("total_sales").default(0),
  totalRevenue: numeric("total_revenue").default("0"),
  isVerified: boolean("is_verified").default(false),
  commissionRate: numeric("commission_rate").default("0.05"), // 5% default
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Store products (link products to stores)
export const storeProductsTable = pgTable("store_products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  sellerProductId: integer("seller_product_id").notNull().references(() => sellerProductsTable.id, { onDelete: "cascade" }),
  customPrice: numeric("custom_price"), // Override seller price for this store
  customStock: integer("custom_stock"), // Override stock for this store
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Store orders (link orders to stores)
export const storeOrdersTable = pgTable("store_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Store followers/customers
export const storeCustomersTable = pgTable("store_customers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  isFavorite: boolean("is_favorite").default(false),
  totalOrders: integer("total_orders").default(0),
  totalSpent: numeric("total_spent").default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Store reviews
export const storeReviewsTable = pgTable("store_reviews", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories (Nzanila-controlled, hierarchical)
export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references((): any => categoriesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameFr: text("name_fr"),
  nameRn: text("name_rn"),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Category suggestions from sellers
export const categorySuggestionsTable = pgTable("category_suggestions", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  suggestedName: text("suggested_name").notNull(),
  reason: text("reason"),
  parentId: integer("parent_id").references((): any => categoriesTable.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product units enum
export const productUnits = [
  "piece", "pair", "set", "pack", "box", "bag", "bottle", "carton",
  "kilogram", "gram", "litre", "millilitre", "metre", "square_metre",
  "dozen", "service", "other"
] as const;

// Product condition
export const productConditions = ["new", "used", "refurbished"] as const;

// Product status
export const productStatuses = ["draft", "pending_review", "approved", "rejected", "inactive"] as const;

// Products (new system - linked to stores and categories)
export const newProductsTable = pgTable("new_products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => marketplaceUsersTable.id, { onDelete: "cascade" }),
  storeId: integer("store_id").references(() => storesTable.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  customCategorySuggestion: text("custom_category_suggestion"), // When "Other" is selected
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  basePrice: numeric("base_price").notNull(),
  currency: text("currency").notNull().default("BIF"),
  unitType: text("unit_type").notNull().default("piece"), // from productUnits
  customUnit: text("custom_unit"), // When unitType is "other"
  unitQuantity: numeric("unit_quantity"), // e.g. 25 for "25 kg"
  unitMeasurement: text("unit_measurement"), // e.g. "kg", "litre"
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minimumOrderQuantity: integer("minimum_order_quantity").notNull().default(1),
  condition: text("condition").notNull().default("new"), // new, used, refurbished
  status: text("status").notNull().default("draft"), // draft, pending_review, approved, rejected, inactive
  deliveryAvailable: boolean("delivery_available").default(true),
  pickupAvailable: boolean("pickup_available").default(false),
  deliveryAreas: text("delivery_areas").array(),
  preparationTime: text("preparation_time"), // e.g. "1-2 days"
  // Category-specific fields
  brand: text("brand"),
  model: text("model"),
  storageCapacity: text("storage_capacity"),
  warranty: text("warranty"),
  includedAccessories: text("included_accessories").array(),
  material: text("material"),
  color: text("color"),
  size: text("size"),
  lengthCm: numeric("length_cm"),
  widthCm: numeric("width_cm"),
  heightCm: numeric("height_cm"),
  serviceDescription: text("service_description"),
  priceType: text("price_type"), // fixed, contact
  serviceArea: text("service_area"),
  availability: text("availability"),
  estimatedCompletionTime: text("estimated_completion_time"),
  // Media
  primaryImage: text("primary_image"),
  // Stats
  views: integer("views").default(0),
  totalSales: integer("total_sales").default(0),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product variants (size, color, weight, flavor, capacity, etc.)
export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => newProductsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "25 kg bag", "Small - Black"
  sku: text("sku"),
  price: numeric("price").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  attributesJson: jsonb("attributes_json"), // e.g. {size: "M", color: "Black"}
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product variant options (the individual option values)
export const variantOptionsTable = pgTable("variant_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => newProductsTable.id, { onDelete: "cascade" }),
  optionType: text("option_type").notNull(), // size, color, weight, flavor, capacity, other
  optionValue: text("option_value").notNull(), // e.g. "Small", "Black", "25 kg"
  displayOrder: integer("display_order").default(0),
});

// Bulk/wholesale pricing tiers
export const productPriceTiersTable = pgTable("product_price_tiers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => newProductsTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").references(() => productVariantsTable.id, { onDelete: "cascade" }),
  minimumQuantity: integer("minimum_quantity").notNull(),
  maximumQuantity: integer("maximum_quantity"),
  pricePerUnit: numeric("price_per_unit").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product pictures (new system)
export const newProductPicturesTable = pgTable("new_product_pictures", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => newProductsTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").references(() => productVariantsTable.id, { onDelete: "cascade" }),
  pictureUrl: text("picture_url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").default(false),
  displayOrder: integer("display_order").default(0),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type BurundiProvince = typeof burundiProvincesTable.$inferSelect;
export type BurundiCommune = typeof burundiCommunesTable.$inferSelect;
export type BurundiZone = typeof burundiZonesTable.$inferSelect;
export type SellerShopPicture = typeof sellerShopPicturesTable.$inferSelect;
export type BuyerAddress = typeof buyerAddressesTable.$inferSelect;
export type SellerProduct = typeof sellerProductsTable.$inferSelect;
export type ProductPicture = typeof productPicturesTable.$inferSelect;
export type SellerDeliveryZone = typeof sellerDeliveryZonesTable.$inferSelect;
export type Store = typeof storesTable.$inferSelect;
export type StoreProduct = typeof storeProductsTable.$inferSelect;
export type StoreOrder = typeof storeOrdersTable.$inferSelect;
export type StoreCustomer = typeof storeCustomersTable.$inferSelect;
export type StoreReview = typeof storeReviewsTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
export type CategorySuggestion = typeof categorySuggestionsTable.$inferSelect;
export type NewProduct = typeof newProductsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type VariantOption = typeof variantOptionsTable.$inferSelect;
export type ProductPriceTier = typeof productPriceTiersTable.$inferSelect;
export type NewProductPicture = typeof newProductPicturesTable.$inferSelect;