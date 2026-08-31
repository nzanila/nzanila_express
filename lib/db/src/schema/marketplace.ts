import {
  pgTable,
  serial,
  text,
  numeric,
  real,
  integer,
  timestamp,
  boolean,
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

export type Supplier = typeof suppliersTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;