import { researchChat } from "./ai-research";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPPLIER_ID: string;
  GROQ_API_KEY?: string;
  AI?: Ai;
}

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

async function buildCart(env: Env) {
  const rows = await supabaseGet(env, "marketplace_cart_items", "order=id.asc");
  const allProductIds = [...new Set(rows.map((r: Record<string, unknown>) => Number(r.product_id)).filter(Boolean))];
  const sourceIds = allProductIds.filter(id => id >= 1000000).map(id => id - 1000000);
  const newProducts = sourceIds.length
    ? await supabaseGet(env, "new_products", `id=in.(${sourceIds.join(",")})`) as Record<string, unknown>[]
    : [];
  const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
  const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
  const newMap = new Map(newProducts.map((p: Record<string, unknown>) => [1000000 + Number(p.id), p]));
  const storeIds = [...new Set(newProducts.map(p => Number(p.store_id)).filter(Boolean))];
  const stores = storeIds.length
    ? await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name,slug,seller_id,is_verified`) as Record<string, unknown>[]
    : [];
  const storesById = new Map(stores.map(s => [Number(s.id), s]));
  const items = rows.map((item: Record<string, unknown>) => {
    const pid = Number(item.product_id);
    const newP = newMap.get(pid);
    if (!newP) return null;
    const store = storesById.get(Number(newP.store_id));
    const categoryName = catNameById.get(Number(newP.category_id)) || String(newP.custom_category_suggestion || "Other");
    const product = {
      id: pid,
      name: newP.name,
      category: categoryName,
      price: newP.base_price,
      image: newP.primary_image || "",
      supplier_name: String(store?.name || "").trim(),
      supplierName: String(store?.name || "").trim(),
      moq: newP.minimum_order_quantity || 1,
      stock: newP.stock_quantity || 0,
      unit: newP.unit_type || "piece",
      storeSlug: store?.slug || null,
      storeId: Number(newP.store_id || 0),
      supplierId: Number(store?.seller_id || newP.seller_id || 0),
      verified: Boolean(store?.is_verified),
    };
    const subtotal = Number(product.price) * Number(item.quantity);
    return { productId: pid, product, quantity: item.quantity, subtotal };
  }).filter(Boolean);
  const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const shipping = 0;
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  };
}

function authPayload(request: Request): { id?: number } | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer nz_")) return null;
  try { return JSON.parse(atob(header.slice(10))); } catch { return null; }
}

async function requireSeller(request: Request, env: Env, sellerId: number): Promise<Response | null> {
  const payload = authPayload(request);
  if (!payload?.id || payload.id !== sellerId) return json({ error: "Only the store owner can access this resource" }, 403);
  const sellers = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&role=eq.seller&select=id&limit=1`) as Record<string, unknown>[];
  if (!sellers.length) return json({ error: "Seller account required" }, 403);
  return null;
}

type BuyerIdentity = { id: number; name: string; token: string; role: string };

async function buyerIdentityForRequest(request: Request, env: Env): Promise<BuyerIdentity | undefined> {
  const payload = authPayload(request);
  if (!payload?.id) return undefined;
  const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`);
  if (!users[0]) return undefined;
  const name = String(users[0].name || "Buyer");
  return { id: Number(payload.id), name, token: `user:${Number(payload.id)}:${name}`, role: String(users[0].role || "buyer") };
}

function displayBuyerName(raw: unknown) {
  const value = String(raw || "");
  return value.startsWith("user:") ? value.split(":").slice(2).join(":") || "Buyer" : value;
}

async function createNotification(env: Env, userId: number | null | undefined, type: string, title: string, body: string, link: string, metadata: Record<string, unknown>) {
  if (!userId) return;
  try {
    await supabasePost(env, "notifications", {
      user_id: userId,
      type,
      title,
      body,
      link,
      metadata: JSON.stringify(metadata),
    });
  } catch (error) {
    console.error("Notification create failed:", error);
  }
}

async function buildOrders(env: Env, supplierOnly = false, buyer?: BuyerIdentity, storeName?: string) {
  const query = buyer
    ? `buyer_name=eq.${encodeURIComponent(buyer.token)}&order=date.desc`
    : "order=date.desc";
  const orders = await supabaseGet(env, "marketplace_orders", query);
  const allItems = await supabaseGet(env, "marketplace_order_items");
  return orders
    .map((order: Record<string, unknown>) => {
      const items = allItems
        .filter((item: Record<string, unknown>) =>
          item.order_id === order.id &&
          (!supplierOnly || item.supplier_name === storeName),
        )
        .map((item: Record<string, unknown>) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          supplierName: item.supplier_name,
        }));
      return {
      ...order,
      buyerName: displayBuyerName(order.buyer_name),
      buyerId: String(order.buyer_name || "").startsWith("user:") ? Number(String(order.buyer_name).split(":")[1]) : null,
      date: order.date,
      total: Number(order.total),
      itemCount: items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
      items,
    }; })
    .filter((order: any) => order.items.length > 0);
}

// Stock is reserved when an order is created and returned exactly once when
// that order changes from an active state to cancelled.
async function adjustOrderStock(env: Env, orderId: number, direction: 1 | -1) {
  const items = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${orderId}`) as Record<string, unknown>[];
  for (const item of items) {
    const productId = Number(item.product_id);
    const sourceId = productId >= 1000000 ? productId - 1000000 : productId;
    if (!sourceId) continue;
    const products = await supabaseGet(env, "new_products", `id=eq.${sourceId}&select=stock_quantity&limit=1`) as Record<string, unknown>[];
    if (!products.length) continue;
    const current = Number(products[0].stock_quantity || 0);
    const quantity = Number(item.quantity || 0);
    await supabasePatch(env, "new_products", `id=eq.${sourceId}`, { stock_quantity: Math.max(0, current + direction * quantity) });
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// ── Auth helpers (Web Crypto, Worker-compatible) ──

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const saltHex = [...salt].map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const computedHex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

function normalizeAuthPhone(phone: string): string {
  let normalized = phone.replace(/\s/g, "");
  if (normalized.startsWith("+")) normalized = normalized.slice(1);
  if (normalized.startsWith("0")) normalized = "257" + normalized.slice(1);
  if (!normalized.startsWith("257")) normalized = "257" + normalized;
  if (normalized.startsWith("2570")) normalized = "257" + normalized.slice(4);
  return normalized;
}

function isBurundianPhone(phone: string): boolean {
  const raw = phone.replace(/\s/g, "");
  return !raw.startsWith("+250") && !raw.startsWith("250");
}

function createAuthSession(userId: number, phone: string) {
  const accessToken = `nz_${btoa(JSON.stringify({ id: userId, phone, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))}`;
  return {
    accessToken,
    refreshToken: `nz_refresh_${userId}`,
    expiresIn: 7 * 24 * 60 * 60,
    expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
}

function dtoAuthUser(u: Record<string, unknown>) {
  return {
    id: u.id,
    authUserId: u.auth_user_id || u.authUserId,
    phone: u.phone,
    name: u.name,
    role: u.role,
    location: u.location,
    verified: Boolean(u.verified),
    avatar: u.avatar,
    preferredLanguage: u.preferred_language || u.preferredLanguage,
    province: u.province,
    city: u.city,
    zone: u.zone,
    landmark: u.landmark,
    deliveryPhone: u.delivery_phone || u.deliveryPhone,
    businessName: u.business_name || u.businessName,
    sellerFullName: u.seller_full_name || u.sellerFullName,
    productCategories: u.product_categories || u.productCategories,
    offersDelivery: u.offers_delivery !== undefined ? u.offers_delivery : u.offersDelivery,
    offersPickup: u.offers_pickup !== undefined ? u.offers_pickup : u.offersPickup,
    deliveryAreas: u.delivery_areas || u.deliveryAreas,
    verificationStatus: u.verification_status || u.verificationStatus,
    onboardingCompleted: u.onboarding_completed !== undefined ? u.onboarding_completed : u.onboardingCompleted,
    profilePicture: u.profile_picture || u.profilePicture,
    businessDescription: u.business_description || u.businessDescription,
    openingHours: u.opening_hours || u.openingHours,
    deliveryFeeStructure: u.delivery_fee_structure || u.deliveryFeeStructure,
    shopLatitude: u.shop_latitude || u.shopLatitude,
    shopLongitude: u.shop_longitude || u.shopLongitude,
    shopLocationApproximate: u.shop_location_approximate !== undefined ? u.shop_location_approximate : u.shopLocationApproximate,
    shopAddress: u.shop_address || u.shopAddress,
    shopDirections: u.shop_directions || u.shopDirections,
    shopPhone: u.shop_phone || u.shopPhone,
    meetAtPublicLandmark: u.meet_at_public_landmark !== undefined ? u.meet_at_public_landmark : u.meetAtPublicLandmark,
    addressName: u.address_name || u.addressName,
    directions: u.directions,
    latitude: u.latitude,
    longitude: u.longitude,
    approximateAddress: u.approximate_address || u.approximateAddress,
    idDocumentUrl: u.id_document_url || u.idDocumentUrl,
    idDocumentType: u.id_document_type || u.idDocumentType,
    idDocumentName: u.id_document_name || u.idDocumentName,
    verificationSubmittedAt: u.verification_submitted_at || u.verificationSubmittedAt,
    createdAt: u.created_at || u.createdAt,
  };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  // CORS preflight
  if (method === "OPTIONS") return cors();

  // ── Auth routes ──

  if (path === "/api/auth/signup" && method === "POST") {
    try {
      const body = await request.json() as { phone?: string; name?: string; role?: string; password?: string };
      if (!body.name || !body.role || !body.password || !body.phone) {
        return json({ error: "Name, role, and password are required" }, 400);
      }
      if (body.phone && !isBurundianPhone(body.phone)) return json({ error: "Only Burundian phone numbers are supported" }, 400);
      if (!["buyer", "seller"].includes(body.role)) {
        return json({ error: "Role must be 'buyer' or 'seller'" }, 400);
      }
      if (body.password.length < 6) {
        return json({ error: "Password must be at least 6 characters" }, 400);
      }
      const normalizedPhone = typeof body.phone === "string" && /\d/.test(body.phone)
        ? normalizeAuthPhone(body.phone)
        : `user_${crypto.randomUUID()}`;
      const existing = await supabaseGet(env, "marketplace_users", `phone=eq.${encodeURIComponent(normalizedPhone)}&limit=1`) as Record<string, unknown>[];
      if (existing.length) {
        return json({ error: "Phone number already registered" }, 409);
      }
      const passwordHash = await hashPassword(body.password);
      const [profile] = await supabasePost(env, "marketplace_users", {
        auth_user_id: crypto.randomUUID(),
        phone: normalizedPhone,
        name: body.name,
        role: body.role,
        location: "Bujumbura",
        verified: false,
        avatar: "",
        password_hash: passwordHash,
      });
      const session = createAuthSession(profile.id, normalizedPhone);
      return json({ message: "Account created successfully", user: dtoAuthUser(profile), session }, 201);
    } catch (error) {
      console.error("Signup error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  }

  if (path === "/api/auth/login" && method === "POST") {
    try {
      const body = await request.json() as { phone?: string; password?: string };
      if (!body.phone || !body.password) {
        return json({ error: "Phone and password are required" }, 400);
      }
      if (!isBurundianPhone(body.phone)) return json({ error: "Only Burundian phone numbers are supported" }, 400);
      const normalizedPhone = normalizeAuthPhone(body.phone);
      const users = await supabaseGet(env, "marketplace_users", `phone=eq.${encodeURIComponent(normalizedPhone)}&limit=1`) as Record<string, unknown>[];
      if (!users.length) {
        return json({ error: "Phone number not registered" }, 404);
      }
      const user = users[0];
      const passwordHash = user.password_hash || user.passwordHash;
      if (!passwordHash) {
        return json({ error: "Account was created without a password. Please reset your password." }, 400);
      }
      if (!(await verifyPassword(body.password, passwordHash as string))) {
        return json({ error: "Invalid password" }, 401);
      }
      const session = createAuthSession(user.id, normalizedPhone);
      return json({ message: "Login successful", user: dtoAuthUser(user), session });
    } catch (error) {
      console.error("Login error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  }

  if (path === "/api/auth/refresh" && method === "POST") {
    try {
      const body = await request.json() as { refreshToken?: string };
      if (!body.refreshToken) {
        return json({ error: "Refresh token required" }, 400);
      }
      const match = body.refreshToken.match(/^nz_refresh_(\d+)$/);
      if (!match) {
        return json({ error: "Invalid refresh token" }, 401);
      }
      const userId = parseInt(match[1]);
      const users = await supabaseGet(env, "marketplace_users", `id=eq.${userId}&limit=1`) as Record<string, unknown>[];
      if (!users.length) {
        return json({ error: "User not found" }, 401);
      }
      const session = createAuthSession(userId, users[0].phone as string);
      return json({ session });
    } catch (error) {
      console.error("Refresh error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  }

  if (path === "/api/auth/me" && method === "GET") {
    try {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer nz_")) {
        return json({ error: "Not authenticated" }, 401);
      }
      const payload = JSON.parse(atob(auth.slice(10)));
      if (payload.exp && payload.exp < Date.now()) {
        return json({ error: "Token expired" }, 401);
      }
      const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
      if (!users.length) {
        return json({ error: "User not found" }, 404);
      }
      return json({ user: dtoAuthUser(users[0]) });
    } catch {
      return json({ error: "Invalid token" }, 401);
    }
  }

  if (path === "/api/auth/logout" && method === "POST") {
    return json({ message: "Logged out" });
  }

  const sellerProfileMatch = path.match(/^\/api\/sellers\/(\d+)\/profile$/);
  if (sellerProfileMatch && method === "PUT") {
    const sellerId = Number(sellerProfileMatch[1]);
    const denied = await requireSeller(request, env, sellerId);
    if (denied) return denied;
    const body = await request.json() as Record<string, unknown>;
    const update = {
      name: typeof body.name === "string" ? body.name : undefined,
      business_name: typeof body.business_name === "string" ? body.business_name : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      business_description: typeof body.business_description === "string" ? body.business_description : undefined,
      profile_picture: typeof body.profile_picture === "string" ? body.profile_picture : undefined,
    };
    const [profile] = await supabasePatch(env, "marketplace_users", `id=eq.${sellerId}`, update) as Record<string, unknown>[];
    if (!profile) return json({ error: "Seller not found" }, 404);
    return json({ profile: dtoAuthUser(profile) });
  }

  if (path === "/api/profiles/onboarding/buyer" && method === "POST") {
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer nz_")) return json({ error: "Not authenticated" }, 401);
      const payload = JSON.parse(atob(authorization.slice(10))) as { id?: number; exp?: number };
      if (!payload.id || (payload.exp && payload.exp < Date.now())) return json({ error: "Invalid or expired token" }, 401);
      const body = await request.json() as Record<string, unknown>;
      if (typeof body.deliveryPhone === "string" && body.deliveryPhone && !isBurundianPhone(body.deliveryPhone)) return json({ error: "Only Burundian phone numbers are supported" }, 400);
      const update = {
        name: body.name,
        province: body.province,
        city: body.city,
        zone: body.zone,
        landmark: body.landmark,
        delivery_phone: body.deliveryPhone,
        preferred_language: body.preferredLanguage,
        latitude: body.latitude,
        longitude: body.longitude,
        address_name: body.addressName,
        approximate_address: body.approximateAddress,
        directions: body.directions,
        meet_at_public_landmark: body.meetAtPublicLandmark,
        onboarding_completed: true,
      };
      const [profile] = await supabasePatch(env, "marketplace_users", `id=eq.${payload.id}`, update) as Record<string, unknown>[];
      if (!profile) return json({ error: "User not found" }, 404);
      return json({ user: dtoAuthUser(profile) });
    } catch (error) {
      console.error("Buyer onboarding error:", error);
      return json({ error: "Could not save buyer onboarding" }, 500);
    }
  }

  if (path === "/api/auth/password" && method === "PATCH") {
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer nz_")) return json({ error: "Not authenticated" }, 401);
      const payload = JSON.parse(atob(authorization.slice(10))) as { id?: number };
      const body = await request.json() as { currentPassword?: string; newPassword?: string };
      if (!payload.id || !body.currentPassword || !body.newPassword || body.newPassword.length < 6) return json({ error: "Current and new passwords are required" }, 400);
      const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
      if (!users.length || !(await verifyPassword(body.currentPassword, String(users[0].password_hash || '')))) return json({ error: "Current password is incorrect" }, 401);
      await supabasePatch(env, "marketplace_users", `id=eq.${payload.id}`, { password_hash: await hashPassword(body.newPassword) });
      return json({ message: "Password updated" });
    } catch { return json({ error: "Could not update password" }, 500); }
  }

  if (path === "/api/profiles/account" && method === "DELETE") {
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer nz_")) return json({ error: "Not authenticated" }, 401);
      const payload = JSON.parse(atob(authorization.slice(10))) as { id?: number };
      if (!payload.id) return json({ error: "Invalid token" }, 401);
      await supabaseDelete(env, "marketplace_users", `id=eq.${payload.id}`);
      return json({ message: "Account deleted" });
    } catch { return json({ error: "Could not delete account" }, 500); }
  }

  if (path === "/api/ai/research" && method === "POST") {
    if (!env.GROQ_API_KEY && !env.AI) return json({ error: "AI research is not configured yet" }, 503);
    return researchChat(request, env.GROQ_API_KEY, env.AI, async () => {
      const products = await supabaseGet(env, "new_products", "store_id=not.is.null") as Record<string, unknown>[];
      const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
      const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
      const storeIds = [...new Set(products.map(p => Number(p.store_id)).filter(Boolean))];
      const stores = storeIds.length
        ? await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name`) as Record<string, unknown>[]
        : [];
      const storesById = new Map(stores.map(s => [Number(s.id), s]));
      return products.map(p => {
        const store = storesById.get(Number(p.store_id));
        return {
          id: 1000000 + Number(p.id),
          name: String(p.name || ""),
          category: String(catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other"),
          price: Number(p.base_price || 0),
          moq: Number(p.minimum_order_quantity || 1),
          stock: Number(p.stock_quantity || 0),
          supplierName: String(store?.name || "").trim(),
          verified: Boolean(store?.is_verified),
          shipping: p.delivery_available === false ? "Pickup available" : "Seller delivery available",
          featured: false,
        };
      });
    });
  }

  // Health check
  if (path === "/api/health") return json({ status: "ok" });

  // GET /api/products
  if (path === "/api/products" && method === "GET") {
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort");
    const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
    const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
    const catIdByName = new Map(catRows.map(c => [String(c.name || "").toLowerCase(), Number(c.id)]));
    const filters: string[] = ["store_id=not.is.null"];
    if (category) {
      const catId = catIdByName.get(category.toLowerCase());
      if (catId) filters.push(`category_id=eq.${catId}`);
      else filters.push(`custom_category_suggestion=eq.${encodeURIComponent(category)}`);
    }
    if (search) filters.push(`name.ilike.*${encodeURIComponent(search)}*`);
    const sortMap: Record<string, string> = {
      "price-low": "base_price.asc",
      "price-high": "base_price.desc",
      "rating": "rating.desc",
    };
    if (sort && sortMap[sort]) filters.push(`order=${sortMap[sort]}`);
    else filters.push("order=created_at.desc");
    const newProducts = await supabaseGet(env, "new_products", filters.join("&")) as Record<string, unknown>[];
    const storeIds = [...new Set(newProducts.map(p => Number(p.store_id)).filter(Boolean))];
    const stores = storeIds.length
      ? await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name,slug,seller_id,is_verified`) as Record<string, unknown>[]
      : [];
    const storesById = new Map(stores.map(s => [Number(s.id), s]));
    const newProductIds = newProducts.map(p => Number(p.id));
    const pictures = newProductIds.length
      ? await supabaseGet(env, "new_product_pictures", `product_id=in.(${newProductIds.join(",")})&select=product_id,picture_url,is_primary&order=is_primary.desc`) as Record<string, unknown>[]
      : [];
    const imagesByProduct = new Map<number, string>();
    for (const pic of pictures) {
      const pid = Number(pic.product_id);
      if (!imagesByProduct.has(pid) && pic.picture_url) imagesByProduct.set(pid, String(pic.picture_url));
    }
    const allProducts = newProducts.map((p: Record<string, unknown>) => {
      const store = storesById.get(Number(p.store_id));
      const image = imagesByProduct.get(Number(p.id)) || String(p.primary_image || "");
      return {
        id: 1000000 + Number(p.id),
        source_product_id: Number(p.id),
        name: String(p.name || ""),
        category: String(catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other"),
        price: Number(p.base_price || 0),
        compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
        moq: Number(p.minimum_order_quantity || 1),
        rating: Number(p.rating || 0),
        reviews: Number(p.review_count || 0),
        stock: Number(p.stock_quantity || 0),
        totalSales: Number(p.total_sales || 0),
        image,
        images: image ? [image] : [],
        supplier_id: Number(p.seller_id || 0),
        supplier_name: String(store?.name || `Seller ${p.seller_id || ""}`).trim(),
        supplierName: String(store?.name || `Seller ${p.seller_id || ""}`).trim(),
        storeSlug: store?.slug || null,
        verified: Boolean(store?.is_verified),
        unit: String(p.unit_type || "piece"),
        description: String(p.description || ""),
        shipping: p.delivery_available === false ? "Pickup available" : "Seller delivery available",
        deliveryAvailable: p.delivery_available === true,
        pickupAvailable: p.pickup_available === true,
        featured: false,
        store_id: Number(p.store_id),
      };
    });
    return json(allProducts);
  }

  // GET /api/products/:id
  const productMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (productMatch && method === "GET") {
    const requestedId = Number(productMatch[1]);
    const sourceId = requestedId >= 1000000 ? requestedId - 1000000 : requestedId;
    const products = await supabaseGet(env, "new_products", `id=eq.${sourceId}&limit=1`) as Record<string, unknown>[];
    if (!products.length) return json({ error: "Not found" }, 404);
    const p = products[0];
    const store = await supabaseGet(env, "stores", `id=eq.${p.store_id}&select=id,name,slug,seller_id,is_verified,commune,province,business_category&limit=1`) as Record<string, unknown>[];
    const pictures = await supabaseGet(env, "new_product_pictures", `product_id=eq.${sourceId}&select=picture_url,is_primary&order=is_primary.desc`) as Record<string, unknown>[];
    const image = pictures[0]?.picture_url || String(p.primary_image || "");
    const storeRow = store[0];
    const catRows = await supabaseGet(env, "categories", `id=eq.${p.category_id}&select=name&limit=1`) as Record<string, unknown>[];
    const categoryName = String(catRows[0]?.name || p.custom_category_suggestion || "Other");
    const storeProducts = await supabaseGet(env, "new_products", `store_id=eq.${p.store_id}&select=id`) as Record<string, unknown>[];
    const storeName = String(storeRow?.name || `Seller ${p.seller_id || ""}`).trim();
    const commune = String(storeRow?.commune || "").trim();
    const province = String(storeRow?.province || "").trim();
    const address = String(storeRow?.location_address || "").trim();
    const lat = storeRow?.latitude != null ? Number(storeRow.latitude) : null;
    const lng = storeRow?.longitude != null ? Number(storeRow.longitude) : null;
    const parts = [address, commune, province].filter(Boolean);
    const storeLocation = parts.length ? parts.join(", ") : "Burundi";
    const mapQuery = lat != null && lng != null
      ? `${lat},${lng}`
      : storeLocation;
    return json({
      id: 1000000 + sourceId,
      source_product_id: sourceId,
      name: String(p.name || ""),
      category: categoryName,
      price: Number(p.base_price || 0),
      compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
      moq: Number(p.minimum_order_quantity || 1),
      rating: Number(p.rating || 0),
      reviews: Number(p.review_count || 0),
      stock: Number(p.stock_quantity || 0),
      totalSales: Number(p.total_sales || 0),
      image,
      images: pictures.map(pic => String(pic.picture_url || "")).filter(Boolean),
      supplier_id: Number(p.seller_id || 0),
      supplier_name: storeName,
      supplierName: storeName,
      storeSlug: storeRow?.slug || null,
      verified: Boolean(storeRow?.is_verified),
      storeLocation,
      storeLatitude: lat,
      storeLongitude: lng,
      storeProductCount: storeProducts.length,
      unit: String(p.unit_type || "piece"),
      description: String(p.description || ""),
      shipping: p.delivery_available === false ? "Pickup available" : "Seller delivery available",
      deliveryAvailable: p.delivery_available === true,
      pickupAvailable: p.pickup_available === true,
      deliveryAreas: Array.isArray(p.delivery_areas) ? p.delivery_areas : [],
      featured: false,
      store_id: Number(p.store_id),
      storeDirections: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
    });
  }

  // GET /api/categories
  if (path === "/api/categories" && method === "GET") {
    const [newProducts, catRows] = await Promise.all([
      supabaseGet(env, "new_products", "store_id=not.is.null") as Promise<Record<string, unknown>[]>,
      supabaseGet(env, "categories", "select=id,name") as Promise<Record<string, unknown>[]>,
    ]);
    const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
    const counts = new Map<string, number>();
    newProducts.forEach((p: Record<string, unknown>) => {
      const name = String(catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const categories = [...counts.entries()].map(([name, count]) => ({
      id: name.toLowerCase().replaceAll(" ", "-"),
      name,
      count,
      image: CATEGORY_IMAGES[name] ?? "",
    }));
    return json(categories);
  }

  // GET /api/marketplace/summary
  if (path === "/api/marketplace/summary" && method === "GET") {
    const [products, suppliers, orders] = await Promise.all([
      supabaseGet(env, "new_products", "select=id"),
      supabaseGet(env, "stores", "select=province"),
      supabaseGet(env, "marketplace_orders", "select=date"),
    ]);
    const countries = new Set(
      suppliers.map((s: Record<string, unknown>) => s.province).filter(Boolean),
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
    const stores = await supabaseGet(env, "stores", "status=eq.active&order=created_at.desc") as Record<string, unknown>[];
    const sellerIds = [...new Set(stores.map(s => Number(s.seller_id)).filter(Boolean))];
    const sellers = sellerIds.length
      ? await supabaseGet(env, "marketplace_users", `id=in.(${sellerIds.join(",")})&select=id,name,avatar,verified`) as Record<string, unknown>[]
      : [];
    const sellersById = new Map(sellers.map(s => [Number(s.id), s]));
    // Count products per store
    const allNewProducts = await supabaseGet(env, "new_products", "select=id,store_id") as Record<string, unknown>[];
    const productCountByStore = new Map<number, number>();
    for (const p of allNewProducts) {
      const sid = Number(p.store_id);
      productCountByStore.set(sid, (productCountByStore.get(sid) || 0) + 1);
    }
    return json(stores.map(s => {
      const seller = sellersById.get(Number(s.seller_id));
      const storeId = Number(s.id);
      return {
        id: storeId,
        name: s.name,
        location: [s.commune, s.province].filter(Boolean).join(", ") || "Burundi",
        rating: 0,
        responseRate: 100,
        yearsActive: 1,
        verified: Boolean(s.is_verified),
        productCount: productCountByStore.get(storeId) || 0,
        image: s.logo || "",
        specialty: s.business_category || "",
      };
    }));
  }

  // Store lookup and creation for Seller Central.
  const sellerStoreMatch = path.match(/^\/api\/stores\/seller\/(\d+)$/);
  if (sellerStoreMatch && method === "GET") {
    const sellerId = Number(sellerStoreMatch[1]);
    const denied = await requireSeller(request, env, sellerId);
    if (denied) return denied;
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${sellerId}&order=created_at.asc`);
    if (!stores.length) return json({ error: "No store found for this seller" }, 404);
    return json({ store: stores[0], stores });
  }

  const storeSlugMatch = path.match(/^\/api\/stores\/([^/]+)$/);
  if (storeSlugMatch && method === "GET") {
    const stores = await supabaseGet(env, "stores", `slug=eq.${encodeURIComponent(storeSlugMatch[1])}&limit=1`);
    if (!stores.length) return json({ error: "Store not found" }, 404);
    return json({ store: stores[0] });
  }

  // GET /api/stores/:id/products - Get products for a specific store
  const storeProductsMatch = path.match(/^\/api\/stores\/(\d+)\/products$/);
  if (storeProductsMatch && method === "GET") {
    const storeId = Number(storeProductsMatch[1]);
    const products = await supabaseGet(env, "new_products", `store_id=eq.${storeId}`) as Record<string, unknown>[];
    const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
    const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
    const storeRows = await supabaseGet(env, "stores", `id=eq.${storeId}&select=id,name,slug,is_verified&limit=1`) as Record<string, unknown>[];
    const store = storeRows[0];
    const productIds = products.map(p => Number(p.id));
    const pictures = productIds.length
      ? await supabaseGet(env, "new_product_pictures", `product_id=in.(${productIds.join(",")})&select=product_id,picture_url,is_primary&order=is_primary.desc`) as Record<string, unknown>[]
      : [];
    const imagesByProduct = new Map<number, string>();
    for (const pic of pictures) {
      const pid = Number(pic.product_id);
      if (!imagesByProduct.has(pid) && pic.picture_url) imagesByProduct.set(pid, String(pic.picture_url));
    }
    return json(products.map(p => {
      const image = imagesByProduct.get(Number(p.id)) || String(p.primary_image || "");
      return {
        id: 1000000 + Number(p.id),
        name: p.name,
        category: catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other",
        price: p.base_price,
        compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
        stock: p.stock_quantity || 0,
        moq: p.minimum_order_quantity || 1,
        unit: p.unit_type || "piece",
        image,
        description: p.description || "",
        status: p.status || "pending",
        storeId,
        storeName: String(store?.name || ""),
        storeSlug: store?.slug || null,
        verified: Boolean(store?.is_verified),
      };
    }));
  }

  if (path === "/api/stores" && method === "POST") {
      const body = await request.json() as Record<string, unknown>;
      if (typeof body.phone === "string" && body.phone && !isBurundianPhone(body.phone)) return json({ error: "Only Burundian phone numbers are supported" }, 400);
    const sellerId = Number(body.sellerId);
    const name = String(body.name || "").trim();
    if (!sellerId || !name) return json({ error: "sellerId and name are required" }, 400);

    const denied = await requireSeller(request, env, sellerId);
    if (denied) return denied;

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

  // POST /api/cart
  if (path === "/api/cart" && method === "POST") {
    const body = await request.json() as { productId: number; quantity?: number };
    const sourceId = body.productId >= 1000000 ? body.productId - 1000000 : body.productId;
    const newP = await supabaseGet(env, "new_products", `id=eq.${sourceId}&limit=1`) as Record<string, unknown>[];
    if (!newP.length) return json({ error: "Product not found" }, 404);
    const stockQuantity = Number(newP[0].stock_quantity || 0);
    const moq = Number(newP[0].minimum_order_quantity || 1);
    const displayId = 1000000 + sourceId;
    const quantity = Math.max(body.quantity ?? moq, moq);
    if (quantity > stockQuantity) return json({ error: `Insufficient stock. Only ${stockQuantity} available.` }, 400);
    const existing = await supabaseGet(env, "marketplace_cart_items", `product_id=eq.${displayId}`);
    if (existing.length) {
      const newQty = existing[0].quantity + quantity;
      if (newQty > stockQuantity) return json({ error: `Cannot add ${quantity}. Only ${stockQuantity - existing[0].quantity} more available.` }, 400);
      await supabasePatch(env, "marketplace_cart_items", `product_id=eq.${displayId}`, { quantity: newQty });
    } else {
      await supabasePost(env, "marketplace_cart_items", { product_id: displayId, quantity });
    }
    return json(await buildCart(env));
  }

  // POST /api/cart/items
  if (path === "/api/cart/items" && method === "POST") {
    const body = await request.json() as { productId: number; quantity?: number };
    const sourceId = body.productId >= 1000000 ? body.productId - 1000000 : body.productId;
    const newP = await supabaseGet(env, "new_products", `id=eq.${sourceId}&limit=1`) as Record<string, unknown>[];
    if (!newP.length) return json({ error: "Product not found" }, 404);
    const stockQuantity = Number(newP[0].stock_quantity || 0);
    const moq = Number(newP[0].minimum_order_quantity || 1);
    const displayId = 1000000 + sourceId;
    const quantity = Math.max(body.quantity ?? moq, moq);
    if (quantity > stockQuantity) return json({ error: `Insufficient stock. Only ${stockQuantity} available.` }, 400);
    const existing = await supabaseGet(env, "marketplace_cart_items", `product_id=eq.${displayId}`);
    if (existing.length) {
      const newQty = existing[0].quantity + quantity;
      if (newQty > stockQuantity) return json({ error: `Cannot add ${quantity}. Only ${stockQuantity - existing[0].quantity} more available.` }, 400);
      await supabasePatch(env, "marketplace_cart_items", `product_id=eq.${displayId}`, { quantity: newQty });
    } else {
      await supabasePost(env, "marketplace_cart_items", { product_id: displayId, quantity });
    }
    return json(await buildCart(env));
  }

  // PATCH /api/cart/items/:id
  const cartItemMatch = path.match(/^\/api\/cart\/items\/(\d+)$/);
  if (cartItemMatch && method === "PATCH") {
    const body = await request.json() as { quantity: number };
    const pid = Number(cartItemMatch[1]);
    const srcId = pid >= 1000000 ? pid - 1000000 : pid;
    const rows = await supabaseGet(env, "new_products", `id=eq.${srcId}&select=stock_quantity&limit=1`) as Record<string, unknown>[];
    const stockQuantity = rows.length ? Number(rows[0].stock_quantity || 0) : 99999;
    if (body.quantity > stockQuantity) return json({ error: `Only ${stockQuantity} in stock.` }, 400);
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
    return json(await buildOrders(env, false, await buyerIdentityForRequest(request, env)));
  }

  // POST /api/orders
  if (path === "/api/orders" && method === "POST") {
    const body = await request.json() as { destination: string; productIds?: number[]; fulfillmentMethod?: "seller_delivery" | "buyer_pickup"; deliveryAddress?: string; deliveryPhoto?: string; deliveryLatitude?: number; deliveryLongitude?: number; shippingFee?: number; termsAccepted?: boolean };
    const cart = await buildCart(env);
    if (!cart.items.length) return json({ error: "Cart is empty" }, 400);
    if (body.termsAccepted === false) return json({ error: "Please accept the fulfillment and payment terms" }, 400);
    const selectedIds = Array.isArray(body.productIds) && body.productIds.length
      ? new Set(body.productIds.map(Number).filter(Number.isFinite))
      : null;
    const selectedItems = selectedIds ? cart.items.filter((item: any) => selectedIds.has(Number(item.productId))) : cart.items;
    if (!selectedItems.length) return json({ error: "No cart items selected" }, 400);
    const fulfillmentMethod = body.fulfillmentMethod || "pending";
    const destination = fulfillmentMethod === "buyer_pickup" ? "Store pickup" : body.deliveryAddress || body.destination || "Fulfillment not selected";
    const subtotal = selectedItems.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
    const shippingFee = Math.max(0, Number(body.shippingFee || 0));
    const buyer = await buyerIdentityForRequest(request, env);
    const [order] = await supabasePost(env, "marketplace_orders", {
      total: Number((subtotal + shippingFee).toFixed(2)),
      shipping_fee: Number(shippingFee.toFixed(2)),
      item_count: selectedItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
      destination,
      fulfillment_method: fulfillmentMethod,
      delivery_latitude: fulfillmentMethod === "seller_delivery" && Number.isFinite(body.deliveryLatitude) ? body.deliveryLatitude : null,
      delivery_longitude: fulfillmentMethod === "seller_delivery" && Number.isFinite(body.deliveryLongitude) ? body.deliveryLongitude : null,
      delivery_photo: fulfillmentMethod === "seller_delivery" ? body.deliveryPhoto || null : null,
      status: "processing",
      buyer_name: buyer?.token || "guest",
    });
    await supabasePost(env, "marketplace_order_items",
      selectedItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        supplier_name: item.product.supplierName,
      })),
    );
    await adjustOrderStock(env, Number(order.id), -1);
    const deleteFilter = selectedItems.length === cart.items.length ? "id=not.is.null" : `product_id=in.(${selectedItems.map((item: any) => Number(item.productId)).join(",")})`;
    await supabaseDelete(env, "marketplace_cart_items", deleteFilter);
    const allOrders = await buildOrders(env);
    const created = allOrders.find((o: any) => o.id === order.id);
    const sellerIds = [...new Set(selectedItems.map((item: any) => Number(item.product?.supplierId || 0)).filter(Boolean))];
    await Promise.all([
      createNotification(env, buyer?.id, "order", `Order #${order.id} placed`, `Your order was received. Shipping fee: ${shippingFee.toLocaleString()} BIF.`, `/orders/${order.id}`, { orderId: order.id, status: "processing", shippingFee }),
      ...sellerIds.map(sellerId => createNotification(env, sellerId, "order", `New order #${order.id}`, `A buyer placed a new order. Shipping fee: ${shippingFee.toLocaleString()} BIF.`, `/supplier/orders/${order.id}`, { orderId: order.id, status: "processing", shippingFee })),
    ]);
    return json(created, 201);
  }

  // GET /api/supplier/dashboard
  if (path === "/api/supplier/dashboard" && method === "GET") {
    const payload = authPayload(request);
    let storeIds: number[] = [];
    if (payload?.id) {
      const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&select=id`) as Record<string, unknown>[];
      storeIds = stores.map(s => Number(s.id));
    }
    const allProducts = storeIds.length
      ? await supabaseGet(env, "new_products", `store_id=in.(${storeIds.join(",")})`) as Record<string, unknown>[]
      : [];
    const storeRows = storeIds.length
      ? await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name`) as Record<string, unknown>[]
      : [];
    const storeName = storeRows[0]?.name as string | undefined;
    const orders = await buildOrders(env, true, undefined, storeName);
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
      products: allProducts.length,
      lowStock: allProducts.filter((p: Record<string, unknown>) => Number(p.stock_quantity || 0) < 250).length,
      recentOrders: orders.slice(0, 4),
      sales,
    });
  }

  // GET /api/supplier/products
  if (path === "/api/supplier/products" && method === "GET") {
    const payload = authPayload(request);
    let storeIds: number[] = [];
    if (payload?.id) {
      const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&select=id`) as Record<string, unknown>[];
      storeIds = stores.map(s => Number(s.id));
    }
    if (!storeIds.length) return json([]);
    const newProducts = await supabaseGet(env, "new_products", `store_id=in.(${storeIds.join(",")})`) as Record<string, unknown>[];
    const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
    const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
    const storeRows = await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name,slug,is_verified`) as Record<string, unknown>[];
    const storesById = new Map(storeRows.map(s => [Number(s.id), s]));
    return json(newProducts.map(p => {
      const store = storesById.get(Number(p.store_id));
      return {
        id: 1000000 + Number(p.id),
        name: p.name,
        category: catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other",
        price: p.base_price,
        compareAtPrice: p.compare_at_price == null ? null : p.compare_at_price,
        stock: p.stock_quantity || 0,
        moq: p.minimum_order_quantity || 1,
        unit: p.unit_type || "piece",
        supplier_id: p.seller_id,
        supplier_name: String(store?.name || "").trim(),
        image: p.primary_image || "",
        description: p.description || "",
        condition: p.condition || "New",
        deliveryAvailable: p.delivery_available !== false,
        pickupAvailable: p.pickup_available === true,
        preparationTime: p.preparation_time || "",
        status: p.status || "pending",
      };
    }));
  }

  // POST /api/supplier/products
  if (path === "/api/supplier/products" && method === "POST") {
    const payload = authPayload(request);
    if (!payload?.id) return json({ error: "Not authenticated" }, 401);
    const body = await request.json() as Record<string, unknown>;
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
    if (!stores.length) return json({ error: "No store found. Create a store first." }, 400);
    const storeId = Number(stores[0].id);
    const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
    const catIdByName = new Map(catRows.map(c => [String(c.name || "").toLowerCase(), Number(c.id)]));
    const categoryId = catIdByName.get(String(body.category || "").toLowerCase()) || null;
    const [product] = await supabasePost(env, "new_products", {
      name: body.name,
      store_id: storeId,
      seller_id: payload.id,
      category_id: categoryId,
      custom_category_suggestion: categoryId ? null : body.category,
      base_price: body.price,
      compare_at_price: body.compareAtPrice || null,
      minimum_order_quantity: body.moq || 1,
      stock_quantity: body.stock || 0,
      unit_type: body.unit || "piece",
      description: body.description || "",
      primary_image: body.image || "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=85",
      status: "approved",
    });
    return json({
      id: 1000000 + Number(product.id),
      name: product.name,
      price: product.base_price,
      stock: product.stock_quantity,
      moq: product.minimum_order_quantity,
      unit: product.unit_type,
      image: product.primary_image,
      status: product.status,
    }, 201);
  }

  // PATCH /api/supplier/products/:id
  const supplierProductMatch = path.match(/^\/api\/supplier\/products\/(\d+)$/);
  if (supplierProductMatch && method === "PATCH") {
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.name) update.name = body.name;
    if (body.price != null) update.base_price = body.price;
    if (body.moq != null) update.minimum_order_quantity = body.moq;
    if (body.stock != null) update.stock_quantity = body.stock;
    if (body.description != null) update.description = body.description;
    if (body.unit) update.unit_type = body.unit;
    if (body.category) {
      const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
      const catIdByName = new Map(catRows.map(c => [String(c.name || "").toLowerCase(), Number(c.id)]));
      const catId = catIdByName.get(String(body.category).toLowerCase());
      if (catId) update.category_id = catId;
    }
    const sourceId = Number(supplierProductMatch[1]) >= 1000000
      ? Number(supplierProductMatch[1]) - 1000000
      : Number(supplierProductMatch[1]);
    const [product] = await supabasePatch(env, "new_products", `id=eq.${sourceId}`, update);
    return json({
      id: 1000000 + Number(product.id),
      name: product.name,
      price: product.base_price,
      stock: product.stock_quantity,
      moq: product.minimum_order_quantity,
      unit: product.unit_type,
      image: product.primary_image,
      status: product.status,
    });
  }

  // PATCH /api/new-products/:id/pricing
  if (path.match(/^\/api\/new-products\/(\d+)\/pricing$/) && method === "PATCH") {
    const payload = authPayload(request);
    if (!payload?.id) return json({ error: "Not authenticated" }, 401);
    const pricingMatch = path.match(/^\/api\/new-products\/(\d+)\/pricing$/)!;
    const sourceId = Number(pricingMatch[1]) >= 1000000 ? Number(pricingMatch[1]) - 1000000 : Number(pricingMatch[1]);
    const rows = await supabaseGet(env, "new_products", `id=eq.${sourceId}&limit=1`) as Record<string, unknown>[];
    const product = rows[0];
    if (!product) return json({ error: "Product not found" }, 404);
    if (Number(product.seller_id) !== Number(payload.id)) return json({ error: "Only the product owner can update pricing" }, 403);
    const body = await request.json() as { price?: unknown; mode?: string; expectedPrice?: unknown };
    const price = Number(body.price);
    const currentPrice = Number(product.base_price || 0);
    const originalPrice = Number(product.compare_at_price || currentPrice);
    if (!Number.isFinite(price) || price <= 0) return json({ error: "Price must be greater than 0" }, 400);
    if (body.expectedPrice != null && Number(body.expectedPrice) !== currentPrice) return json({ error: "Price changed. Reload and try again." }, 409);
    if (body.mode === "discount" && price >= originalPrice) return json({ error: "Discount price must be below the original price" }, 400);
    const [saved] = await supabasePatch(env, "new_products", `id=eq.${sourceId}`, {
      base_price: price,
      compare_at_price: body.mode === "discount" ? originalPrice : null,
    }) as Record<string, unknown>[];
    return json({ id: 1000000 + Number(saved.id), price: saved.base_price, compareAtPrice: saved.compare_at_price ?? null });
  }

  // GET /api/supplier/orders
  if (path === "/api/supplier/orders" && method === "GET") {
    const payload = authPayload(request);
    let storeName: string | undefined;
    if (payload?.id) {
      const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&select=name&limit=1`) as Record<string, unknown>[];
      storeName = stores[0]?.name as string;
    }
    return json(await buildOrders(env, true, undefined, storeName));
  }

  // PATCH /api/supplier/orders/:id/status
  const supplierOrderMatch = path.match(/^\/api\/supplier\/orders\/(\d+)\/status$/);
  if (supplierOrderMatch && method === "PATCH") {
    const body = await request.json() as { status?: string; shippingFee?: number };
    const allowedStatuses = new Set(["processing", "confirmed", "preparing", "ready", "shipped", "out_for_delivery", "delivered", "cancelled", "disputed"]);
    if (body.status && !allowedStatuses.has(body.status)) return json({ error: "Unsupported order status" }, 400);
    if (body.shippingFee != null && (!Number.isFinite(Number(body.shippingFee)) || Number(body.shippingFee) < 0)) return json({ error: "Shipping fee must be a non-negative amount" }, 400);
    const supplierPayload = authPayload(request);
    if (!supplierPayload?.id) return json({ error: "Sign in required" }, 401);
    const supplierStores = await supabaseGet(env, "stores", `seller_id=eq.${supplierPayload.id}&select=name`) as Record<string, unknown>[];
    if (!supplierStores.length) return json({ error: "Seller store not found" }, 403);
    const supplierNames = new Set(supplierStores.map(store => String(store.name || "").trim()));
    const orderItems = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${supplierOrderMatch[1]}&select=supplier_name`) as Record<string, unknown>[];
    if (!orderItems.some(item => supplierNames.has(String(item.supplier_name || "").trim()))) return json({ error: "Order does not belong to your store" }, 403);
    const orderRows = await supabaseGet(env, "marketplace_orders", `id=eq.${supplierOrderMatch[1]}&limit=1`) as Record<string, unknown>[];
    if (!orderRows.length) return json({ error: "Order not found" }, 404);
    const orderItemRows = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${supplierOrderMatch[1]}`) as Record<string, unknown>[];
    const itemSubtotal = orderItemRows.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
    const update: Record<string, unknown> = {};
    if (body.status) update.status = body.status;
    if (body.shippingFee != null) {
      const shippingFee = Number(body.shippingFee);
      update.shipping_fee = Number(shippingFee.toFixed(2));
      update.total = Number((itemSubtotal + shippingFee).toFixed(2));
    }
    const wasCancelled = String(orderRows[0].status || "") === "cancelled";
    if (body.status === "cancelled" && !wasCancelled) await adjustOrderStock(env, Number(supplierOrderMatch[1]), 1);
    if (Object.keys(update).length) await supabasePatch(env, "marketplace_orders", `id=eq.${supplierOrderMatch[1]}`, update);
    const payload = supplierPayload;
    let storeName: string | undefined;
    if (payload?.id) {
      const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&select=name&limit=1`) as Record<string, unknown>[];
      storeName = stores[0]?.name as string;
    }
    const orders = await buildOrders(env, true, undefined, storeName);
    const updated = orders.find((o: any) => o.id === Number(supplierOrderMatch[1]));
    const buyerId = updated?.buyerId || null;
    const statusLabels: Record<string, string> = {
      processing: "Your order is being processed",
      shipped: "Your order has been shipped",
      delivered: "Your order has been delivered",
      cancelled: "Your order has been cancelled",
    };
    if (body.status) await createNotification(env, buyerId, "order", `Order #${supplierOrderMatch[1]}`, statusLabels[body.status] || `Order status: ${body.status}`, `/orders/${supplierOrderMatch[1]}`, { orderId: Number(supplierOrderMatch[1]), status: body.status });
    if (body.shippingFee != null) await createNotification(env, buyerId, "shipping", `Shipping fee for order #${supplierOrderMatch[1]}`, `The seller issued a shipping fee of ${Number(body.shippingFee).toLocaleString()} BIF. Your updated order total is ${Number(updated?.total || 0).toLocaleString()} BIF.`, `/orders/${supplierOrderMatch[1]}`, { orderId: Number(supplierOrderMatch[1]), shippingFee: Number(body.shippingFee), total: Number(updated?.total || 0) });
    return json(updated);
  }

  // GET /api/orders/:id
  const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
  if (orderMatch && method === "GET") {
    const orders = await supabaseGet(env, "marketplace_orders", `id=eq.${orderMatch[1]}`);
    if (!orders.length) return json({ error: "Not found" }, 404);
    const buyer = await buyerIdentityForRequest(request, env);
    const rawOwner = String(orders[0].buyer_name || "");
    if (buyer?.role === "buyer" && rawOwner !== buyer.token) return json({ error: "Order not found" }, 404);
    const items = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${orderMatch[1]}`);
    if (!items.length) return json({ error: "Order has no items" }, 404);
    return json({
      ...orders[0],
      buyerName: displayBuyerName(orders[0].buyer_name),
      buyerId: rawOwner.startsWith("user:") ? Number(rawOwner.split(":")[1]) : null,
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
    const body = await request.json() as { status?: string; fulfillmentMethod?: "seller_delivery" | "buyer_pickup"; deliveryAddress?: string; deliveryLatitude?: number; deliveryLongitude?: number; deliveryPhoto?: string };
    const buyer = await buyerIdentityForRequest(request, env);
    if (!buyer) return json({ error: "Sign in required" }, 401);
    const orderRows = await supabaseGet(env, "marketplace_orders", `id=eq.${orderStatusMatch[1]}&limit=1`) as Record<string, unknown>[];
    if (!orderRows.length) return json({ error: "Order not found" }, 404);
    if (buyer?.role === "buyer" && String(orderRows[0].buyer_name || "") !== buyer.token) return json({ error: "Order not found" }, 404);
    if (body.status === "cancelled") {
      const currentStatus = String(orderRows[0].status || "");
      if (!["processing", "confirmed", "preparing", "ready"].includes(currentStatus)) return json({ error: "This order can no longer be cancelled" }, 400);
      await adjustOrderStock(env, Number(orderStatusMatch[1]), 1);
    }
    const fulfillmentUpdate: Record<string, unknown> = {};
    if (body.fulfillmentMethod === "seller_delivery" || body.fulfillmentMethod === "buyer_pickup") {
      fulfillmentUpdate.fulfillment_method = body.fulfillmentMethod;
      fulfillmentUpdate.destination = body.fulfillmentMethod === "buyer_pickup" ? "Store pickup" : String(body.deliveryAddress || "").trim();
      if (body.fulfillmentMethod === "seller_delivery" && !fulfillmentUpdate.destination) return json({ error: "Delivery address is required" }, 400);
      fulfillmentUpdate.delivery_latitude = body.fulfillmentMethod === "seller_delivery" && Number.isFinite(body.deliveryLatitude) ? body.deliveryLatitude : null;
      fulfillmentUpdate.delivery_longitude = body.fulfillmentMethod === "seller_delivery" && Number.isFinite(body.deliveryLongitude) ? body.deliveryLongitude : null;
      fulfillmentUpdate.delivery_photo = body.fulfillmentMethod === "seller_delivery" ? body.deliveryPhoto || null : null;
    }
    if (body.status) fulfillmentUpdate.status = body.status;
    if (Object.keys(fulfillmentUpdate).length) await supabasePatch(env, "marketplace_orders", `id=eq.${orderStatusMatch[1]}`, fulfillmentUpdate);
    const orders = await buildOrders(env, false, buyer);
    const updated = orders.find((o: any) => o.id === Number(orderStatusMatch[1]));
    const order = orders.find((o: any) => o.id === Number(orderStatusMatch[1]));
    const statusLabels: Record<string, string> = {
      confirmed: "Your order has been confirmed",
      processing: "Your order is being processed",
      shipped: "Your order has been shipped",
      delivered: "Your order has been delivered",
      cancelled: "Your order has been cancelled",
    };
    await createNotification(env, order?.buyerId || null, "order", `Order #${orderStatusMatch[1]}`, statusLabels[body.status] || `Order status: ${body.status}`, `/orders/${orderStatusMatch[1]}`, { orderId: Number(orderStatusMatch[1]), status: body.status });
    return json(updated);
  }

  // ═══════════════════════════════════════
  // CONVERSATIONS & MESSAGES
  // ═══════════════════════════════════════

  // GET /api/conversations — list user's conversations
  if (path === "/api/conversations" && method === "GET") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const role = identity.role;
    const filter = role === "seller"
      ? `seller_id=eq.${identity.id}&order=last_message_at.desc`
      : `buyer_id=eq.${identity.id}&order=last_message_at.desc`;
    const conversations = await supabaseGet(env, "conversations", filter) as Record<string, unknown>[];
    // Fetch other party names
    const otherIds = [...new Set(conversations.map(c => role === "seller" ? c.buyer_id : c.seller_id))];
    const otherUsers = otherIds.length
      ? await supabaseGet(env, "marketplace_users", `id=in.(${otherIds.join(",")})&select=id,name,avatar,phone`) as Record<string, unknown>[]
      : [];
    const usersById = new Map(otherUsers.map(u => [Number(u.id), u]));
    const conversationStoreIds = [...new Set(conversations.map(c => Number(c.store_id)).filter(Boolean))];
    const conversationStores = conversationStoreIds.length
      ? await supabaseGet(env, "stores", `id=in.(${conversationStoreIds.join(",")})&select=id,name,slug,logo`) as Record<string, unknown>[]
      : [];
    const storesById = new Map(conversationStores.map(store => [Number(store.id), store]));
    return json(conversations.map(c => {
      const otherId = Number(role === "seller" ? c.buyer_id : c.seller_id);
      const other = usersById.get(otherId);
      const store = storesById.get(Number(c.store_id));
      const unread = role === "seller" ? c.seller_unread : c.buyer_unread;
      return {
        id: c.id,
        subject: c.subject,
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
        unreadCount: unread,
        otherParty: { id: otherId, name: other?.name || "User", avatar: other?.avatar || "" },
        storeId: c.store_id,
        storeName: store?.name || "",
        storeSlug: store?.slug || "",
        storeUrl: store?.slug ? `/store/${store.slug}` : "",
        storeLogo: store?.logo || "",
        createdAt: c.created_at,
      };
    }));
  }

  // POST /api/conversations — start new conversation
  if (path === "/api/conversations" && method === "POST") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const body = await request.json() as { sellerId?: number; buyerId?: number; storeId?: number; subject?: string; message?: string };
    const message = String(body.message || "").trim();
    const sellerId = identity.role === "seller" ? identity.id : body.sellerId;
    const buyerId = identity.role === "seller" ? body.buyerId : identity.id;
    if (!sellerId || !buyerId) return json({ error: identity.role === "seller" ? "buyerId and message are required" : "sellerId and message are required" }, 400);
    const storeId = body.storeId || null;
    // Reuse the thread for this exact store. Legacy rows without a store are adopted
    // when the buyer opens a store-specific message link.
    let existing = storeId
      ? await supabaseGet(env, "conversations", `buyer_id=eq.${buyerId}&seller_id=eq.${sellerId}&store_id=eq.${storeId}&order=created_at.desc&limit=1`) as Record<string, unknown>[]
      : await supabaseGet(env, "conversations", `buyer_id=eq.${buyerId}&seller_id=eq.${sellerId}&order=created_at.desc&limit=1`) as Record<string, unknown>[];
    if (!existing.length && storeId) {
      existing = await supabaseGet(env, "conversations", `buyer_id=eq.${buyerId}&seller_id=eq.${sellerId}&store_id=is.null&order=created_at.desc&limit=1`) as Record<string, unknown>[];
    }
    let conversationId: number;
    if (existing.length) {
      conversationId = existing[0].id as number;
      if (storeId && !existing[0].store_id) {
        await supabasePatch(env, "conversations", `id=eq.${conversationId}`, { store_id: storeId });
      }
    } else {
      const [conv] = await supabasePost(env, "conversations", {
        buyer_id: buyerId,
        seller_id: sellerId,
        store_id: storeId,
        subject: body.subject || "",
        last_message: message,
        last_message_at: new Date().toISOString(),
        seller_unread: message && identity.role === "buyer" ? 1 : 0,
        buyer_unread: message && identity.role === "seller" ? 1 : 0,
      });
      conversationId = conv.id;
    }
    if (!message) return json({ conversationId }, 201);
    // Send the first message
    await supabasePost(env, "messages", {
      conversation_id: conversationId,
      sender_id: identity.id,
      body: message,
    });
    // Update conversation
    await supabasePatch(env, "conversations", `id=eq.${conversationId}`, {
      last_message: message,
      last_message_at: new Date().toISOString(),
      ...(identity.role === "buyer" ? { seller_unread: 1 } : { buyer_unread: 1 }),
    });
    // Notify the other party
    await supabasePost(env, "notifications", {
      user_id: identity.role === "buyer" ? sellerId : buyerId,
      type: "message",
      title: "New message",
      body: message.slice(0, 120),
      link: "/messages",
      metadata: JSON.stringify({ conversationId }),
    });
    return json({ conversationId }, 201);
  }

  // GET /api/conversations/:id/messages — get messages
  const convMatch = path.match(/^\/api\/conversations\/(\d+)$/);
  if (convMatch && method === "GET") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const convId = Number(convMatch[1]);
    const conversations = await supabaseGet(env, "conversations", `id=eq.${convId}&limit=1`) as Record<string, unknown>[];
    if (!conversations.length) return json({ error: "Conversation not found" }, 404);
    const conv = conversations[0];
    const isParticipant = Number(conv.buyer_id) === identity.id || Number(conv.seller_id) === identity.id;
    if (!isParticipant) return json({ error: "Access denied" }, 403);
    const messages = await supabaseGet(env, "messages", `conversation_id=eq.${convId}&order=created_at.asc`) as Record<string, unknown>[];
    // Mark as read
    const role = identity.role;
    if (role === "buyer" && Number(conv.buyer_unread) > 0) {
      await supabasePatch(env, "conversations", `id=eq.${convId}`, { buyer_unread: 0 });
    } else if (role === "seller" && Number(conv.seller_unread) > 0) {
      await supabasePatch(env, "conversations", `id=eq.${convId}`, { seller_unread: 0 });
    }
    // Mark unread messages from other party as read
    const unreadIds = messages.filter(m => !m.read_at && Number(m.sender_id) !== identity.id).map(m => m.id);
    for (const msgId of unreadIds) {
      await supabasePatch(env, "messages", `id=eq.${msgId}`, { read_at: new Date().toISOString() });
    }
    // Fetch sender names
    const senderIds = [...new Set(messages.map(m => Number(m.sender_id)))];
    const senders = senderIds.length
      ? await supabaseGet(env, "marketplace_users", `id=in.(${senderIds.join(",")})&select=id,name,avatar`) as Record<string, unknown>[]
      : [];
    const sendersById = new Map(senders.map(s => [Number(s.id), s]));
    return json(messages.map(m => {
      const sender = sendersById.get(Number(m.sender_id));
      return {
        id: m.id,
        senderId: m.sender_id,
        senderName: sender?.name || "User",
        senderAvatar: sender?.avatar || "",
        body: m.body,
        readAt: m.read_at,
        createdAt: m.created_at,
      };
    }));
  }

  // DELETE /api/conversations/:id — remove a conversation for both participants
  if (convMatch && method === "DELETE") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const convId = Number(convMatch[1]);
    const conversations = await supabaseGet(env, "conversations", `id=eq.${convId}&limit=1`) as Record<string, unknown>[];
    if (!conversations.length) return json({ error: "Conversation not found" }, 404);
    const conv = conversations[0];
    if (Number(conv.buyer_id) !== identity.id && Number(conv.seller_id) !== identity.id) return json({ error: "Access denied" }, 403);
    await supabaseDelete(env, "messages", `conversation_id=eq.${convId}`);
    await supabaseDelete(env, "conversations", `id=eq.${convId}`);
    return json({ deleted: true });
  }

  // DELETE /api/conversations/:conversationId/messages/:messageId
  if (method === "DELETE") {
    const messageMatch = path.match(/^\/api\/conversations\/(\d+)\/messages\/(\d+)$/);
    if (messageMatch) {
      const identity = await buyerIdentityForRequest(request, env);
      if (!identity) return json({ error: "Sign in required" }, 401);
      const conversationId = Number(messageMatch[1]);
      const messageId = Number(messageMatch[2]);
      const conversations = await supabaseGet(env, "conversations", `id=eq.${conversationId}&limit=1`) as Record<string, unknown>[];
      if (!conversations.length) return json({ error: "Conversation not found" }, 404);
      const conversation = conversations[0];
      if (Number(conversation.buyer_id) !== identity.id && Number(conversation.seller_id) !== identity.id) return json({ error: "Access denied" }, 403);
      const messages = await supabaseGet(env, "messages", `id=eq.${messageId}&conversation_id=eq.${conversationId}&limit=1`) as Record<string, unknown>[];
      if (!messages.length) return json({ error: "Message not found" }, 404);
      if (Number(messages[0].sender_id) !== identity.id) return json({ error: "You can only delete your own messages" }, 403);
      await supabaseDelete(env, "messages", `id=eq.${messageId}&conversation_id=eq.${conversationId}`);
      return json({ deleted: true });
    }
  }

  // POST /api/conversations/:id/messages — send message
  if (convMatch && method === "POST") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const convId = Number(convMatch[1]);
    const conversations = await supabaseGet(env, "conversations", `id=eq.${convId}&limit=1`) as Record<string, unknown>[];
    if (!conversations.length) return json({ error: "Conversation not found" }, 404);
    const conv = conversations[0];
    const isParticipant = Number(conv.buyer_id) === identity.id || Number(conv.seller_id) === identity.id;
    if (!isParticipant) return json({ error: "Access denied" }, 403);
    const body = await request.json() as { message?: string };
    if (!body.message) return json({ error: "message is required" }, 400);
    const [msg] = await supabasePost(env, "messages", {
      conversation_id: convId,
      sender_id: identity.id,
      body: body.message,
    });
    // Update conversation
    const otherId = Number(conv.buyer_id) === identity.id ? conv.seller_id : conv.buyer_id;
    const updateField = Number(conv.buyer_id) === identity.id ? "seller_unread" : "buyer_unread";
    await supabasePatch(env, "conversations", `id=eq.${convId}`, {
      last_message: body.message,
      last_message_at: new Date().toISOString(),
      [updateField]: (Number(conv[updateField]) || 0) + 1,
    });
    // Notify other party
    await supabasePost(env, "notifications", {
      user_id: otherId,
      type: "message",
      title: "New message",
      body: body.message.slice(0, 120),
      link: "/messages",
      metadata: JSON.stringify({ conversationId: convId }),
    });
    return json({ message: { id: msg.id, body: msg.body, createdAt: msg.created_at } }, 201);
  }

  // ═══════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════

  // GET /api/notifications — list user's notifications
  if (path === "/api/notifications" && method === "GET") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const limit = url.searchParams.get("limit") || "50";
    const notifications = await supabaseGet(env, "notifications",
      `user_id=eq.${identity.id}&order=created_at.desc&limit=${limit}`) as Record<string, unknown>[];
    const unreadCount = notifications.filter(n => !n.read_at).length;
    return json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        metadata: n.metadata,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      unreadCount,
    });
  }

  // POST /api/notifications/read — mark specific notification as read
  if (path === "/api/notifications/read" && method === "POST") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    const body = await request.json() as { id?: number };
    if (!body.id) return json({ error: "notification id is required" }, 400);
    await supabasePatch(env, "notifications", `id=eq.${body.id}&user_id=eq.${identity.id}`, { read_at: new Date().toISOString() });
    return json({ success: true });
  }

  // POST /api/notifications/read-all — mark all as read
  if (path === "/api/notifications/read-all" && method === "POST") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in required" }, 401);
    await supabasePatch(env, "notifications", `user_id=eq.${identity.id}&read_at=is.null`, { read_at: new Date().toISOString() });
    return json({ success: true });
  }

  // GET /api/notifications/unread-count — badge count
  if (path === "/api/notifications/unread-count" && method === "GET") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ unreadCount: 0 });
    const notifications = await supabaseGet(env, "notifications",
      `user_id=eq.${identity.id}&read_at=is.null&select=id`) as Record<string, unknown>[];
    return json({ unreadCount: notifications.length });
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
