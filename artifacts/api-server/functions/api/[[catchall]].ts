export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPPLIER_ID: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  "Home & Kitchen": "https://picsum.photos/seed/home-kitchen/500/500",
  "Consumer Electronics": "https://picsum.photos/seed/consumer-electronics/500/500",
  "Beauty & Wellness": "https://picsum.photos/seed/beauty-wellness/500/500",
  "Apparel & Accessories": "https://picsum.photos/seed/apparel-accessories/500/500",
  "Office & School": "https://picsum.photos/seed/office-school/500/500",
  "Bags & Luggage": "https://picsum.photos/seed/bags-luggage/500/500",
};

function headers(env: Env) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function sbGet(env: Env, table: string, query?: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers: { ...headers(env), Prefer: "return=representation" } });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>[]>;
}

async function sbPost(env: Env, table: string, body: unknown) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(env), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table}: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>[]>;
}

async function sbPatch(env: Env, table: string, filter: string, body: unknown) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...headers(env), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>[]>;
}

async function sbDelete(env: Env, table: string, filter: string) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: headers(env),
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table}: ${res.status}`);
}

function dtoProduct(p: Record<string, unknown>) {
  return { ...p, price: Number(p.price), compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null, verified: Boolean(p.verified), featured: Boolean(p.featured) };
}

async function buildCart(env: Env) {
  const rows = await sbGet(env, "marketplace_cart_items", "order=id.asc");
  const products = await sbGet(env, "marketplace_products");
  const pMap = new Map(products.map(p => [p.id, p]));
  const items = rows.map(item => {
    const p = pMap.get(item.product_id);
    if (!p) return null;
    return { productId: p.id, product: dtoProduct(p), quantity: item.quantity, subtotal: Number(p.price) * Number(item.quantity) };
  }).filter(Boolean);
  const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);
  const shipping = items.length > 0 ? 12 : 0;
  return { items, subtotal: +subtotal.toFixed(2), shipping, total: +(subtotal + shipping).toFixed(2), itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0) };
}

async function buildOrders(env: Env, supplierOnly = false) {
  const orders = await sbGet(env, "marketplace_orders", "order=date.desc");
  const allItems = await sbGet(env, "marketplace_order_items");
  let supplierName: string | undefined;
  if (supplierOnly) {
    const s = await sbGet(env, "marketplace_suppliers", `id=eq.${env.SUPPLIER_ID || 1}`);
    supplierName = s[0]?.name as string;
  }
  return orders.map(o => ({
    ...o, date: o.date, total: Number(o.total),
    items: allItems
      .filter(i => i.order_id === o.id && (!supplierOnly || i.supplier_name === supplierName))
      .map(i => ({ id: i.id, orderId: i.order_id, productId: i.product_id, productName: i.product_name, quantity: i.quantity, unitPrice: Number(i.unit_price), supplierName: i.supplier_name })),
  })).filter((o: any) => !supplierOnly || o.items.length > 0);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "");
  const method = request.method;
  const sid = Number(env.SUPPLIER_ID || 1);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
    });

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  if (path === "/health") return json({ status: "ok" });

  try {
    // Products
    if (path === "/products" && method === "GET") {
      const cat = url.searchParams.get("category");
      const search = url.searchParams.get("search");
      const sort = url.searchParams.get("sort");
      const f: string[] = [];
      if (cat) f.push(`category=eq.${encodeURIComponent(cat)}`);
      if (search) f.push(`or=(name.ilike.*${encodeURIComponent(search)}*,category.ilike.*${encodeURIComponent(search)}*,supplier_name.ilike.*${encodeURIComponent(search)}*)`);
      let q = f.join("&");
      const sm: Record<string, string> = { "price-low": "price.asc", "price-high": "price.desc", rating: "rating.desc" };
      q += (q ? "&" : "") + (sort && sm[sort] ? `order=${sm[sort]}` : "order=featured.desc,rating.desc");
      return json((await sbGet(env, "marketplace_products", q)).map(dtoProduct));
    }

    const pm = path.match(/^\/products\/(\d+)$/);
    if (pm && method === "GET") {
      const ps = await sbGet(env, "marketplace_products", `id=eq.${pm[1]}`);
      return ps.length ? json(dtoProduct(ps[0])) : json({ error: "Not found" }, 404);
    }

    if (path === "/categories" && method === "GET") {
      const ps = await sbGet(env, "marketplace_products");
      const c = new Map<string, number>();
      ps.forEach(p => c.set(p.category as string, (c.get(p.category as string) ?? 0) + 1));
      return json([...c.entries()].map(([name, count]) => ({ id: name.toLowerCase().replaceAll(" ", "-"), name, count, image: CATEGORY_IMAGES[name] ?? ps[0]?.image ?? "" })));
    }

    if (path === "/marketplace/summary" && method === "GET") {
      const [ps, ss, os] = await Promise.all([sbGet(env, "marketplace_products", "select=id"), sbGet(env, "marketplace_suppliers", "select=location"), sbGet(env, "marketplace_orders", "select=date")]);
      const countries = new Set(ss.map(s => (s.location as string).split(",").pop()?.trim()).filter(Boolean));
      const now = new Date();
      const dt = os.filter(o => { const d = new Date(o.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(); }).length;
      return json({ productCount: ps.length, supplierCount: ss.length, countries: countries.size, dealsToday: dt });
    }

    if (path === "/suppliers" && method === "GET") return json((await sbGet(env, "marketplace_suppliers", "order=rating.desc")).map(s => ({ ...s, verified: Boolean(s.verified) })));

    // Cart
    if (path === "/cart" && method === "GET") return json(await buildCart(env));

    if (path === "/cart/items" && method === "POST") {
      const body = await request.json() as { productId: number; quantity?: number };
      const ps = await sbGet(env, "marketplace_products", `id=eq.${body.productId}`);
      if (!ps.length) return json({ error: "Not found" }, 404);
      const ex = await sbGet(env, "marketplace_cart_items", `product_id=eq.${body.productId}`);
      const qty = body.quantity ?? 1;
      if (ex.length) await sbPatch(env, "marketplace_cart_items", `product_id=eq.${body.productId}`, { quantity: ex[0].quantity + qty });
      else await sbPost(env, "marketplace_cart_items", { product_id: body.productId, quantity: qty });
      return json(await buildCart(env));
    }

    const cim = path.match(/^\/cart\/items\/(\d+)$/);
    if (cim && method === "PATCH") { const b = await request.json() as { quantity: number }; await sbPatch(env, "marketplace_cart_items", `product_id=eq.${cim[1]}`, { quantity: b.quantity }); return json(await buildCart(env)); }
    if (cim && method === "DELETE") { await sbDelete(env, "marketplace_cart_items", `product_id=eq.${cim[1]}`); return json(await buildCart(env)); }

    // Orders
    if (path === "/orders" && method === "GET") return json(await buildOrders(env));

    if (path === "/orders" && method === "POST") {
      const body = await request.json() as { destination: string };
      const cart = await buildCart(env);
      if (!cart.items.length) return json({ error: "Cart is empty" }, 400);
      const [order] = await sbPost(env, "marketplace_orders", { total: cart.total, item_count: cart.itemCount, destination: body.destination, status: "processing", buyer_name: "Demo buyer" });
      await sbPost(env, "marketplace_order_items", cart.items.map((i: any) => ({ order_id: order.id, product_id: i.productId, product_name: i.product.name, quantity: i.quantity, unit_price: i.product.price, supplier_name: i.product.supplierName })));
      await sbDelete(env, "marketplace_cart_items", "id=not.is.null");
      const all = await buildOrders(env);
      return json(all.find((o: any) => o.id === order.id), 201);
    }

    const om = path.match(/^\/orders\/(\d+)$/);
    if (om && method === "GET") { const os = await sbGet(env, "marketplace_orders", `id=eq.${om[1]}`); if (!os.length) return json({ error: "Not found" }, 404); const items = await sbGet(env, "marketplace_order_items", `order_id=eq.${om[1]}`); return json({ ...os[0], total: Number(os[0].total), items: items.map(i => ({ id: i.id, orderId: i.order_id, productId: i.product_id, productName: i.product_name, quantity: i.quantity, unitPrice: Number(i.unit_price), supplierName: i.supplier_name })) }); }

    const osm = path.match(/^\/orders\/(\d+)\/status$/);
    if (osm && method === "PATCH") { const b = await request.json() as { status: string }; await sbPatch(env, "marketplace_orders", `id=eq.${osm[1]}`, { status: b.status }); const os = await buildOrders(env); return json(os.find((o: any) => o.id === Number(osm[1]))); }

    // Supplier
    if (path === "/supplier/dashboard" && method === "GET") {
      const products = await sbGet(env, "marketplace_products", `supplier_id=eq.${sid}`);
      const orders = await buildOrders(env, true);
      const revenue = orders.reduce((s: number, o: any) => s + o.total, 0);
      const now = new Date();
      const ml = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const sales = Array.from({ length: 6 }, (_, i) => {
        const b = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const k = `${b.getFullYear()}-${b.getMonth()}`;
        const v = orders.filter((o: any) => { const d = new Date(o.date); return `${d.getFullYear()}-${d.getMonth()}` === k; }).reduce((s: number, o: any) => s + o.total, 0);
        return { label: ml[b.getMonth()], date: k, value: +v.toFixed(2) };
      });
      const pct = (c: number, p: number) => p === 0 ? (c === 0 ? 0 : 100) : +(((c - p) / p) * 100).toFixed(1);
      const cs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      const ps = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
      const co = orders.filter((o: any) => new Date(o.date) >= cs);
      const po = orders.filter((o: any) => { const d = new Date(o.date); return d >= ps && d < cs; });
      const cr = co.reduce((s: number, o: any) => s + o.total, 0);
      const pr = po.reduce((s: number, o: any) => s + o.total, 0);
      return json({ revenue: +revenue.toFixed(2), revenueChange: pct(cr, pr), orders: orders.length, ordersChange: pct(co.length, po.length), products: products.length, lowStock: products.filter((p) => Number(p.stock) < 250).length, recentOrders: orders.slice(0, 4), sales });
    }

    if (path === "/supplier/products" && method === "GET") return json((await sbGet(env, "marketplace_products", `supplier_id=eq.${sid}`)).map(dtoProduct));

    if (path === "/supplier/products" && method === "POST") {
      const body = await request.json() as Record<string, unknown>;
      const ss = await sbGet(env, "marketplace_suppliers", `id=eq.${sid}`);
      const [p] = await sbPost(env, "marketplace_products", { name: body.name, category: body.category, price: body.price, moq: body.moq, unit: body.unit, description: body.description, image: body.image ?? "https://picsum.photos/seed/new-product/800/800", supplier_id: sid, supplier_name: ss[0]?.name, verified: false, rating: 0, reviews: 0, featured: false });
      return json(dtoProduct(p), 201);
    }

    const spm = path.match(/^\/supplier\/products\/(\d+)$/);
    if (spm && method === "PATCH") {
      const body = await request.json() as Record<string, unknown>;
      const u: Record<string, unknown> = {};
      if (body.name) u.name = body.name;
      if (body.price != null) u.price = body.price;
      if (body.moq != null) u.moq = body.moq;
      if (body.stock != null) u.stock = body.stock;
      if (body.description != null) u.description = body.description;
      const [p] = await sbPatch(env, "marketplace_products", `id=eq.${spm[1]}`, u);
      return json(dtoProduct(p));
    }

    if (path === "/supplier/orders" && method === "GET") return json(await buildOrders(env, true));

    const som = path.match(/^\/supplier\/orders\/(\d+)\/status$/);
    if (som && method === "PATCH") { const b = await request.json() as { status: string }; await sbPatch(env, "marketplace_orders", `id=eq.${som[1]}`, { status: b.status }); const os = await buildOrders(env, true); return json(os.find((o: any) => o.id === Number(som[1]))); }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
};
