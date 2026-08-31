import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cartItemsTable,
  orderItemsTable,
  ordersTable,
  productsTable,
  suppliersTable,
} from "@workspace/db";
import {
   AddCartItemBody,
   CreateOrderBody,
   CreateSupplierProductBody,
   GetMarketplaceSummaryResponse,
   GetOrderParams,
   GetProductParams,
   GetProductResponse,
   GetSupplierDashboardResponse,
   GetSupplierParams,
   ListCategoriesResponse,
   ListMySupplierProductsResponse,
   ListOrdersResponse,
   ListOrdersResponseItem,
   ListProductsQueryParams,
   ListProductsResponse,
   ListSupplierOrdersResponse,
   ListSupplierOrdersResponseItem,
   ListSuppliersResponse,
   UpdateOrderStatusBody,
   RemoveCartItemParams,
   UpdateCartItemBody,
   UpdateCartItemParams,
   UpdateOrderStatusParams,
   UpdateSupplierOrderStatusBody,
   UpdateSupplierProductBody,
   UpdateSupplierProductParams,
   GetCartResponse,
} from "@workspace/api-zod";
import { asc as orderAsc } from "drizzle-orm";

const router: IRouter = Router();
const currentSupplierId = Number(process.env.SUPPLIER_ID ?? "1");

function asNumber(value: string | number | null): number | null {
  if (value == null) return null;
  return Number(value);
}

function productDto(product: typeof productsTable.$inferSelect) {
  return {
    ...product,
    price: Number(product.price),
    compareAtPrice: asNumber(product.compareAtPrice),
    verified: Boolean(product.verified),
    featured: Boolean(product.featured),
  };
}

async function cartDto() {
  const rows = await db
    .select({ item: cartItemsTable, product: productsTable })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .orderBy(orderAsc(cartItemsTable.id));
  const items = rows.map(({ item, product }) => ({
    productId: product.id,
    product: productDto(product),
    quantity: item.quantity,
    subtotal: Number(product.price) * item.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = items.length > 0 ? 12 : 0;
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

async function ordersDto(supplierOnly = false) {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.date));
  const items = await db.select().from(orderItemsTable);
  const supplierName = supplierOnly
    ? (await db
        .select({ name: suppliersTable.name })
        .from(suppliersTable)
        .where(eq(suppliersTable.id, currentSupplierId)))[0]?.name
    : undefined;
  return orders
    .map((order) => ({
      ...order,
      date: order.date,
      total: Number(order.total),
      items: items
        .filter((item) =>
          item.orderId === order.id &&
          (!supplierOnly || item.supplierName === supplierName),
        )
        .map((item) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          supplierName: item.supplierName,
        })),
    }))
    .filter((order) => !supplierOnly || order.items.length > 0);
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.parse(req.query);
  const filters = [];
  if (query.category) filters.push(eq(productsTable.category, query.category));
  if (query.search) {
    filters.push(
      or(
        ilike(productsTable.name, `%${query.search}%`),
        ilike(productsTable.category, `%${query.search}%`),
        ilike(productsTable.supplierName, `%${query.search}%`),
      ),
    );
  }
  let productsQuery = db.select().from(productsTable);
  if (filters.length > 0) productsQuery = productsQuery.where(and(...filters)) as typeof productsQuery;
  if (query.sort === "price-low") productsQuery = productsQuery.orderBy(asc(productsTable.price)) as typeof productsQuery;
  else if (query.sort === "price-high") productsQuery = productsQuery.orderBy(desc(productsTable.price)) as typeof productsQuery;
  else if (query.sort === "rating") productsQuery = productsQuery.orderBy(desc(productsTable.rating)) as typeof productsQuery;
  else productsQuery = productsQuery.orderBy(desc(productsTable.featured), desc(productsTable.rating)) as typeof productsQuery;
  const products = await productsQuery;
  res.json(ListProductsResponse.parse(products.map(productDto)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(productDto(product)));
});

router.get("/categories", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);
  const images = new Map([
    ["Home & Kitchen", "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80"],
    ["Consumer Electronics", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80"],
    ["Beauty & Wellness", "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=500&q=80"],
    ["Apparel & Accessories", "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=500&q=80"],
    ["Office & School", "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=500&q=80"],
    ["Bags & Luggage", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80"],
  ]);
  const counts = new Map<string, number>();
  products.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
  const categories = [...counts.entries()].map(([name, count]) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    count,
    image: images.get(name) ?? products[0]?.image ?? "",
  }));
  res.json(ListCategoriesResponse.parse(categories));
});

router.get("/marketplace/summary", async (_req, res): Promise<void> => {
  const products = await db.select({ id: productsTable.id }).from(productsTable);
  const suppliers = await db.select({ location: suppliersTable.location }).from(suppliersTable);
  const orders = await db.select({ date: ordersTable.date }).from(ordersTable);
  const countries = new Set(
    suppliers
      .map((supplier) => supplier.location.split(",").pop()?.trim())
      .filter((country): country is string => Boolean(country)),
  );
  const now = new Date();
  const dealsToday = orders.filter((order) => {
    const date = new Date(order.date);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }).length;
  res.json(
    GetMarketplaceSummaryResponse.parse({
      productCount: products.length,
      supplierCount: suppliers.length,
      countries: countries.size,
      dealsToday,
    }),
  );
});

router.get("/suppliers", async (_req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(desc(suppliersTable.rating));
  res.json(ListSuppliersResponse.parse(suppliers.map((s) => ({ ...s, verified: Boolean(s.verified) }))));
});

router.get("/suppliers/:id/products", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const products = await db.select().from(productsTable).where(eq(productsTable.supplierId, params.data.id));
  res.json(ListMySupplierProductsResponse.parse(products.map(productDto)));
});

router.get("/cart", async (_req, res): Promise<void> => {
  res.json(GetCartResponse.parse(await cartDto()));
});

router.post("/cart/items", async (req, res): Promise<void> => {
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [existing] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.productId, parsed.data.productId));
  const quantity = parsed.data.quantity ?? 1;
  if (existing) {
    await db.update(cartItemsTable).set({ quantity: existing.quantity + quantity }).where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ productId: parsed.data.productId, quantity });
  }
  res.json(GetCartResponse.parse(await cartDto()));
});

router.patch("/cart/items/:id", async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(cartItemsTable).set({ quantity: parsed.data.quantity }).where(eq(cartItemsTable.productId, params.data.id));
  res.json(GetCartResponse.parse(await cartDto()));
});

router.delete("/cart/items/:id", async (req, res): Promise<void> => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.productId, params.data.id));
  res.json(GetCartResponse.parse(await cartDto()));
});

router.get("/orders", async (_req, res): Promise<void> => {
  res.json(ListOrdersResponse.parse(await ordersDto()));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const cart = await cartDto();
  if (cart.items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }
  const [order] = await db.insert(ordersTable).values({
    total: cart.total.toString(),
    itemCount: cart.itemCount,
    destination: parsed.data.destination,
    status: "processing",
    buyerName: "Demo buyer",
  }).returning();
  await db.insert(orderItemsTable).values(
    cart.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
       unitPrice: item.product.price.toString(),
      supplierName: item.product.supplierName,
    })),
  );
  await db.delete(cartItemsTable);
  const created = (await ordersDto()).find((item) => item.id === order.id);
  res.status(201).json(ListOrdersResponseItem.parse(created));
});

router.get("/supplier/dashboard", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.supplierId, currentSupplierId));
  const orders = await ordersDto(true);
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const now = new Date();
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sales = Array.from({ length: 6 }, (_, index) => {
    const bucket = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const bucketKey = `${bucket.getFullYear()}-${bucket.getMonth()}`;
    const value = orders
      .filter((order) => {
        const orderDate = new Date(order.date);
        return `${orderDate.getFullYear()}-${orderDate.getMonth()}` === bucketKey;
      })
      .reduce((sum, order) => sum + order.total, 0);
    return {
      label: monthLabels[bucket.getMonth()],
      date: bucketKey,
      value: Number(value.toFixed(2)),
    };
  });

  function percentChange(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
  const currentPeriodOrders = orders.filter((order) => {
    const date = new Date(order.date);
    return date >= currentPeriodStart && date <= now;
  });
  const previousPeriodOrders = orders.filter((order) => {
    const date = new Date(order.date);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });
  const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + order.total, 0);
  const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + order.total, 0);

  res.json(GetSupplierDashboardResponse.parse({
    revenue: Number(revenue.toFixed(2)),
    revenueChange: percentChange(currentRevenue, previousRevenue),
    orders: orders.length,
    ordersChange: percentChange(currentPeriodOrders.length, previousPeriodOrders.length),
    products: products.length,
    lowStock: products.filter((product) => product.stock < 250).length,
    recentOrders: orders.slice(0, 4),
    sales,
  }));
});

router.get("/supplier/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.supplierId, currentSupplierId));
  res.json(ListMySupplierProductsResponse.parse(products.map(productDto)));
});

router.post("/supplier/products", async (req, res): Promise<void> => {
  const parsed = CreateSupplierProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, currentSupplierId));
  const [product] = await db.insert(productsTable).values({
    name: parsed.data.name,
    category: parsed.data.category,
    price: parsed.data.price.toString(),
    moq: parsed.data.moq,
    unit: parsed.data.unit,
    description: parsed.data.description,
    image: parsed.data.image ?? "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=85",
    supplierId: currentSupplierId,
    supplierName: supplier.name,
    verified: 0,
    rating: 0,
    reviews: 0,
    featured: 0,
  }).returning();
  res.status(201).json(GetProductResponse.parse(productDto(product)));
});

router.patch("/supplier/products/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierProductParams.safeParse(req.params);
  const parsed = UpdateSupplierProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { price, ...rest } = parsed.data;
  const update = {
    ...rest,
    ...(price == null ? {} : { price: price.toString() }),
  };
  const [product] = await db.update(productsTable).set(update).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Supplier product not found" });
    return;
  }
  res.json(GetProductResponse.parse(productDto(product)));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable);
  const orderItems = items.filter((item) => item.orderId === order.id);
  res.json(ListOrdersResponseItem.parse({
    id: order.id,
    date: order.date,
    status: order.status,
    total: Number(order.total),
    itemCount: order.itemCount,
    buyerName: order.buyerName,
    destination: order.destination,
    items: orderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      supplierName: item.supplierName,
    })),
  }));
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, params.data.id));
  const orders = await ordersDto();
  const updated = orders.find((o) => o.id === params.data.id);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(ListOrdersResponseItem.parse(updated));
});

router.get("/supplier/orders", async (_req, res): Promise<void> => {
  res.json(ListSupplierOrdersResponse.parse(await ordersDto(true)));
});

router.patch("/supplier/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  const parsed = UpdateSupplierOrderStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const updated = (await ordersDto(true)).find((item) => item.id === order.id);
  if (!updated) {
    res.status(404).json({ error: "Supplier order not found" });
    return;
  }
  res.json(ListSupplierOrdersResponseItem.parse(updated));
});

export default router;