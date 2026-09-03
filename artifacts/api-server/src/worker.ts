export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPPLIER_ID: string;
}

const SUPPLIER_ID_DEFAULT = 1;
const CATEGORY_IMAGES: Record<string, string> = {
  "Home & Kitchen": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80",
  "Consumer Electronics": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80",
  "Beauty & Wellness": "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=500&q=80",
  "Apparel & Accessories": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=500&q=80",
  "Office & School": "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=500&q=80",
  "Bags & Luggage": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80",
};

function supabaseHeaders(env: Env) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function supabaseGet(env: Env, table: string, query?: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { ...supabaseHeaders(env), Prefer: "return=representation" } });
  if (!res.ok) throw new Error(`Supabase ${table} GET failed: ${res.status}`);
  return res.json();
}

async function supabasePost(env: Env, table: string, body: unknown) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...supabaseHeaders(env), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${table} POST failed: ${res.status}`);
  return res.json();
}

async function supabasePatch(env: Env, table: string, filter: string, body: unknown) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...supabaseHeaders(env), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${table} PATCH failed: ${res.status}`);
  return res.json();
}

async function supabaseDelete(env: Env, table: string, filter: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: supabaseHeaders(env),
  });
  if (!res.ok) throw new Error(`Supabase ${table} DELETE failed: ${res.status}`);
}

function dtoProduct(p: Record<string, unknown>) {
  return {
    ...p,
    price: Number(p.price),
    compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    verified: Boolean(p.verified),
    featured: Boolean(p.featured),
  };
}

function dtoSupplier(s: Record<string, unknown>) {
  return { ...s, verified: Boolean(s.verified) };
}

async function buildCart(env: Env) {
  const rows = await supabaseGet(env, "marketplace_cart_items", "order=id.asc");
  const products = await supabaseGet(env, "marketplace_products");
  const productMap = new Map(products.map((p: Record<string, unknown>) => [p.id, p]));
  const items = rows.map((item: Record<string, unknown>) => {
    const product = productMap.get(item.product_id) as Record<string, unknown> | undefined;
    if (!product) return null;
    const subtotal = Number(product.price) * Number(item.quantity);
    return {
      productId: product.id,
      product: dtoProduct(product),
      quantity: item.quantity,
      subtotal,
    };
  }).filter(Boolean);
  const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const shipping = items.length > 0 ? 12 : 0;
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  };
}

async function buildOrders(env: Env, supplierOnly = false) {
  const orders = await supabaseGet(env, "marketplace_orders", "order=date.desc");
  const allItems = await supabaseGet(env, "marketplace_order_items");
  let supplierName: string | undefined;
  if (supplierOnly) {
    const suppliers = await supabaseGet(env, "marketplace_suppliers", `id=eq.${env.SUPPLIER_ID || SUPPLIER_ID_DEFAULT}`);
    supplierName = suppliers[0]?.name;
  }
  return orders
    .map((order: Record<string, unknown>) => ({
      ...order,
      date: order.date,
      total: Number(order.total),
      items: allItems
        .filter((item: Record<string, unknown>) =>
          item.order_id === order.id &&
          (!supplierOnly || item.supplier_name === supplierName),
        )
        .map((item: Record<string, unknown>) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          supplierName: item.supplier_name,
        })),
    }))
    .filter((order: any) => !supplierOnly || order.items.length > 0);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const supplierId = Number(env.SUPPLIER_ID || SUPPLIER_ID_DEFAULT);

  // CORS preflight
  if (method === "OPTIONS") return cors();

  // Health check
  if (path === "/api/health") return json({ status: "ok" });

  // GET /api/products
  if (path === "/api/products" && method === "GET") {
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort");
    let query = "";
    const filters: string[] = [];
    if (category) filters.push(`category=eq.${encodeURIComponent(category)}`);
    if (search) {
      filters.push(`or=(name.ilike.*${encodeURIComponent(search)}*,category.ilike.*${encodeURIComponent(search)}*,supplier_name.ilike.*${encodeURIComponent(search)}*)`);
    }
    if (filters.length) query = filters.join("&");
    const sortMap: Record<string, string> = {
      "price-low": "price.asc",
      "price-high": "price.desc",
      "rating": "rating.desc",
    };
    if (sort && sortMap[sort]) query += (query ? "&" : "") + `order=${sortMap[sort]}`;
    else query += (query ? "&" : "") + "order=featured.desc,rating.desc";
    const products = await supabaseGet(env, "marketplace_products", query);
    return json(products.map(dtoProduct));
  }

  // GET /api/products/:id
  const productMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (productMatch && method === "GET") {
    const products = await supabaseGet(env, "marketplace_products", `id=eq.${productMatch[1]}`);
    if (!products.length) return json({ error: "Not found" }, 404);
    return json(dtoProduct(products[0]));
  }

  // GET /api/categories
  if (path === "/api/categories" && method === "GET") {
    const products = await supabaseGet(env, "marketplace_products");
    const counts = new Map<string, number>();
    products.forEach((p: Record<string, unknown>) => counts.set(p.category as string, (counts.get(p.category as string) ?? 0) + 1));
    const categories = [...counts.entries()].map(([name, count]) => ({
      id: name.toLowerCase().replaceAll(" ", "-"),
      name,
      count,
      image: CATEGORY_IMAGES[name] ?? products[0]?.image ?? "",
    }));
    return json(categories);
  }

  // GET /api/marketplace/summary
  if (path === "/api/marketplace/summary" && method === "GET") {
    const [products, suppliers, orders] = await Promise.all([
      supabaseGet(env, "marketplace_products", "select=id"),
      supabaseGet(env, "marketplace_suppliers", "select=location"),
      supabaseGet(env, "marketplace_orders", "select=date"),
    ]);
    const countries = new Set(
      suppliers.map((s: Record<string, unknown>) => (s.location as string).split(",").pop()?.trim()).filter(Boolean),
    );
    const now = new Date();
    const dealsToday = orders.filter((o: Record<string, unknown>) => {
      const d = new Date(o.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;
    return json({ productCount: products.length, supplierCount: suppliers.length, countries: countries.size, dealsToday });
  }

  // GET /api/suppliers
  if (path === "/api/suppliers" && method === "GET") {
    const suppliers = await supabaseGet(env, "marketplace_suppliers", "order=rating.desc");
    return json(suppliers.map(dtoSupplier));
  }

  // Store lookup and creation for Seller Central.
  const sellerStoreMatch = path.match(/^\/api\/stores\/seller\/(\d+)$/);
  if (sellerStoreMatch && method === "GET") {
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${sellerStoreMatch[1]}&limit=1`);
    if (!stores.length) return json({ error: "No store found for this seller" }, 404);
    return json({ store: stores[0] });
  }

  const storeSlugMatch = path.match(/^\/api\/stores\/([^/]+)$/);
  if (storeSlugMatch && method === "GET") {
    const stores = await supabaseGet(env, "stores", `slug=eq.${encodeURIComponent(storeSlugMatch[1])}&limit=1`);
    if (!stores.length) return json({ error: "Store not found" }, 404);
    return json({ store: stores[0] });
  }

  if (path === "/api/stores" && method === "POST") {
    const body = await request.json() as Record<string, unknown>;
    const sellerId = Number(body.sellerId);
    const name = String(body.name || "").trim();
    if (!sellerId || !name) return json({ error: "sellerId and name are required" }, 400);

    const sellers = await supabaseGet(env, "marketplace_users", `id=eq.${sellerId}&role=eq.seller&limit=1`);
    if (!sellers.length) return json({ error: "Only seller accounts can create stores" }, 403);

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `store`;
    const slug = `${baseSlug}-${sellerId}-${Date.now().toString(36)}`;
    const [store] = await supabasePost(env, "stores", {
      seller_id: sellerId,
      name,
      description: body.description || null,
      slug,
      status: "active",
      province: body.province || null,
      commune: body.commune || null,
      zone: body.zone || null,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      business_category: body.category || null,
      operating_hours: body.operatingHours || null,
    });
    return json({ store }, 201);
  }

  // GET /api/stores/:sellerId/storefront - Load storefront config
  const storefrontMatch = path.match(/^\/api\/stores\/(\d+)\/storefront$/);
  if (storefrontMatch && method === "GET") {
    const sellerId = Number(storefrontMatch[1]);
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${sellerId}&select=storefront_config,store_template&limit=1`);
    if (!stores.length) return json({ error: "No store found for this seller" }, 404);
    const config = stores[0].storefront_config;
    return json(config || { sections: [], shopSign: null, template: "showcase", storeId: sellerId });
  }

  // PUT /api/stores/:sellerId/storefront - Save storefront config
  if (storefrontMatch && method === "PUT") {
    const sellerId = Number(storefrontMatch[1]);
    const body = await request.json() as Record<string, unknown>;

    const stores = await supabaseGet(env, "stores", `seller_id=eq.${sellerId}&select=id,storefront_config,store_template&limit=1`);
    if (!stores.length) return json({ error: "No store found for this seller" }, 404);

    const update: Record<string, unknown> = {
      storefront_config: body,
    };
    if (typeof body.template === 'string') update.store_template = body.template;

    await supabasePatch(env, "stores", `id=eq.${stores[0].id}`, update);

    return json({ success: true, config: body });
  }

  // GET /api/cart
  if (path === "/api/cart" && method === "GET") {
    return json(await buildCart(env));
  }

  // POST /api/cart/items
  if (path === "/api/cart/items" && method === "POST") {
    const body = await request.json() as { productId: number; quantity?: number };
    const products = await supabaseGet(env, "marketplace_products", `id=eq.${body.productId}`);
    if (!products.length) return json({ error: "Product not found" }, 404);
    const existing = await supabaseGet(env, "marketplace_cart_items", `product_id=eq.${body.productId}`);
    const quantity = body.quantity ?? 1;
    if (existing.length) {
      await supabasePatch(env, "marketplace_cart_items", `product_id=eq.${body.productId}`, { quantity: existing[0].quantity + quantity });
    } else {
      await supabasePost(env, "marketplace_cart_items", { product_id: body.productId, quantity });
    }
    return json(await buildCart(env));
  }

  // PATCH /api/cart/items/:id
  const cartItemMatch = path.match(/^\/api\/cart\/items\/(\d+)$/);
  if (cartItemMatch && method === "PATCH") {
    const body = await request.json() as { quantity: number };
    await supabasePatch(env, "marketplace_cart_items", `product_id=eq.${cartItemMatch[1]}`, { quantity: body.quantity });
    return json(await buildCart(env));
  }

  // DELETE /api/cart/items/:id
  if (cartItemMatch && method === "DELETE") {
    await supabaseDelete(env, "marketplace_cart_items", `product_id=eq.${cartItemMatch[1]}`);
    return json(await buildCart(env));
  }

  // GET /api/orders
  if (path === "/api/orders" && method === "GET") {
    return json(await buildOrders(env));
  }

  // POST /api/orders
  if (path === "/api/orders" && method === "POST") {
    const body = await request.json() as { destination: string };
    const cart = await buildCart(env);
    if (!cart.items.length) return json({ error: "Cart is empty" }, 400);
    const [order] = await supabasePost(env, "marketplace_orders", {
      total: cart.total,
      item_count: cart.itemCount,
      destination: body.destination,
      status: "processing",
      buyer_name: "Demo buyer",
    });
    await supabasePost(env, "marketplace_order_items",
      cart.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        supplier_name: item.product.supplierName,
      })),
    );
    await supabaseDelete(env, "marketplace_cart_items", "id=not.is.null");
    const allOrders = await buildOrders(env);
    const created = allOrders.find((o: any) => o.id === order.id);
    return json(created, 201);
  }

  // GET /api/supplier/dashboard
  if (path === "/api/supplier/dashboard" && method === "GET") {
    const products = await supabaseGet(env, "marketplace_products", `supplier_id=eq.${supplierId}`);
    const orders = await buildOrders(env, true);
    const revenue = orders.reduce((sum: number, o: any) => sum + o.total, 0);
    const now = new Date();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array.from({ length: 6 }, (_, i) => {
      const bucket = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${bucket.getFullYear()}-${bucket.getMonth()}`;
      const value = orders.filter((o: any) => {
        const d = new Date(o.date);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).reduce((sum: number, o: any) => sum + o.total, 0);
      return { label: monthLabels[bucket.getMonth()], date: key, value: Number(value.toFixed(2)) };
    });
    const pct = (c: number, p: number) => p === 0 ? (c === 0 ? 0 : 100) : Number((((c - p) / p) * 100).toFixed(1));
    const curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
    const curOrders = orders.filter((o: any) => new Date(o.date) >= curStart);
    const prevOrders = orders.filter((o: any) => { const d = new Date(o.date); return d >= prevStart && d < curStart; });
    const curRev = curOrders.reduce((s: number, o: any) => s + o.total, 0);
    const prevRev = prevOrders.reduce((s: number, o: any) => s + o.total, 0);
    return json({
      revenue: Number(revenue.toFixed(2)),
      revenueChange: pct(curRev, prevRev),
      orders: orders.length,
      ordersChange: pct(curOrders.length, prevOrders.length),
      products: products.length,
      lowStock: products.filter((p: Record<string, unknown>) => Number(p.stock) < 250).length,
      recentOrders: orders.slice(0, 4),
      sales,
    });
  }

  // GET /api/supplier/products
  if (path === "/api/supplier/products" && method === "GET") {
    const products = await supabaseGet(env, "marketplace_products", `supplier_id=eq.${supplierId}`);
    return json(products.map(dtoProduct));
  }

  // POST /api/supplier/products
  if (path === "/api/supplier/products" && method === "POST") {
    const body = await request.json() as Record<string, unknown>;
    const suppliers = await supabaseGet(env, "marketplace_suppliers", `id=eq.${supplierId}`);
    const [product] = await supabasePost(env, "marketplace_products", {
      name: body.name,
      category: body.category,
      price: body.price,
      moq: body.moq,
      unit: body.unit,
      description: body.description,
      image: body.image ?? "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=85",
      supplier_id: supplierId,
      supplier_name: suppliers[0]?.name,
      verified: false,
      rating: 0,
      reviews: 0,
      featured: false,
    });
    return json(dtoProduct(product), 201);
  }

  // PATCH /api/supplier/products/:id
  const supplierProductMatch = path.match(/^\/api\/supplier\/products\/(\d+)$/);
  if (supplierProductMatch && method === "PATCH") {
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name) update.name = body.name;
    if (body.price != null) update.price = body.price;
    if (body.moq != null) update.moq = body.moq;
    if (body.stock != null) update.stock = body.stock;
    if (body.description != null) update.description = body.description;
    const [product] = await supabasePatch(env, "marketplace_products", `id=eq.${supplierProductMatch[1]}`, update);
    return json(dtoProduct(product));
  }

  // GET /api/supplier/orders
  if (path === "/api/supplier/orders" && method === "GET") {
    return json(await buildOrders(env, true));
  }

  // PATCH /api/supplier/orders/:id/status
  const supplierOrderMatch = path.match(/^\/api\/supplier\/orders\/(\d+)\/status$/);
  if (supplierOrderMatch && method === "PATCH") {
    const body = await request.json() as { status: string };
    await supabasePatch(env, "marketplace_orders", `id=eq.${supplierOrderMatch[1]}`, { status: body.status });
    const orders = await buildOrders(env, true);
    const updated = orders.find((o: any) => o.id === Number(supplierOrderMatch[1]));
    return json(updated);
  }

  // GET /api/orders/:id
  const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
  if (orderMatch && method === "GET") {
    const orders = await supabaseGet(env, "marketplace_orders", `id=eq.${orderMatch[1]}`);
    if (!orders.length) return json({ error: "Not found" }, 404);
    const items = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${orderMatch[1]}`);
    return json({
      ...orders[0],
      total: Number(orders[0].total),
      items: items.map((i: Record<string, unknown>) => ({
        id: i.id,
        orderId: i.order_id,
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        supplierName: i.supplier_name,
      })),
    });
  }

  // PATCH /api/orders/:id/status
  const orderStatusMatch = path.match(/^\/api\/orders\/(\d+)\/status$/);
  if (orderStatusMatch && method === "PATCH") {
    const body = await request.json() as { status: string };
    await supabasePatch(env, "marketplace_orders", `id=eq.${orderStatusMatch[1]}`, { status: body.status });
    const orders = await buildOrders(env);
    const updated = orders.find((o: any) => o.id === Number(orderStatusMatch[1]));
    return json(updated);
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
