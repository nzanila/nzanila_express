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

// ── Supabase helpers ──

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

// ── Supabase Auth helpers (phone OTP) ──

async function supabaseSignUpPhone(env: Env, phone: string, password: string) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error?.message || data.msg || `Signup failed: ${res.status}`);
  return data;
}

async function supabaseSendOtp(env: Env, phone: string) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, should_create_user: false }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error?.message || data.msg || `OTP send failed: ${res.status}`);
  return data;
}

async function supabaseVerifyOtp(env: Env, phone: string, token: string) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, token, type: "sms" }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error?.message || data.msg || `OTP verify failed: ${res.status}`);
  return data;
}

async function supabaseGetUser(env: Env, accessToken: string) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error?.message || data.msg || `Get user failed: ${res.status}`);
  return data;
}

// ── DTOs ──

function dtoProduct(p: Record<string, unknown>) {
  return { ...p, price: Number(p.price), compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null, verified: Boolean(p.verified), featured: Boolean(p.featured) };
}

function dtoUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    authUserId: u.auth_user_id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    location: u.location,
    verified: Boolean(u.verified),
    avatar: u.avatar,
    createdAt: u.created_at,
  };
}

// ── Cart & Orders ──

async function buildCart(env: Env, userId?: number) {
  const filter = userId ? `user_id=eq.${userId}` : "user_id=is.null";
  const rows = await sbGet(env, "marketplace_cart_items", `order=id.asc&${filter}`);
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

async function buildOrders(env: Env, supplierOnly = false, userId?: number) {
  const userFilter = userId ? `&user_id=eq.${userId}` : "";
  const orders = await sbGet(env, "marketplace_orders", `order=date.desc${userFilter}`);
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

// ── Main handler ──

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "");
  const method = request.method;
  const sid = Number(env.SUPPLIER_ID || 1);

  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (path === "/health") return json({ status: "ok" });

  // ── Auth: extract user from Bearer token ──
  async function getUser(): Promise<{ authUser: Record<string, unknown>; profile: Record<string, unknown> } | null> {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    try {
      const authUser = await supabaseGetUser(env, token);
      if (!authUser.id) return null;
      const profiles = await sbGet(env, "marketplace_users", `auth_user_id=eq.${authUser.id}`);
      return { authUser, profile: profiles[0] ?? null };
    } catch {
      return null;
    }
  }

  try {
    // ═══════════════════════════════════════
    // AUTH ROUTES
    // ═══════════════════════════════════════

    // POST /auth/signup — register new user (phone + name + role)
    if (path === "/auth/signup" && method === "POST") {
      const body = await request.json() as { phone: string; name: string; role: string };
      const { phone, name, role } = body;

      if (!phone || !name || !role) return json({ error: "Phone, name, and role are required" }, 400);
      if (!["buyer", "seller"].includes(role)) return json({ error: "Role must be 'buyer' or 'seller'" }, 400);

      // Normalize Burundian phone: strip leading 0, ensure +257 prefix
      let normalizedPhone = phone.replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "+257" + normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("+")) normalizedPhone = "+257" + normalizedPhone;

      // Check if phone already exists in our users table
      const existing = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (existing.length) return json({ error: "Phone number already registered" }, 409);

      // Create Supabase auth user with phone
      const tempPassword = `nz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const authData = await supabaseSignUpPhone(env, normalizedPhone, tempPassword);

      // Create profile in marketplace_users
      const [profile] = await sbPost(env, "marketplace_users", {
        auth_user_id: authData.id,
        phone: normalizedPhone,
        name,
        role,
        location: "Bujumbura",
        verified: false,
        avatar: "",
      });

      return json({
        message: "Account created. Please verify your phone with the OTP code sent.",
        userId: profile.id,
        phone: normalizedPhone,
        // Return the auth session so frontend can auto-login after OTP
        auth: authData,
      }, 201);
    }

    // POST /auth/send-otp — send OTP to phone (for login)
    if (path === "/auth/send-otp" && method === "POST") {
      const body = await request.json() as { phone: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "+257" + normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("+")) normalizedPhone = "+257" + normalizedPhone;

      // Check user exists
      const users = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (!users.length) return json({ error: "Phone number not registered" }, 404);

      // Send OTP via Supabase Auth
      await supabaseSendOtp(env, normalizedPhone);

      return json({ message: "OTP sent", phone: normalizedPhone });
    }

    // POST /auth/verify-otp — verify OTP and return session
    if (path === "/auth/verify-otp" && method === "POST") {
      const body = await request.json() as { phone: string; token: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "+257" + normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("+")) normalizedPhone = "+257" + normalizedPhone;

      if (!body.token) return json({ error: "OTP code is required" }, 400);

      // Verify OTP with Supabase Auth
      const authData = await supabaseVerifyOtp(env, normalizedPhone, body.token);

      // Get or create profile
      let profiles = await sbGet(env, "marketplace_users", `auth_user_id=eq.${authData.user?.id}`);

      if (!profiles.length) {
        // First time verifying after signup — profile should exist
        // But if not, check by phone
        profiles = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      }

      return json({
        message: "Verified",
        user: profiles.length ? dtoUser(profiles[0]) : null,
        session: {
          accessToken: authData.access_token,
          refreshToken: authData.refresh_token,
          expiresIn: authData.expires_in,
          expiresAt: authData.expires_at,
        },
      });
    }

    // POST /auth/login — send OTP for existing user
    if (path === "/auth/login" && method === "POST") {
      const body = await request.json() as { phone: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "+257" + normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("+")) normalizedPhone = "+257" + normalizedPhone;

      const users = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (!users.length) return json({ error: "Phone number not registered. Please sign up first." }, 404);

      // Send OTP
      await supabaseSendOtp(env, normalizedPhone);

      return json({ message: "OTP sent", phone: normalizedPhone });
    }

    // POST /auth/refresh — refresh access token
    if (path === "/auth/refresh" && method === "POST") {
      const body = await request.json() as { refreshToken: string };
      if (!body.refreshToken) return json({ error: "Refresh token required" }, 400);

      const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: body.refreshToken }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) return json({ error: "Invalid refresh token" }, 401);

      return json({
        session: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          expiresAt: data.expires_at,
        },
      });
    }

    // GET /auth/me — get current user profile
    if (path === "/auth/me" && method === "GET") {
      const user = await getUser();
      if (!user) return json({ error: "Not authenticated" }, 401);
      if (!user.profile) return json({ error: "Profile not found" }, 404);
      return json({ user: dtoUser(user.profile) });
    }

    // POST /auth/logout
    if (path === "/auth/logout" && method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth?.startsWith("Bearer ")) {
        try {
          await fetch(`${env.SUPABASE_URL}/auth/v1/logout`, {
            method: "POST",
            headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
          });
        } catch { /* ignore */ }
      }
      return json({ message: "Logged out" });
    }

    // ═══════════════════════════════════════
    // PUBLIC ROUTES
    // ═══════════════════════════════════════

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

    // ═══════════════════════════════════════
    // AUTHENTICATED ROUTES — Cart
    // ═══════════════════════════════════════

    if (path === "/cart" && method === "GET") {
      const user = await getUser();
      return json(await buildCart(env, user?.profile?.id as number | undefined));
    }

    if (path === "/cart/items" && method === "POST") {
      const user = await getUser();
      const body = await request.json() as { productId: number; quantity?: number };
      const ps = await sbGet(env, "marketplace_products", `id=eq.${body.productId}`);
      if (!ps.length) return json({ error: "Not found" }, 404);
      const uid = user?.profile?.id as number | undefined;
      const filter = uid ? `product_id=eq.${body.productId}&user_id=eq.${uid}` : `product_id=eq.${body.productId}&user_id=is.null`;
      const ex = await sbGet(env, "marketplace_cart_items", filter);
      const qty = body.quantity ?? 1;
      const updateFilter = ex.length ? `id=eq.${ex[0].id}` : "";
      if (ex.length) await sbPatch(env, "marketplace_cart_items", updateFilter, { quantity: (ex[0].quantity as number) + qty });
      else await sbPost(env, "marketplace_cart_items", { product_id: body.productId, quantity: qty, user_id: uid ?? null });
      return json(await buildCart(env, uid));
    }

    const cim = path.match(/^\/cart\/items\/(\d+)$/);
    if (cim && method === "PATCH") {
      const user = await getUser();
      const uid = user?.profile?.id as number | undefined;
      const b = await request.json() as { quantity: number };
      const filter = uid ? `id=eq.${cim[1]}&user_id=eq.${uid}` : `id=eq.${cim[1]}&user_id=is.null`;
      await sbPatch(env, "marketplace_cart_items", filter, { quantity: b.quantity });
      return json(await buildCart(env, uid));
    }
    if (cim && method === "DELETE") {
      const user = await getUser();
      const uid = user?.profile?.id as number | undefined;
      const filter = uid ? `id=eq.${cim[1]}&user_id=eq.${uid}` : `id=eq.${cim[1]}&user_id=is.null`;
      await sbDelete(env, "marketplace_cart_items", filter);
      return json(await buildCart(env, uid));
    }

    // ═══════════════════════════════════════
    // AUTHENTICATED ROUTES — Orders
    // ═══════════════════════════════════════

    if (path === "/orders" && method === "GET") {
      const user = await getUser();
      return json(await buildOrders(env, false, user?.profile?.id as number | undefined));
    }

    if (path === "/orders" && method === "POST") {
      const user = await getUser();
      const body = await request.json() as { destination: string };
      const uid = user?.profile?.id as number | undefined;
      const cart = await buildCart(env, uid);
      if (!cart.items.length) return json({ error: "Cart is empty" }, 400);
      const buyerName = user?.profile?.name || "Demo buyer";
      const [order] = await sbPost(env, "marketplace_orders", {
        total: cart.total, item_count: cart.itemCount, destination: body.destination,
        status: "processing", buyer_name: buyerName, user_id: uid ?? null,
      });
      await sbPost(env, "marketplace_order_items", cart.items.map((i: any) => ({
        order_id: order.id, product_id: i.productId, product_name: i.product.name,
        quantity: i.quantity, unit_price: i.product.price, supplier_name: i.product.supplierName,
      })));
      await sbDelete(env, "marketplace_cart_items", uid ? `user_id=eq.${uid}` : "user_id=is.null");
      const all = await buildOrders(env, false, uid);
      return json(all.find((o: any) => o.id === order.id), 201);
    }

    const om = path.match(/^\/orders\/(\d+)$/);
    if (om && method === "GET") {
      const os = await sbGet(env, "marketplace_orders", `id=eq.${om[1]}`);
      if (!os.length) return json({ error: "Not found" }, 404);
      const items = await sbGet(env, "marketplace_order_items", `order_id=eq.${om[1]}`);
      return json({ ...os[0], total: Number(os[0].total), items: items.map(i => ({ id: i.id, orderId: i.order_id, productId: i.product_id, productName: i.product_name, quantity: i.quantity, unitPrice: Number(i.unit_price), supplierName: i.supplier_name })) });
    }

    const osm = path.match(/^\/orders\/(\d+)\/status$/);
    if (osm && method === "PATCH") { const b = await request.json() as { status: string }; await sbPatch(env, "marketplace_orders", `id=eq.${osm[1]}`, { status: b.status }); const os = await buildOrders(env); return json(os.find((o: any) => o.id === Number(osm[1]))); }

    // ═══════════════════════════════════════
    // SUPPLIER ROUTES
    // ═══════════════════════════════════════

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
  } catch (err: any) {
    console.error("API error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
};
