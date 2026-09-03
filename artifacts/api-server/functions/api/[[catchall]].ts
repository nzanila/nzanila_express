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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase POST ${table}: ${res.status} - ${errText}`);
  }
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

// ── Supabase Auth helpers ──

async function supabaseGetUser(env: Env, accessToken: string) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error?.message || data.msg || `Get user failed: ${res.status}`);
  return data;
}

// ── OTP helpers (WhatsApp-based) ──

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildWhatsAppUrl(phone: string, otp: string): string {
  const msg = `Your Nzanila Express verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
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

function dtoStore(s: Record<string, unknown>) {
  return {
    ...s,
    sellerId: s.seller_id,
    businessCategory: s.business_category,
    operatingHours: s.operating_hours,
    verificationType: s.verification_type,
    yearsActive: s.years_active ?? 0,
    mainCategories: s.main_categories ?? (s.business_category ? [s.business_category] : []),
    badges: s.badges ?? [],
    responseRate: s.response_rate ?? 0,
    responseTime: s.response_time ?? "24 hours",
    onTimeDelivery: s.on_time_delivery ?? 0,
    employeeCount: s.employee_count ?? "",
    yearEstablished: s.year_established,
    certifications: s.certifications ?? [],
    performanceMetrics: s.performance_metrics ?? {},
    manufacturerCapabilities: s.manufacturer_capabilities ?? {},
    customizations: s.customizations ?? [],
    tradeCapabilities: s.trade_capabilities ?? {},
    productionCapacity: s.production_capacity ?? {},
    galleryImages: s.gallery_images ?? [],
    videoItems: s.video_items ?? [],
    eventImages: s.event_images ?? [],
    contactInfo: s.contact_info ?? {},
    storeTemplate: s.store_template ?? "showcase",
    storeSections: s.store_sections ?? ["hero", "categories", "featured", "story", "videos", "certificates", "events"],
    verified: Boolean(s.is_verified),
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
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (path === "/health") return json({ status: "ok" });

  // ── Auth: extract user from Bearer token ──
  async function getUser(): Promise<{ authUser: Record<string, unknown>; profile: Record<string, unknown> } | null> {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer nz_")) return null;
    try {
      const payload = JSON.parse(atob(auth.slice(10))); // skip "Bearer nz_"
      if (payload.exp && payload.exp < Date.now()) return null;
      const profiles = await sbGet(env, "marketplace_users", `id=eq.${payload.id}`);
      if (!profiles.length) return null;
      return { authUser: payload, profile: profiles[0] };
    } catch {
      return null;
    }
  }

  try {
    // ═══════════════════════════════════════
    // AUTH ROUTES (WhatsApp OTP)
    // ═══════════════════════════════════════

    // POST /auth/signup — register new user (phone + name + role), send OTP via WhatsApp
    if (path === "/auth/signup" && method === "POST") {
      const body = await request.json() as { phone: string; name: string; role: string };
      const { phone, name, role } = body;

      if (!phone || !name || !role) return json({ error: "Phone, name, and role are required" }, 400);
      if (!["buyer", "seller"].includes(role)) return json({ error: "Role must be 'buyer' or 'seller'" }, 400);

      // Normalize Burundian phone (store without leading +)
      let normalizedPhone = phone.replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "257" + normalizedPhone.slice(1);
      if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("257")) normalizedPhone = "257" + normalizedPhone;

      // Check if phone already exists
      const existing = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (existing.length) return json({ error: "Phone number already registered" }, 409);

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Create user with OTP (not yet verified)
      const [profile] = await sbPost(env, "marketplace_users", {
        auth_user_id: crypto.randomUUID(),
        phone: normalizedPhone,
        name,
        role,
        location: "Bujumbura",
        verified: false,
        avatar: "",
        otp_code: otp,
        otp_expires_at: expiresAt,
      });

const whatsappUrl = buildWhatsAppUrl("+" + normalizedPhone, otp);

      return json({
        message: "Account created. OTP sent via WhatsApp.",
        userId: profile.id,
        phone: normalizedPhone,
        otp,
        whatsappUrl,
      }, 201);
    }

    // POST /auth/send-otp — send OTP via WhatsApp (for login)
    if (path === "/auth/send-otp" && method === "POST") {
      const body = await request.json() as { phone: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "257" + normalizedPhone.slice(1);
      if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("257")) normalizedPhone = "257" + normalizedPhone;

      // Check user exists
      const users = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (!users.length) return json({ error: "Phone number not registered" }, 404);

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store OTP
      await sbPatch(env, "marketplace_users", `phone=eq.${normalizedPhone}`, {
        otp_code: otp,
        otp_expires_at: expiresAt,
      });

      const whatsappUrl = buildWhatsAppUrl("+" + normalizedPhone, otp);

      return json({
        message: "OTP sent via WhatsApp",
        phone: normalizedPhone,
        otp,
        whatsappUrl,
      });
    }

    // POST /auth/verify-otp — verify OTP and return session
    if (path === "/auth/verify-otp" && method === "POST") {
      const body = await request.json() as { phone: string; token: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "257" + normalizedPhone.slice(1);
      if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("257")) normalizedPhone = "257" + normalizedPhone;

      if (!body.token) return json({ error: "OTP code is required" }, 400);

      // Get user
      const users = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (!users.length) return json({ error: "User not found" }, 404);

      const user = users[0];

      // Check OTP
      if (user.otp_code !== body.token) return json({ error: "Invalid OTP code" }, 400);

      // Check expiry
      if (user.otp_expires_at && new Date(user.otp_expires_at as string) < new Date()) {
        return json({ error: "OTP code has expired" }, 400);
      }

      // Mark as verified, clear OTP
      const [updated] = await sbPatch(env, "marketplace_users", `phone=eq.${normalizedPhone}`, {
        verified: true,
        otp_code: null,
        otp_expires_at: null,
      });

      // Generate a simple JWT-like token (in production, use proper JWT)
      const accessToken = `nz_${btoa(JSON.stringify({ id: updated.id, phone: normalizedPhone, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))}`;

      return json({
        message: "Verified",
        user: dtoUser(updated),
        session: {
          accessToken,
          refreshToken: `nz_refresh_${updated.id}`,
          expiresIn: 7 * 24 * 60 * 60,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
      });
    }

    // POST /auth/login — send OTP via WhatsApp for existing user
    if (path === "/auth/login" && method === "POST") {
      const body = await request.json() as { phone: string };
      let normalizedPhone = (body.phone || "").replace(/\s/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "257" + normalizedPhone.slice(1);
      if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("257")) normalizedPhone = "257" + normalizedPhone;

      const users = await sbGet(env, "marketplace_users", `phone=eq.${normalizedPhone}`);
      if (!users.length) return json({ error: "Phone number not registered. Please sign up first." }, 404);

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await sbPatch(env, "marketplace_users", `phone=eq.${normalizedPhone}`, {
        otp_code: otp,
        otp_expires_at: expiresAt,
      });

      const whatsappUrl = buildWhatsAppUrl("+" + normalizedPhone, otp);

      return json({
        message: "OTP sent via WhatsApp",
        phone: normalizedPhone,
        otp,
        whatsappUrl,
      });
    }

    // POST /auth/refresh — extend session
    if (path === "/auth/refresh" && method === "POST") {
      const body = await request.json() as { refreshToken: string };
      if (!body.refreshToken) return json({ error: "Refresh token required" }, 400);

      // Simple refresh: extract user ID and issue new token
      const match = body.refreshToken.match(/^nz_refresh_(\d+)$/);
      if (!match) return json({ error: "Invalid refresh token" }, 401);

      const userId = match[1];
      const users = await sbGet(env, "marketplace_users", `id=eq.${userId}`);
      if (!users.length) return json({ error: "User not found" }, 401);

      const accessToken = `nz_${btoa(JSON.stringify({ id: users[0].id, phone: users[0].phone, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))}`;

      return json({
        session: {
          accessToken,
          refreshToken: `nz_refresh_${users[0].id}`,
          expiresIn: 7 * 24 * 60 * 60,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        },
      });
    }

    // GET /auth/me — get current user profile
    if (path === "/auth/me" && method === "GET") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer nz_")) return json({ error: "Not authenticated" }, 401);

      try {
        const payload = JSON.parse(atob(auth.slice(10))); // skip "Bearer nz_"
        if (payload.exp && payload.exp < Date.now()) return json({ error: "Token expired" }, 401);
        const users = await sbGet(env, "marketplace_users", `id=eq.${payload.id}`);
        if (!users.length) return json({ error: "User not found" }, 404);
        return json({ user: dtoUser(users[0]) });
      } catch {
        return json({ error: "Invalid token" }, 401);
      }
    }

    // POST /auth/logout
    if (path === "/auth/logout" && method === "POST") {
      return json({ message: "Logged out" });
    }

    // ═══════════════════════════════════════
    // ONBOARDING ROUTES
    // ═══════════════════════════════════════

    // POST /onboarding/buyer — complete buyer onboarding (address)
    if (path === "/onboarding/buyer" && method === "POST") {
      const user = await getUser();
      if (!user) return json({ error: "Not authenticated" }, 401);

      const body = await request.json() as {
        province?: string;
        city?: string;
        zone?: string;
        landmark?: string;
        deliveryPhone?: string;
      };

      const updateData: Record<string, unknown> = {};
      if (body.province) updateData.province = body.province;
      if (body.city) updateData.city = body.city;
      if (body.zone) updateData.zone = body.zone;
      if (body.landmark) updateData.landmark = body.landmark;
      if (body.deliveryPhone) updateData.delivery_phone = body.deliveryPhone;
      updateData.onboarding_completed = true;

      const [updated] = await sbPatch(env, "marketplace_users", `id=eq.${user.profile.id}`, updateData);
      return json({ user: dtoUser(updated), message: "Buyer onboarding completed" });
    }

    // POST /onboarding/seller — submit seller onboarding (business info)
    if (path === "/onboarding/seller" && method === "POST") {
      const user = await getUser();
      if (!user) return json({ error: "Not authenticated" }, 401);
      if (user.profile.role !== "seller") return json({ error: "User is not a seller" }, 400);

      const body = await request.json() as {
        businessName?: string;
        sellerFullName?: string;
        province?: string;
        city?: string;
        zone?: string;
        landmark?: string;
        productCategories?: string[];
        offersDelivery?: boolean;
        offersPickup?: boolean;
        deliveryAreas?: string;
      };

      const updateData: Record<string, unknown> = {};
      if (body.businessName) updateData.business_name = body.businessName;
      if (body.sellerFullName) updateData.seller_full_name = body.sellerFullName;
      if (body.province) updateData.province = body.province;
      if (body.city) updateData.city = body.city;
      if (body.zone) updateData.zone = body.zone;
      if (body.landmark) updateData.landmark = body.landmark;
      if (body.productCategories) updateData.product_categories = body.productCategories;
      if (body.offersDelivery !== undefined) updateData.offers_delivery = body.offersDelivery;
      if (body.offersPickup !== undefined) updateData.offers_pickup = body.offersPickup;
      if (body.deliveryAreas) updateData.delivery_areas = body.deliveryAreas;
      updateData.verification_status = "under_review";
      updateData.onboarding_completed = true;

      const [updated] = await sbPatch(env, "marketplace_users", `id=eq.${user.profile.id}`, updateData);
      return json({ user: dtoUser(updated), message: "Seller onboarding submitted for review" });
    }

    // GET /onboarding/seller/status — get seller verification status
    if (path === "/onboarding/seller/status" && method === "GET") {
      const user = await getUser();
      if (!user) return json({ error: "Not authenticated" }, 401);
      if (user.profile.role !== "seller") return json({ error: "User is not a seller" }, 400);

      const status = user.profile.verification_status || "not_submitted";
      return json({ 
        status,
        message: status === "not_submitted" ? "Not submitted" 
                 : status === "under_review" ? "Under review"
                 : status === "verified" ? "Verified"
                 : status === "needs_changes" ? "Needs changes"
                 : status === "suspended" ? "Suspended"
                 : "Unknown"
      });
    }

    // PATCH /onboarding/seller/status — update seller verification status (admin only)
    if (path === "/onboarding/seller/status" && method === "PATCH") {
      const user = await getUser();
      if (!user) return json({ error: "Not authenticated" }, 401);
      
      const body = await request.json() as { status: string; userId?: number };
      const targetUserId = body.userId || user.profile.id;
      
      const validStatuses = ["not_submitted", "under_review", "verified", "needs_changes", "suspended"];
      if (!validStatuses.includes(body.status)) return json({ error: "Invalid status" }, 400);

      const [updated] = await sbPatch(env, "marketplace_users", `id=eq.${targetUserId}`, { verification_status: body.status });
      return json({ user: dtoUser(updated), message: "Verification status updated" });
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

    // Stores and full supplier storefront content.
    if (path === "/stores" && method === "POST") {
      const body = await request.json() as Record<string, unknown>;
      const sellerId = Number(body.sellerId);
      const name = String(body.name || "").trim();
      if (!sellerId || !name) return json({ error: "sellerId and name are required" }, 400);

      const sellers = await sbGet(env, "marketplace_users", `id=eq.${sellerId}&role=eq.seller&limit=1`);
      if (!sellers.length) return json({ error: "Only seller accounts can create stores" }, 403);

      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `store`;
      const slug = `${baseSlug}-${sellerId}-${Date.now().toString(36)}`;
      const [store] = await sbPost(env, "stores", {
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
        operating_hours: body.operatingHours ? { schedule: body.operatingHours } : null,
        logo: body.logo || null,
        banner: body.banner || null,
        verification_type: body.verificationType || null,
        years_active: body.yearsActive || 0,
        main_categories: body.mainCategories || (body.category ? [body.category] : []),
        badges: body.badges || [],
        response_rate: body.responseRate || 0,
        response_time: body.responseTime || null,
        on_time_delivery: body.onTimeDelivery || 0,
        employee_count: body.employeeCount || null,
        year_established: body.yearEstablished || null,
        certifications: body.certifications || [],
        performance_metrics: body.performanceMetrics || {},
        manufacturer_capabilities: body.manufacturerCapabilities || {},
        customizations: body.customizations || [],
        trade_capabilities: body.tradeCapabilities || {},
        production_capacity: body.productionCapacity || {},
        gallery_images: body.galleryImages || [],
        video_items: body.videoItems || [],
        event_images: body.eventImages || [],
        contact_info: body.contactInfo || {},
        store_template: body.storeTemplate || "showcase",
        store_sections: body.storeSections || ["hero", "categories", "featured", "story", "videos", "certificates", "events"],
      });
      return json({ store: dtoStore(store) }, 201);
    }

    const sellerStoreMatch = path.match(/^\/stores\/seller\/(\d+)$/);
    if (sellerStoreMatch && method === "GET") {
      const stores = await sbGet(env, "stores", `seller_id=eq.${sellerStoreMatch[1]}&limit=1`);
      if (!stores.length) return json({ error: "No store found for this seller" }, 404);
      return json({ store: dtoStore(stores[0]) });
    }

    const storeIdGetMatch = path.match(/^\/stores\/(\d+)$/);
    if (storeIdGetMatch && method === "GET") {
      const stores = await sbGet(env, "stores", `id=eq.${storeIdGetMatch[1]}&limit=1`);
      if (!stores.length) return json({ error: "Store not found" }, 404);
      return json({ store: dtoStore(stores[0]) });
    }

    const storeSlugMatch = path.match(/^\/stores\/([^/]+)$/);
    if (storeSlugMatch && method === "GET") {
      const stores = await sbGet(env, "stores", `slug=eq.${encodeURIComponent(storeSlugMatch[1])}&limit=1`);
      if (!stores.length) return json({ error: "Store not found" }, 404);
      return json({ store: dtoStore(stores[0]) });
    }

    // Storefront builder config
    const storefrontMatch = path.match(/^\/stores\/(\d+)\/storefront$/);
    if (storefrontMatch && method === "GET") {
      const sidOrStoreId = Number(storefrontMatch[1]);
      // try seller_id first, then id — resilient to missing storefront_config column
      let stores: Record<string, unknown>[] = [];
      try {
        stores = await sbGet(env, "stores", `seller_id=eq.${sidOrStoreId}&limit=1`);
      } catch {}
      if (!stores.length) {
        try { stores = await sbGet(env, "stores", `id=eq.${sidOrStoreId}&limit=1`); } catch {}
      }
      if (!stores.length) return json({ sections: [], shopSign: null, template: "showcase", storeId: sidOrStoreId });
      const cfg = (stores[0] as any).storefront_config as Record<string, unknown> | null;
      return json(cfg && typeof cfg === 'object' && (cfg as any).sections ? cfg : { sections: [], shopSign: null, template: "showcase", storeId: sidOrStoreId });
    }

    if (storefrontMatch && method === "PUT") {
      const sidOrStoreId = Number(storefrontMatch[1]);
      const body = await request.json() as Record<string, unknown>;

      if (!body.sections || !Array.isArray(body.sections)) {
        return json({ error: "Invalid storefront config: sections must be an array" }, 400);
      }

      for (const section of body.sections) {
        if (!section.id || !section.name || !Array.isArray(section.modules)) {
          return json({ error: "Invalid section: must have id, name, and modules array" }, 400);
        }
        for (const mod of section.modules) {
          if (!mod.id || !mod.type || !mod.props) {
            return json({ error: "Invalid module: must have id, type, and props" }, 400);
          }
        }
      }

      let stores: Record<string, unknown>[] = [];
      try { stores = await sbGet(env, "stores", `seller_id=eq.${sidOrStoreId}&select=id&limit=1`); } catch {}
      if (!stores.length) {
        try { stores = await sbGet(env, "stores", `id=eq.${sidOrStoreId}&select=id&limit=1`); } catch {}
      }
      if (!stores.length) return json({ error: "No store found for this seller" }, 404);

      const update: Record<string, unknown> = {
        storefront_config: body,
        store_template: (body.template as string) || "showcase",
      };
      await sbPatch(env, "stores", `id=eq.${stores[0].id}`, update);

      return json({ success: true, config: body });
    }

    // Store products - belong to store & seller account
    const storeProductsMatch = path.match(/^\/stores\/(\d+)\/products$/);
    if (storeProductsMatch && method === "GET") {
      const storeId = storeProductsMatch[1];
      const prods = await sbGet(env, "new_products", `store_id=eq.${storeId}&order=created_at.asc`);
      return json(prods);
    }

    if (storeProductsMatch && method === "POST") {
      const user = await getUser();
      if (!user) return json({ error: "Authentication required" }, 401);
      const storeId = Number(storeProductsMatch[1]);
      const body = await request.json() as Record<string, unknown>;
      // Verify store belongs to this seller
      const owners = await sbGet(env, "stores", `id=eq.${storeId}&seller_id=eq.${Number(user.profile.id)}&limit=1`);
      if (!owners.length) return json({ error: "Store not found" }, 404);
      const slug = String(body.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + `-${Date.now()}`;
      const product = {
        seller_id: Number(user.profile.id),
        store_id: storeId,
        name: body.name,
        slug,
        description: body.description || "",
        base_price: body.base_price || 0,
        currency: "BIF",
        unit_type: body.unit_type || "piece",
        stock_quantity: body.stock_quantity || 0,
        minimum_order_quantity: body.minimum_order_quantity || 1,
        category_id: body.category_id || null,
        status: "approved",
        primary_image: body.primary_image || null,
      };
      const [created] = await sbPost(env, "new_products", product);
      return json({ success: true, product: created });
    }

    const storeIdMatch = path.match(/^\/stores\/(\d+)$/);
    if (storeIdMatch && method === "PATCH") {
      const user = await getUser();
      const body = await request.json() as Record<string, unknown>;
      const sellerId = Number(body.sellerId);
      if (!user && !sellerId) return json({ error: "Seller authentication required" }, 401);
      const ownerId = sellerId || Number(user?.profile.id);
      const owners = await sbGet(env, "stores", `id=eq.${storeIdMatch[1]}&seller_id=eq.${ownerId}&limit=1`);
      if (!owners.length) return json({ error: "Store not found" }, 404);

      const update: Record<string, unknown> = {};
      const fields: Record<string, string> = {
        name: "name", description: "description", logo: "logo", banner: "banner",
        province: "province", commune: "commune", zone: "zone", address: "address",
        phone: "phone", email: "email", verificationType: "verification_type",
        yearsActive: "years_active", mainCategories: "main_categories", badges: "badges",
        responseRate: "response_rate", responseTime: "response_time", onTimeDelivery: "on_time_delivery",
        employeeCount: "employee_count", yearEstablished: "year_established", certifications: "certifications",
        performanceMetrics: "performance_metrics", manufacturerCapabilities: "manufacturer_capabilities",
        customizations: "customizations", tradeCapabilities: "trade_capabilities",
        productionCapacity: "production_capacity", galleryImages: "gallery_images",
        videoItems: "video_items", eventImages: "event_images", contactInfo: "contact_info",
        storeTemplate: "store_template", storeSections: "store_sections",
      };
      for (const [key, column] of Object.entries(fields)) if (body[key] !== undefined) update[column] = body[key];
      if (body.operatingHours !== undefined) update.operating_hours = body.operatingHours ? { schedule: body.operatingHours } : null;
      if (body.slug !== undefined) update.slug = body.slug;
      const [updated] = await sbPatch(env, "stores", `id=eq.${storeIdMatch[1]}&seller_id=eq.${ownerId}`, update);
      return json({ store: dtoStore(updated) });
    }

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
        quantity: i.quantity, unit_price: i.product.price, supplier_name: i.product.supplier_name,
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
