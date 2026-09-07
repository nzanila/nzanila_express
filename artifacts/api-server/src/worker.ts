import { researchChat } from "./ai-research";
import { categoryAliases, CATEGORY_I18N } from "./category-i18n";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPPLIER_ID: string;
  GROQ_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  AI?: Ai;
}

const STOREFRONT_BASE = "https://nzanila.pages.dev";

/**
 * What buyers are allowed to see.
 *
 * A refusal is the ONLY thing that hides a listing. Everything else stays on the
 * marketplace: a listing still awaiting review, a seller who has not been verified, a
 * storefront without the verified badge. Review is a quality signal, not a gate — holding
 * stock back until an admin gets to it would punish sellers for our own backlog.
 *
 * `status` is null on older rows, and PostgREST's `neq` drops nulls, so those are
 * re-included explicitly or every pre-moderation listing would vanish.
 */
const BUYER_VISIBLE = "or=(status.is.null,status.neq.rejected)";

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

async function supabaseUpsert(env: Env, table: string, body: unknown, onConflict: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...supabaseHeaders(env), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${table} UPSERT failed: ${res.status}`);
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

// Session tokens are HMAC-signed and expiry-checked. Legacy acceptance is split into two
// independent switches, because the two paths carry very different risk.
//
// Refusing legacy REFRESH tokens is not optional: the old format was `nz_refresh_<userId>`,
// so a bare guessable string minted a full session for any account — including admin —
// with no password and no token. User ids are small sequential integers, so that is
// enumerable in seconds. It is off.
const ACCEPT_LEGACY_REFRESH_TOKENS = false;
// Legacy ACCESS tokens are still honoured so existing sessions are not terminated. These
// are at least bearer secrets a caller must already possess, and they now expire.
// Flipping this to false is the full cutover and logs everyone out.
const ACCEPT_LEGACY_ACCESS_TOKENS = true;

async function sessionKey(env: Env) {
  return crypto.subtle.importKey('raw', encoder.encode(`session:${env.SUPABASE_SERVICE_KEY}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signSession(env: Env, payload: Record<string, unknown>) {
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(env), encoder.encode(body));
  return `${body}.${b64url(signature)}`;
}

async function verifySession(env: Env, value: string): Promise<Record<string, unknown> | null> {
  const [body, signature] = value.split('.');
  if (!body || !signature) return null;
  try {
    const bytes = Uint8Array.from(fromB64url(signature), char => char.charCodeAt(0));
    if (!(await crypto.subtle.verify('HMAC', await sessionKey(env), bytes, encoder.encode(body)))) return null;
    return JSON.parse(fromB64url(body)) as Record<string, unknown>;
  } catch { return null; }
}

/** Parse a JSON body without throwing. Returns null for empty or malformed input. */
async function readJson<T>(request: Request): Promise<T | null> {
  try { return await request.json() as T; } catch { return null; }
}

/**
 * Resolve the caller's identity from the Authorization header.
 * Returns null for a missing, malformed, forged or EXPIRED token. Async because
 * verifying an HMAC is async -- every call site must await it.
 */
async function authPayload(request: Request, env: Env): Promise<{ id?: number } | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer nz_")) return null;
  const raw = header.slice(10);
  const notExpired = (payload: Record<string, unknown> | null) => {
    if (!payload || !payload.id) return null;
    // exp was always written but never checked, so tokens never expired. It is checked now.
    if (payload.exp != null && Date.now() > Number(payload.exp)) return null;
    return payload as { id?: number };
  };
  if (raw.includes('.')) return notExpired(await verifySession(env, raw));
  if (!ACCEPT_LEGACY_ACCESS_TOKENS) return null;
  try { return notExpired(JSON.parse(atob(raw))); } catch { return null; }
}

async function requireSeller(request: Request, env: Env, sellerId: number): Promise<Response | null> {
  const payload = await authPayload(request, env);
  if (!payload?.id || payload.id !== sellerId) return json({ error: "Only the store owner can access this resource" }, 403);
  const sellers = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&role=eq.seller&select=id&limit=1`) as Record<string, unknown>[];
  if (!sellers.length) return json({ error: "Seller account required" }, 403);
  return null;
}

type BuyerIdentity = { id: number; name: string; token: string; role: string };

async function buyerIdentityForRequest(request: Request, env: Env): Promise<BuyerIdentity | undefined> {
  const payload = await authPayload(request, env);
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

// Order items don't store an image, so resolve it from the product at read time.
// This gives existing orders thumbnails too, not just newly placed ones.
// Returns a lookup keyed by the marketplace product id (which is offset by 1000000).
async function productImagesFor(env: Env, productIds: unknown[]) {
  const ids = [...new Set(productIds.map(id => Number(id)).filter(Boolean))];
  const sourceIds = [...new Set(ids.map(id => (id >= 1000000 ? id - 1000000 : id)).filter(Boolean))];
  const byId = new Map<number, string>();
  if (sourceIds.length) {
    try {
      const products = await supabaseGet(env, "new_products", `id=in.(${sourceIds.join(",")})&select=id,primary_image`) as Record<string, unknown>[];
      for (const product of products) {
        if (product.primary_image) byId.set(Number(product.id), String(product.primary_image));
      }
      // Fall back to the gallery for products with no primary image set.
      const missing = sourceIds.filter(id => !byId.has(id));
      if (missing.length) {
        const pictures = await supabaseGet(env, "new_product_pictures", `product_id=in.(${missing.join(",")})&select=product_id,picture_url,is_primary&order=is_primary.desc`) as Record<string, unknown>[];
        for (const picture of pictures) {
          const pid = Number(picture.product_id);
          if (!byId.has(pid) && picture.picture_url) byId.set(pid, String(picture.picture_url));
        }
      }
    } catch (error) {
      console.error("Order image lookup failed:", error);
    }
  }
  return (productId: unknown) => {
    const id = Number(productId);
    if (!id) return "";
    return byId.get(id >= 1000000 ? id - 1000000 : id) || "";
  };
}

async function buildOrders(env: Env, supplierOnly = false, buyer?: BuyerIdentity, storeName?: string | string[]) {
  const query = buyer
    ? `buyer_name=eq.${encodeURIComponent(buyer.token)}&order=date.desc`
    : "order=date.desc";
  const orders = await supabaseGet(env, "marketplace_orders", query);
  const allItems = await supabaseGet(env, "marketplace_order_items");
  const imageForProduct = await productImagesFor(env, allItems.map((item: Record<string, unknown>) => item.product_id));
  // Per-seller shipping fees, so a seller sees the fee they charged rather than the
  // order-wide sum. Tolerates the table being missing so reads never hard-fail.
  let shippingRows: Record<string, unknown>[] = [];
  try {
    shippingRows = await supabaseGet(env, "marketplace_order_shipping", "select=order_id,supplier_name,fee") as Record<string, unknown>[];
  } catch (error) {
    console.error("Per-seller shipping lookup failed:", error);
  }
  // A seller can own several stores, so match the item against every store name they have.
  const storeNames = storeName == null
    ? null
    : new Set((Array.isArray(storeName) ? storeName : [storeName]).map(name => String(name || "").trim()).filter(Boolean));
  return orders
    .map((order: Record<string, unknown>) => {
      const items = allItems
        .filter((item: Record<string, unknown>) =>
          item.order_id === order.id &&
          (!supplierOnly || (storeNames ? storeNames.has(String(item.supplier_name || "").trim()) : false)),
        )
        .map((item: Record<string, unknown>) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: imageForProduct(item.product_id),
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
      // shipping_fee on the order is the sum across sellers (what the buyer pays).
      // A seller view also gets sellerShippingFee: only what this seller charged.
      sellerShippingFee: supplierOnly && storeNames
        ? shippingRows
            .filter(row => Number(row.order_id) === Number(order.id) && storeNames.has(String(row.supplier_name || "").trim()))
            .reduce((sum, row) => sum + Number(row.fee || 0), 0)
        : undefined,
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

// Countries this marketplace accepts. The signup UI already offered Rwanda in its country
// picker while the server rejected it, so a user could select the flag and then be told
// "Enter a valid Burundi (+257) or Rwanda (+250) phone number". Both sides agree now.
const SUPPORTED_DIAL_CODES = ["257", "250"] as const; // Burundi, Rwanda
const DEFAULT_DIAL_CODE = "257";

function normalizeAuthPhone(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, "");
  if (normalized.startsWith("+")) normalized = normalized.slice(1);
  // Already carries a supported country code: leave it alone.
  if (SUPPORTED_DIAL_CODES.some(code => normalized.startsWith(code))) {
    // A trunk "0" after the country code is not part of the international form.
    for (const code of SUPPORTED_DIAL_CODES) {
      if (normalized.startsWith(`${code}0`)) return code + normalized.slice(code.length + 1);
    }
    return normalized;
  }
  // Local form: drop the trunk 0, then re-check — "025761234567" is a country code
  // behind a trunk prefix and must not end up with the code applied twice.
  if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
    if (SUPPORTED_DIAL_CODES.some(code => normalized.startsWith(code))) return normalized;
  }
  return DEFAULT_DIAL_CODE + normalized;
}

function isSupportedPhone(phone: string): boolean {
  const raw = phone.replace(/[\s\-()+]/g, "");
  // A local number with no country code is treated as the default country.
  if (!/^\d+$/.test(raw)) return false;
  const normalized = normalizeAuthPhone(phone);
  return SUPPORTED_DIAL_CODES.some(code => normalized.startsWith(code)) && normalized.length >= 10;
}

// --- Firebase phone verification -------------------------------------------------
// A browser saying "I verified this phone" is worthless: anyone can POST that. Firebase
// returns a signed ID token, and we verify that signature against Google's public keys
// here, then take the phone number FROM THE TOKEN — never from the request body.
let firebaseKeyCache: { keys: Record<string, CryptoKey>; expires: number } | null = null;

async function firebasePublicKeys(): Promise<Record<string, CryptoKey>> {
  if (firebaseKeyCache && Date.now() < firebaseKeyCache.expires) return firebaseKeyCache.keys;
  const response = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("Could not fetch verification keys");
  const body = await response.json() as { keys: Record<string, unknown>[] };
  const keys: Record<string, CryptoKey> = {};
  for (const jwk of body.keys || []) {
    if (!jwk.kid) continue;
    try {
      keys[String(jwk.kid)] = await crypto.subtle.importKey("jwk", jwk as unknown as Parameters<typeof crypto.subtle.importKey>[1],
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    } catch (error) { console.error("Bad Firebase JWK:", error); }
  }
  // Respect cache-control when present; an hour is a safe floor.
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") || "")?.[1] || 3600);
  firebaseKeyCache = { keys, expires: Date.now() + Math.max(maxAge, 300) * 1000 };
  return keys;
}

/** Returns the verified phone number from a Firebase ID token, or null. */
async function verifyFirebasePhoneToken(idToken: string, projectId: string): Promise<string | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(fromB64url(parts[0])) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) return null;
    const key = (await firebasePublicKeys())[header.kid];
    if (!key) return null;
    const signature = Uint8Array.from(fromB64url(parts[2]), char => char.charCodeAt(0));
    const signed = encoder.encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed))) return null;
    const claims = JSON.parse(fromB64url(parts[1])) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (claims.aud !== projectId) return null;
    if (Number(claims.exp || 0) <= now) return null;
    if (Number(claims.iat || 0) > now + 300) return null;
    if (!claims.sub) return null;
    // Must be a PHONE sign-in; an email or anonymous token must not reset a password.
    const phone = String(claims.phone_number || "").trim();
    return phone || null;
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}

// --- Admin authentication -------------------------------------------------------
// The normal session token is unsigned base64 JSON (`nz_<base64>`), so any client can
// forge another user's id. That is survivable for a buyer reading their own orders; it
// is not survivable for an endpoint that can grant verification. Admin therefore gets
// its own HMAC-signed token, verified on every request, and the admin role is always
// re-read from the database rather than trusted from the token body.
const encoder = new TextEncoder();

async function adminKey(env: Env) {
  return crypto.subtle.importKey('raw', encoder.encode(`admin:${env.SUPABASE_SERVICE_KEY}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
};

async function createAdminToken(env: Env, userId: number) {
  const body = b64url(encoder.encode(JSON.stringify({ id: userId, role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 })));
  const signature = await crypto.subtle.sign('HMAC', await adminKey(env), encoder.encode(body));
  return `nzadm_${body}.${b64url(signature)}`;
}

async function readAdminToken(env: Env, token: string | null): Promise<{ id: number } | null> {
  if (!token?.startsWith('nzadm_')) return null;
  const [body, signature] = token.slice(6).split('.');
  if (!body || !signature) return null;
  const expected = await crypto.subtle.sign('HMAC', await adminKey(env), encoder.encode(body));
  // Constant-time-ish compare via the WebCrypto verify primitive.
  const sigBytes = Uint8Array.from(fromB64url(signature), char => char.charCodeAt(0));
  const ok = await crypto.subtle.verify('HMAC', await adminKey(env), sigBytes, encoder.encode(body));
  if (!ok || sigBytes.byteLength !== new Uint8Array(expected).byteLength) return null;
  try {
    const payload = JSON.parse(fromB64url(body)) as { id?: number; exp?: number };
    if (!payload.id || !payload.exp || Date.now() > payload.exp) return null;
    return { id: Number(payload.id) };
  } catch { return null; }
}

/**
 * A storefront's badge follows its owner.
 *
 * Documents belong to the person, not the shopfront: one seller can own many stores
 * (one owner here has eight), so checking their ID once has to badge all of them. The
 * per-store toggle still exists to revoke a single misbehaving storefront by hand —
 * this only fires when the OWNER's status changes.
 */
async function syncStoreBadges(env: Env, sellerId: number, verified: boolean) {
  try {
    await supabasePatch(env, "stores", `seller_id=eq.${sellerId}`, { is_verified: verified });
  } catch (error) {
    // Never fail the owner's decision because the badge sync failed — the decision is
    // what matters and the badge can be re-synced.
    console.error("Store badge sync failed:", error);
  }
}

/** Returns the admin's user row, or a Response to return immediately. */
async function requireAdmin(request: Request, env: Env): Promise<{ admin: Record<string, unknown> } | { error: Response }> {
  const session = await readAdminToken(env, request.headers.get('Authorization')?.replace(/^Bearer /, '') || null);
  if (!session) return { error: json({ error: "Admin sign-in required" }, 401) };
  // Role is authoritative from the database, never from the token.
  const rows = await supabaseGet(env, "marketplace_users", `id=eq.${session.id}&role=eq.admin&select=id,name,phone,role&limit=1`) as Record<string, unknown>[];
  if (!rows.length) return { error: json({ error: "Admin access required" }, 403) };
  return { admin: rows[0] };
}

async function createAuthSession(env: Env, userId: number, phone: string) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessToken = `nz_${await signSession(env, { id: userId, phone, exp: expiresAt })}`;
  // The old refresh token was literally `nz_refresh_<id>`: guessable, so anyone could mint
  // a full session for any account. It is signed and expiring now.
  const refreshToken = `nz_refresh_${await signSession(env, { id: userId, kind: 'refresh', exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })}`;
  return {
    accessToken,
    refreshToken,
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
      // Name the field that is actually missing — this message claimed name/role/password
      // while also rejecting a blank phone, which sent people hunting the wrong field.
      const missing = (["name", "role", "password", "phone"] as const).filter(field => !body[field]);
      if (missing.length) {
        return json({ error: `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required` }, 400);
      }
      if (body.phone && !isSupportedPhone(body.phone)) return json({ error: "Enter a valid Burundi (+257) or Rwanda (+250) phone number" }, 400);
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
      const session = await createAuthSession(env, profile.id, normalizedPhone);
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
      if (!isSupportedPhone(body.phone)) return json({ error: "Enter a valid Burundi (+257) or Rwanda (+250) phone number" }, 400);
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
      const session = await createAuthSession(env, Number(user.id), normalizedPhone);
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
      const match = body.refreshToken.match(/^nz_refresh_(.+)$/);
      if (!match) {
        return json({ error: "Invalid refresh token" }, 401);
      }
      // Signed refresh tokens carry the id; legacy `nz_refresh_<id>` is only honoured
      // while the legacy flag is on, because the id alone is guessable.
      const rawRefresh = match[1];
      let userId: number;
      if (rawRefresh.includes('.')) {
        const verified = await verifySession(env, rawRefresh);
        if (!verified?.id || verified.kind !== 'refresh' || (verified.exp != null && Date.now() > Number(verified.exp))) {
          return json({ error: "Invalid refresh token" }, 401);
        }
        userId = Number(verified.id);
      } else {
        if (!ACCEPT_LEGACY_REFRESH_TOKENS || !/^\d+$/.test(rawRefresh)) return json({ error: "Invalid refresh token" }, 401);
        userId = parseInt(rawRefresh);
      }
      const users = await supabaseGet(env, "marketplace_users", `id=eq.${userId}&limit=1`) as Record<string, unknown>[];
      if (!users.length) {
        return json({ error: "User not found" }, 401);
      }
      const session = await createAuthSession(env, userId, users[0].phone as string);
      return json({ session });
    } catch (error) {
      console.error("Refresh error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  }

  if (path === "/api/auth/me" && method === "GET") {
    try {
      // Must go through authPayload: a signed token is `nz_<body>.<sig>`, and hand-rolled
      // atob() on that throws on the '.', which rejected every signed token and logged
      // users out at startup — both apps validate their session against this route.
      const payload = await authPayload(request, env);
      if (!payload?.id) {
        return json({ error: "Not authenticated" }, 401);
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
      // Signed tokens contain a '.', which hand-rolled atob() cannot parse; use the helper.
      const payload = await authPayload(request, env);
      if (!payload?.id) return json({ error: "Invalid or expired token" }, 401);
      const body = await request.json() as Record<string, unknown>;
      if (typeof body.deliveryPhone === "string" && body.deliveryPhone && !isSupportedPhone(body.deliveryPhone)) return json({ error: "Enter a valid Burundi (+257) or Rwanda (+250) phone number" }, 400);
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
      // Signed tokens contain a '.', which hand-rolled atob() cannot parse; use the helper.
      const payload = await authPayload(request, env);
      const body = await request.json() as { currentPassword?: string; newPassword?: string };
      if (!payload?.id || !body.currentPassword || !body.newPassword || body.newPassword.length < 6) return json({ error: "Current and new passwords are required" }, 400);
      const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
      if (!users.length || !(await verifyPassword(body.currentPassword, String(users[0].password_hash || '')))) return json({ error: "Current password is incorrect" }, 401);
      await supabasePatch(env, "marketplace_users", `id=eq.${payload.id}`, { password_hash: await hashPassword(body.newPassword) });
      return json({ message: "Password updated" });
    } catch { return json({ error: "Could not update password" }, 500); }
  }

  if (path === "/api/profiles/account" && method === "DELETE") {
    try {
      // Signed tokens contain a '.', which hand-rolled atob() cannot parse; use the helper.
      const payload = await authPayload(request, env);
      if (!payload?.id) return json({ error: "Invalid token" }, 401);
      await supabaseDelete(env, "marketplace_users", `id=eq.${payload.id}`);
      return json({ message: "Account deleted" });
    } catch { return json({ error: "Could not delete account" }, 500); }
  }

  // POST /api/auth/reset-password — self-service, proven by a Firebase phone OTP.
  // The phone comes from the verified token, never from the request body, so a caller
  // cannot reset an account they do not control.
  if (path === "/api/auth/reset-password" && method === "POST") {
    if (!env.FIREBASE_PROJECT_ID) return json({ error: "Phone verification is not configured yet" }, 503);
    const body = await readJson<{ idToken?: string; newPassword?: string }>(request);
    if (!body?.idToken) return json({ error: "Phone verification is required" }, 400);
    if (!body.newPassword || String(body.newPassword).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    const verifiedPhone = await verifyFirebasePhoneToken(String(body.idToken), env.FIREBASE_PROJECT_ID);
    if (!verifiedPhone) return json({ error: "Phone verification failed or expired. Request a new code." }, 401);
    const phone = normalizeAuthPhone(verifiedPhone);
    const users = await supabaseGet(env, "marketplace_users", `phone=eq.${encodeURIComponent(phone)}&select=id,name,role&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "No account exists for this number" }, 404);
    // An admin password is not resettable over SMS: the admin panel can grant verification
    // and suspend accounts, so it should not hinge on possession of a SIM.
    if (String(users[0].role) === "admin") return json({ error: "This account cannot be reset this way. Contact support." }, 403);
    await supabasePatch(env, "marketplace_users", `id=eq.${users[0].id}`, { password_hash: await hashPassword(String(body.newPassword)) });
    // Close any open manual request for the same person; they have solved it themselves.
    try {
      await supabasePatch(env, "password_reset_requests", `user_id=eq.${users[0].id}&status=eq.open`, {
        status: "resolved", handled_at: new Date().toISOString(), admin_note: "Reset by the user via phone verification",
      });
    } catch (error) { console.error("Could not close reset requests:", error); }
    await createNotification(env, Number(users[0].id), "account", "Your password was changed",
      "Your password was reset after verifying your phone number. If this was not you, contact support immediately.",
      "/account", { via: "phone_otp" });
    return json({ success: true, message: "Password updated. You can sign in with it now." });
  }

  // POST /api/auth/password-reset-request — public. A locked-out user files a request;
  // an admin checks it against the documents on file and issues a new password.
  if (path === "/api/auth/password-reset-request" && method === "POST") {
    const body = await readJson<{ phone?: string; fullName?: string; details?: string }>(request);
    if (!body?.phone || !String(body.phone).trim()) return json({ error: "Phone number is required" }, 400);
    const phone = normalizeAuthPhone(String(body.phone));
    const users = await supabaseGet(env, "marketplace_users", `phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`) as Record<string, unknown>[];
    try {
      await supabasePost(env, "password_reset_requests", {
        // Null when the number matches nothing — the response is identical either way so
        // this form cannot be used to discover which numbers are registered.
        user_id: users.length ? Number(users[0].id) : null,
        phone,
        full_name: String(body.fullName || "").slice(0, 200).trim() || null,
        details: String(body.details || "").slice(0, 2000).trim() || null,
      });
    } catch (error) { console.error("Password reset request failed:", error); }
    return json({ success: true, message: "Your request has been sent. An administrator will contact you on this number." });
  }

  // ===== Admin =====================================================================
  // Every route below re-reads role='admin' from the database on each request and
  // requires an HMAC-signed admin token. The ordinary session token is not accepted.

  if (path === "/api/admin/login" && method === "POST") {
    const body = await request.json() as { phone?: string; password?: string };
    if (!body.phone || !body.password) return json({ error: "Phone and password are required" }, 400);
    // Accept +257…, 0…, 257… or a bare local number, the same way signup normalises it.
    // Without this, the exact string a person types has to match what was stored.
    const adminPhone = normalizeAuthPhone(body.phone);
    const users = await supabaseGet(env, "marketplace_users", `phone=eq.${encodeURIComponent(adminPhone)}&select=id,name,phone,role,password_hash&limit=1`) as Record<string, unknown>[];
    // Same message either way so this cannot be used to enumerate admin accounts.
    const denied = json({ error: "Invalid credentials" }, 401);
    if (!users.length || String(users[0].role) !== "admin") return denied;
    if (!(await verifyPassword(body.password, String(users[0].password_hash || "")))) return denied;
    return json({
      token: await createAdminToken(env, Number(users[0].id)),
      admin: { id: users[0].id, name: users[0].name, phone: users[0].phone },
    });
  }

  if (path === "/api/admin/me" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    return json({ admin: { id: guard.admin.id, name: guard.admin.name, phone: guard.admin.phone } });
  }

  if (path === "/api/admin/stats" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const users = await supabaseGet(env, "marketplace_users", "select=id,role,verified,verification_status") as Record<string, unknown>[];
    const orders = await supabaseGet(env, "marketplace_orders", "select=id,total,status") as Record<string, unknown>[];
    const products = await supabaseGet(env, "new_products", "select=id,status&store_id=not.is.null") as Record<string, unknown>[];
    const stores = await supabaseGet(env, "stores", "select=id,is_verified") as Record<string, unknown>[];
    // Open recovery requests sit alongside pending verifications as work waiting on an
    // admin, so the dashboard can count both without a second round trip.
    let openPasswordResets = 0;
    try {
      const resets = await supabaseGet(env, "password_reset_requests", "select=id&status=eq.open") as Record<string, unknown>[];
      openPasswordResets = resets.length;
    } catch (error) { console.error("Password reset count unavailable:", error); }
    const by = (role: string) => users.filter(u => String(u.role) === role);
    return json({
      buyers: by("buyer").length,
      sellers: by("seller").length,
      verifiedSellers: by("seller").filter(u => u.verified === true).length,
      verifiedBuyers: by("buyer").filter(u => u.verified === true).length,
      pendingVerifications: users.filter(u => String(u.verification_status) === "pending").length,
      openPasswordResets,
      pendingProducts: products.filter(p => String(p.status) === "pending_review").length,
      // Cancelled orders never took money, so they must not inflate revenue.
      activeOrders: orders.filter(o => !["cancelled", "delivered"].includes(String(o.status))).length,
      stores: stores.length,
      products: products.length,
      orders: orders.length,
      revenue: orders.filter(o => String(o.status) !== "cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0),
    });
  }

  // GET /api/admin/users?role=seller|buyer&status=pending&q=search
  if (path === "/api/admin/users" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const role = url.searchParams.get("role");
    const status = url.searchParams.get("status");
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    let filter = "select=id,name,phone,role,verified,verification_status,verification_submitted_at,verification_note,verification_reviewed_at,verification_submission_note,business_name,location,created_at&order=id.desc";
    if (role === "seller" || role === "buyer" || role === "admin") filter += `&role=eq.${role}`;
    if (status) filter += `&verification_status=eq.${encodeURIComponent(status)}`;
    const rows = await supabaseGet(env, "marketplace_users", filter) as Record<string, unknown>[];
    const visible = search
      ? rows.filter(u => `${u.name || ""} ${u.phone || ""} ${u.business_name || ""}`.toLowerCase().includes(search))
      : rows;
    return json({ users: visible.slice(0, 200) });
  }

  // GET /api/admin/verifications/:id — one applicant with their documents and history
  const adminVerificationMatch = path.match(/^\/api\/admin\/verifications\/(\d+)$/);
  if (adminVerificationMatch && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(adminVerificationMatch[1]);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${id}&select=id,name,phone,role,verified,verification_status,verification_submitted_at,verification_note,verification_reviewed_at,verification_submission_note,business_name,business_description,location,province,avatar,created_at&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "User not found" }, 404);
    let documents: Record<string, unknown>[] = [];
    try {
      documents = await supabaseGet(env, "seller_verification_documents", `user_id=eq.${id}&order=uploaded_at.desc`) as Record<string, unknown>[];
    } catch (error) { console.error("Verification documents unavailable:", error); }
    let history: Record<string, unknown>[] = [];
    try {
      history = await supabaseGet(env, "verification_reviews", `user_id=eq.${id}&order=created_at.desc`) as Record<string, unknown>[];
    } catch (error) { console.error("Verification history unavailable:", error); }
    // The reviewer needs to see the actual business before approving it: the stores this
    // seller runs, links to the live storefronts, and what they are selling.
    let stores: Record<string, unknown>[] = [];
    let products: Record<string, unknown>[] = [];
    try {
      const storeRows = await supabaseGet(env, "stores", `seller_id=eq.${id}&select=id,name,slug,description,is_verified,created_at,commune,province`) as Record<string, unknown>[];
      stores = storeRows.map(store => ({
        ...store,
        url: store.slug ? `${STOREFRONT_BASE}/store/${store.slug}` : `${STOREFRONT_BASE}/stores`,
      }));
      if (storeRows.length) {
        const ids = storeRows.map(store => Number(store.id)).filter(Boolean);
        const rows = await supabaseGet(env, "new_products", `store_id=in.(${ids.join(",")})&select=id,name,base_price,stock_quantity,primary_image,store_id,created_at&order=id.desc&limit=60`) as Record<string, unknown>[];
        const storeNameById = new Map(storeRows.map(store => [Number(store.id), String(store.name || "")]));
        products = rows.map(product => ({
          id: 1000000 + Number(product.id),
          name: product.name,
          price: Number(product.base_price || 0),
          stock: Number(product.stock_quantity || 0),
          image: product.primary_image || "",
          storeName: storeNameById.get(Number(product.store_id)) || "",
        }));
      }
    } catch (error) { console.error("Seller stores/products unavailable:", error); }
    return json({ user: users[0], documents, history, stores, products });
  }

  // POST /api/admin/verifications/:id/decision { decision, note }
  const adminDecisionMatch = path.match(/^\/api\/admin\/verifications\/(\d+)\/decision$/);
  if (adminDecisionMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(adminDecisionMatch[1]);
    const body = await request.json() as { decision?: string; note?: string };
    const decision = String(body.decision || "");
    if (!["approved", "rejected", "suspended"].includes(decision)) return json({ error: "decision must be approved, rejected or suspended" }, 400);
    const note = String(body.note || "").slice(0, 2000).trim();
    // A refusal must explain itself: the seller has to know what to fix.
    if (decision !== "approved" && !note) return json({ error: "A note is required so the seller knows what to do next" }, 400);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${id}&select=id,name,role&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "User not found" }, 404);
    const now = new Date().toISOString();
    await supabasePatch(env, "marketplace_users", `id=eq.${id}`, {
      verified: decision === "approved",
      verification_status: decision,
      verification_note: note || null,
      verification_reviewed_at: now,
      verification_reviewed_by: Number(guard.admin.id),
    });
    // Approving a seller also badges their storefronts, which is what buyers see.
    if (String(users[0].role) === "seller") await syncStoreBadges(env, id, decision === "approved");
    try { await supabasePost(env, "verification_reviews", { user_id: id, reviewer_id: Number(guard.admin.id), decision, note: note || null }); }
    catch (error) { console.error("Verification audit write failed:", error); }
    // Tell the applicant what was decided and what to do next.
    const titles: Record<string, string> = { approved: "Your account is verified", rejected: "Verification needs changes", suspended: "Your account has been suspended" };
    const bodies: Record<string, string> = {
      approved: note || "Your documents were approved. Your verified badge is now visible to buyers.",
      rejected: note,
      suspended: note,
    };
    await createNotification(env, id, "verification", titles[decision], bodies[decision],
      "https://seller-central.pages.dev/seller-central/verification", { decision, reviewedAt: now });
    return json({ success: true, id, decision, verified: decision === "approved", note: note || null, reviewedAt: now });
  }

  // GET /api/admin/password-resets?status=open
  if (path === "/api/admin/password-resets" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const status = url.searchParams.get("status") || "open";
    const filter = status === "all" ? "order=created_at.desc&limit=200" : `status=eq.${encodeURIComponent(status)}&order=created_at.desc&limit=200`;
    const rows = await supabaseGet(env, "password_reset_requests", filter) as Record<string, unknown>[];
    // Attach who the requester is, and whether they have documents on file to check against.
    const ids = [...new Set(rows.map(row => Number(row.user_id)).filter(Boolean))];
    const usersById = new Map<number, Record<string, unknown>>();
    const docCount = new Map<number, number>();
    if (ids.length) {
      const users = await supabaseGet(env, "marketplace_users", `id=in.(${ids.join(",")})&select=id,name,phone,role,business_name,verified,verification_status`) as Record<string, unknown>[];
      for (const user of users) usersById.set(Number(user.id), user);
      try {
        const docs = await supabaseGet(env, "seller_verification_documents", `user_id=in.(${ids.join(",")})&select=user_id`) as Record<string, unknown>[];
        for (const doc of docs) docCount.set(Number(doc.user_id), (docCount.get(Number(doc.user_id)) || 0) + 1);
      } catch (error) { console.error("Document count unavailable:", error); }
    }
    return json({
      requests: rows.map(row => ({
        ...row,
        user: row.user_id ? usersById.get(Number(row.user_id)) || null : null,
        documentCount: row.user_id ? (docCount.get(Number(row.user_id)) || 0) : 0,
      })),
    });
  }

  // POST /api/admin/password-resets/:id/issue — generate a new password for the account.
  // The password is generated here, never chosen by the admin and never stored in plain
  // text; it is returned exactly once for the admin to pass on.
  const resetIssueMatch = path.match(/^\/api\/admin\/password-resets\/(\d+)\/issue$/);
  if (resetIssueMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(resetIssueMatch[1]);
    const rows = await supabaseGet(env, "password_reset_requests", `id=eq.${id}&limit=1`) as Record<string, unknown>[];
    if (!rows.length) return json({ error: "Request not found" }, 404);
    if (String(rows[0].status) !== "open") return json({ error: "This request has already been handled" }, 400);
    if (!rows[0].user_id) return json({ error: "No account exists for this number, so there is no password to reset" }, 400);
    const userId = Number(rows[0].user_id);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${userId}&select=id,role&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "Account no longer exists" }, 404);
    if (String(users[0].role) === "admin") return json({ error: "Administrator passwords cannot be reset from here" }, 403);
    // Unambiguous alphabet: no O/0, I/l/1 — this gets read aloud over the phone.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const tempPassword = [...bytes].map(b => alphabet[b % alphabet.length]).join("");
    await supabasePatch(env, "marketplace_users", `id=eq.${userId}`, { password_hash: await hashPassword(tempPassword) });
    await supabasePatch(env, "password_reset_requests", `id=eq.${id}`, {
      status: "resolved", handled_by: Number(guard.admin.id), handled_at: new Date().toISOString(),
      admin_note: "New password issued",
    });
    await createNotification(env, userId, "account", "Your password was reset",
      "An administrator issued you a new password. Sign in with it, then change it from your account settings.",
      "/account", { resetRequestId: id });
    return json({ success: true, id, temporaryPassword: tempPassword });
  }

  // POST /api/admin/password-resets/:id/reject { note }
  const resetRejectMatch = path.match(/^\/api\/admin\/password-resets\/(\d+)\/reject$/);
  if (resetRejectMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(resetRejectMatch[1]);
    const body = await readJson<{ note?: string }>(request);
    const note = String(body?.note || "").slice(0, 2000).trim();
    if (!note) return json({ error: "A reason is required" }, 400);
    const rows = await supabaseGet(env, "password_reset_requests", `id=eq.${id}&limit=1`) as Record<string, unknown>[];
    if (!rows.length) return json({ error: "Request not found" }, 404);
    await supabasePatch(env, "password_reset_requests", `id=eq.${id}`, {
      status: "rejected", handled_by: Number(guard.admin.id), handled_at: new Date().toISOString(), admin_note: note,
    });
    if (rows[0].user_id) {
      await createNotification(env, Number(rows[0].user_id), "account", "Password reset request declined", note, "/account", { resetRequestId: id });
    }
    return json({ success: true, id });
  }

  // ===== Translation ================================================================
  // Machine translation for SELLER-AUTHORED content only — store names, descriptions,
  // product titles. The app's own UI is hand-translated (see each app's lib/i18n) and
  // must never be sent here: the model is demonstrably weak on commerce copy, rendering
  // "checked before it ships" as "before the shipwreck" and "solid wood" as "green metal".
  // Callers are expected to label the result as machine-translated and keep the original
  // reachable.
  //
  // POST /api/translate { texts: string[], to: 'fr'|'sw'|'en', from?: 'fr'|'sw'|'en' }
  if (path === "/api/translate" && method === "POST") {
    if (!env.AI) return json({ error: "Translation is not configured" }, 503);
    const body = await readJson<{ texts?: unknown; to?: string; from?: string }>(request);
    const langs = ["fr", "sw", "en"];
    const to = String(body?.to || "");
    const from = String(body?.from || "en");
    if (!langs.includes(to)) return json({ error: "'to' must be fr, sw or en" }, 400);
    if (!langs.includes(from)) return json({ error: "'from' must be fr, sw or en" }, 400);

    const texts = Array.isArray(body?.texts) ? body.texts.map(t => String(t ?? "")) : [];
    if (!texts.length) return json({ error: "'texts' must be a non-empty array" }, 400);
    // Bounded so one request cannot burn the daily Workers AI allowance.
    if (texts.length > 50) return json({ error: "At most 50 texts per request" }, 400);
    if (texts.some(t => t.length > 2000)) return json({ error: "Each text must be under 2000 characters" }, 400);

    // Same language in and out is a no-op; never spend a model call on it.
    if (from === to) return json({ translations: texts, cached: texts.length, translated: 0 });

    const cache = caches.default;
    const out: string[] = new Array(texts.length);
    let cachedCount = 0;
    const pending: number[] = [];

    // Seller copy barely changes, so a cache hit is the common case. Keyed on the exact
    // text plus direction, in a URL the Cache API accepts.
    const keyFor = async (text: string) => {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${from}:${to}:${text}`));
      const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
      return new Request(`https://translate.nzanila.internal/${hex}`);
    };

    await Promise.all(texts.map(async (text, i) => {
      if (!text.trim()) { out[i] = text; cachedCount++; return; }
      try {
        const hit = await cache.match(await keyFor(text));
        if (hit) { out[i] = await hit.text(); cachedCount++; return; }
      } catch (error) { console.error("Translation cache read failed:", error); }
      pending.push(i);
    }));

    for (const i of pending) {
      try {
        const result = await env.AI.run("@cf/meta/m2m100-1.2b", {
          text: texts[i], source_lang: from, target_lang: to,
        }) as { translated_text?: string };
        // Falling back to the original is the right failure mode: the buyer sees the
        // seller's own words rather than an error or an empty string.
        out[i] = result?.translated_text || texts[i];
        try {
          await cache.put(await keyFor(texts[i]),
            new Response(out[i], { headers: { "Cache-Control": "public, max-age=2592000" } }));
        } catch (error) { console.error("Translation cache write failed:", error); }
      } catch (error) {
        console.error("Translation failed:", error);
        out[i] = texts[i];
      }
    }

    return json({
      translations: out,
      from, to,
      cached: cachedCount,
      translated: pending.length,
      machineTranslated: true,
    });
  }

  // ===== Catalogue moderation ======================================================
  // Sellers submit products as `pending_review`; nothing surfaced them to an admin before,
  // so approvals silently piled up. Listing and deciding both live here.

  // GET /api/admin/products?status=pending_review|approved|rejected|all&q=search
  if (path === "/api/admin/products" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const status = url.searchParams.get("status") || "pending_review";
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    let filter = "select=id,name,slug,base_price,compare_at_price,currency,stock_quantity,condition,status,primary_image,seller_id,store_id,category_id,brand,submitted_at,approved_at,created_at,views,total_sales,rating&order=created_at.desc&limit=200";
    if (status !== "all") filter += `&status=eq.${encodeURIComponent(status)}`;
    const rows = await supabaseGet(env, "new_products", filter) as Record<string, unknown>[];

    // Attach the seller and the store so an admin can judge a listing without opening it.
    const sellerIds = [...new Set(rows.map(r => Number(r.seller_id)).filter(Boolean))];
    const storeIds = [...new Set(rows.map(r => Number(r.store_id)).filter(Boolean))];
    const sellers = new Map<number, Record<string, unknown>>();
    const stores = new Map<number, Record<string, unknown>>();
    if (sellerIds.length) {
      const found = await supabaseGet(env, "marketplace_users", `id=in.(${sellerIds.join(",")})&select=id,name,business_name,phone,verified,verification_status`) as Record<string, unknown>[];
      for (const row of found) sellers.set(Number(row.id), row);
    }
    if (storeIds.length) {
      const found = await supabaseGet(env, "stores", `id=in.(${storeIds.join(",")})&select=id,name,slug,is_verified`) as Record<string, unknown>[];
      for (const row of found) stores.set(Number(row.id), row);
    }

    const products = rows.map(row => ({
      ...row,
      seller: row.seller_id ? sellers.get(Number(row.seller_id)) || null : null,
      store: row.store_id ? stores.get(Number(row.store_id)) || null : null,
    })).filter(row => !search || `${row.name || ""} ${row.brand || ""} ${(row.seller as any)?.name || ""} ${(row.store as any)?.name || ""}`.toLowerCase().includes(search));

    return json({ products });
  }

  // POST /api/admin/products/:id/decision { decision: 'approved'|'rejected', note }
  const productDecisionMatch = path.match(/^\/api\/admin\/products\/(\d+)\/decision$/);
  if (productDecisionMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(productDecisionMatch[1]);
    const body = await readJson<{ decision?: string; note?: string }>(request);
    const decision = String(body?.decision || "");
    if (!["approved", "rejected"].includes(decision)) return json({ error: "Decision must be 'approved' or 'rejected'" }, 400);
    const note = String(body?.note || "").slice(0, 2000).trim();
    // A refusal without a reason leaves the seller with nothing to act on.
    if (decision === "rejected" && !note) return json({ error: "A reason is required when refusing a listing" }, 400);

    const rows = await supabaseGet(env, "new_products", `id=eq.${id}&select=id,name,seller_id,status&limit=1`) as Record<string, unknown>[];
    if (!rows.length) return json({ error: "Product not found" }, 404);
    const now = new Date().toISOString();
    await supabasePatch(env, "new_products", `id=eq.${id}`, {
      status: decision,
      approved_at: decision === "approved" ? now : null,
      updated_at: now,
    });
    if (rows[0].seller_id) {
      // Say plainly what happened and what to do about it: a refused listing is hidden
      // from buyers, and the seller should either fix it or delete it.
      await createNotification(env, Number(rows[0].seller_id), "product",
        decision === "approved" ? "Your listing is live" : "Your listing is hidden from buyers",
        decision === "approved"
          ? `"${rows[0].name}" has been approved and is now visible to buyers.`
          : `"${rows[0].name}" is no longer shown to buyers. Reason: ${note} Please fix it or delete it from your products.`,
        "/seller-central/products", { productId: id, decision });
    }
    return json({ success: true, id, decision, note: note || null, reviewedAt: now });
  }

  // ===== Orders =====================================================================

  // GET /api/admin/orders?status=&q=
  if (path === "/api/admin/orders" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const status = url.searchParams.get("status") || "all";
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    let filter = "select=id,date,status,total,shipping_fee,item_count,buyer_name,destination,user_id,fulfillment_method&order=date.desc&limit=200";
    if (status !== "all") filter += `&status=eq.${encodeURIComponent(status)}`;
    const rows = await supabaseGet(env, "marketplace_orders", filter) as Record<string, unknown>[];

    const buyerIds = [...new Set(rows.map(r => Number(r.user_id)).filter(Boolean))];
    const buyers = new Map<number, Record<string, unknown>>();
    if (buyerIds.length) {
      const found = await supabaseGet(env, "marketplace_users", `id=in.(${buyerIds.join(",")})&select=id,name,phone,role`) as Record<string, unknown>[];
      for (const row of found) buyers.set(Number(row.id), row);
    }

    const orders = rows.map(row => ({
      ...row,
      buyer: row.user_id ? buyers.get(Number(row.user_id)) || null : null,
    })).filter(row => !search || `${row.id} ${row.buyer_name || ""} ${(row.buyer as any)?.name || ""} ${row.destination || ""}`.toLowerCase().includes(search));

    return json({ orders });
  }

  // GET /api/admin/orders/:id — the order, its lines, its buyer and any shipping record.
  const adminOrderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (adminOrderMatch && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(adminOrderMatch[1]);
    const rows = await supabaseGet(env, "marketplace_orders", `id=eq.${id}&limit=1`) as Record<string, unknown>[];
    if (!rows.length) return json({ error: "Order not found" }, 404);
    const order = rows[0];
    const items = await supabaseGet(env, "marketplace_order_items", `order_id=eq.${id}`) as Record<string, unknown>[];
    let buyer: Record<string, unknown> | null = null;
    if (order.user_id) {
      const found = await supabaseGet(env, "marketplace_users", `id=eq.${Number(order.user_id)}&select=id,name,phone,role,location,verified&limit=1`) as Record<string, unknown>[];
      buyer = found[0] || null;
    }
    let shipping: Record<string, unknown> | null = null;
    try {
      const found = await supabaseGet(env, "marketplace_order_shipping", `order_id=eq.${id}&limit=1`) as Record<string, unknown>[];
      shipping = found[0] || null;
    } catch (error) { console.error("Shipping record unavailable:", error); }
    return json({ order, items, buyer, shipping });
  }

  // ===== Stores =====================================================================

  // GET /api/admin/stores?q=search
  if (path === "/api/admin/stores" && method === "GET") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    const rows = await supabaseGet(env, "stores",
      "select=id,seller_id,name,slug,status,is_verified,province,commune,phone,email,business_category,rating,total_sales,total_revenue,created_at,logo&order=created_at.desc&limit=200") as Record<string, unknown>[];

    const sellerIds = [...new Set(rows.map(r => Number(r.seller_id)).filter(Boolean))];
    const sellers = new Map<number, Record<string, unknown>>();
    if (sellerIds.length) {
      const found = await supabaseGet(env, "marketplace_users", `id=in.(${sellerIds.join(",")})&select=id,name,business_name,phone,verified,verification_status`) as Record<string, unknown>[];
      for (const row of found) sellers.set(Number(row.id), row);
    }

    // One query for product counts beats one per store.
    const productCounts = new Map<number, number>();
    try {
      const products = await supabaseGet(env, "new_products", "select=store_id&store_id=not.is.null&limit=2000") as Record<string, unknown>[];
      for (const row of products) productCounts.set(Number(row.store_id), (productCounts.get(Number(row.store_id)) || 0) + 1);
    } catch (error) { console.error("Product counts unavailable:", error); }

    const stores = rows.map(row => ({
      ...row,
      seller: row.seller_id ? sellers.get(Number(row.seller_id)) || null : null,
      productCount: productCounts.get(Number(row.id)) || 0,
    })).filter(row => !search || `${row.name || ""} ${(row.seller as any)?.name || ""} ${row.province || ""} ${row.commune || ""}`.toLowerCase().includes(search));

    return json({ stores });
  }

  // POST /api/admin/stores/:id/verified { verified }
  const storeVerifyMatch = path.match(/^\/api\/admin\/stores\/(\d+)\/verified$/);
  if (storeVerifyMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(storeVerifyMatch[1]);
    const body = await readJson<{ verified?: boolean }>(request);
    const verified = Boolean(body?.verified);
    const rows = await supabaseGet(env, "stores", `id=eq.${id}&select=id,name,seller_id&limit=1`) as Record<string, unknown>[];
    if (!rows.length) return json({ error: "Store not found" }, 404);
    await supabasePatch(env, "stores", `id=eq.${id}`, { is_verified: verified, updated_at: new Date().toISOString() });
    if (rows[0].seller_id) {
      await createNotification(env, Number(rows[0].seller_id), "store",
        verified ? "Your storefront is verified" : "Storefront verification removed",
        verified
          ? `"${rows[0].name}" now shows the verified badge to buyers.`
          : `The verified badge was removed from "${rows[0].name}". Contact support if you believe this is a mistake.`,
        "/seller-central/stores", { storeId: id, verified });
    }
    return json({ success: true, id, verified });
  }

  // POST /api/admin/users/:id/suspend { suspended, note } — suspend or reinstate anyone.
  // Suspension is an account action, distinct from a document decision: it removes the
  // verified badge and blocks the seller verification flow until it is lifted.
  const adminSuspendMatch = path.match(/^\/api\/admin\/users\/(\d+)\/suspend$/);
  if (adminSuspendMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(adminSuspendMatch[1]);
    if (id === Number(guard.admin.id)) return json({ error: "You cannot suspend your own account" }, 400);
    const body = await readJson<{ suspended?: boolean; note?: string }>(request);
    if (!body) return json({ error: "A body is required" }, 400);
    const suspended = body.suspended === true;
    const note = String(body.note || "").slice(0, 2000).trim();
    if (suspended && !note) return json({ error: "A reason is required so the user knows why" }, 400);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${id}&select=id,role&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "User not found" }, 404);
    if (String(users[0].role) === "admin") return json({ error: "Administrators cannot be suspended here" }, 403);
    const now = new Date().toISOString();
    await supabasePatch(env, "marketplace_users", `id=eq.${id}`, {
      verification_status: suspended ? "suspended" : "not_submitted",
      verified: suspended ? false : undefined,
      verification_note: note || null,
      verification_reviewed_at: now,
      verification_reviewed_by: Number(guard.admin.id),
    });
    // A suspended seller's storefronts stop showing a verified badge.
    if (suspended && String(users[0].role) === "seller") await syncStoreBadges(env, id, false);
    try { await supabasePost(env, "verification_reviews", { user_id: id, reviewer_id: Number(guard.admin.id), decision: suspended ? "suspended" : "reinstated", note: note || null }); }
    catch (error) { console.error("Verification audit write failed:", error); }
    await createNotification(env, id, "verification",
      suspended ? "Your account has been suspended" : "Your account has been reinstated",
      note || (suspended ? "An administrator suspended your account." : "Your account is active again."),
      "/account", { suspended });
    return json({ success: true, id, suspended });
  }

  // POST /api/admin/users/:id/verified { verified } — direct toggle, used for buyers
  const adminVerifyMatch = path.match(/^\/api\/admin\/users\/(\d+)\/verified$/);
  if (adminVerifyMatch && method === "POST") {
    const guard = await requireAdmin(request, env);
    if ("error" in guard) return guard.error;
    const id = Number(adminVerifyMatch[1]);
    const body = await request.json() as { verified?: boolean; note?: string };
    const verified = body.verified === true;
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${id}&select=id,role&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "User not found" }, 404);
    const now = new Date().toISOString();
    await supabasePatch(env, "marketplace_users", `id=eq.${id}`, {
      verified,
      verification_status: verified ? "approved" : "not_submitted",
      verification_reviewed_at: now,
      verification_reviewed_by: Number(guard.admin.id),
      verification_note: String(body.note || "").slice(0, 2000) || null,
    });
    // Verifying from the Users list must badge the storefronts too, exactly as the
    // Verifications queue does — otherwise the two admin paths disagree and stores are
    // left stranded with a verified owner and an unbadged shopfront.
    if (String(users[0].role) === "seller") await syncStoreBadges(env, id, verified);
    try { await supabasePost(env, "verification_reviews", { user_id: id, reviewer_id: Number(guard.admin.id), decision: verified ? "approved" : "revoked", note: String(body.note || "") || null }); }
    catch (error) { console.error("Verification audit write failed:", error); }
    await createNotification(env, id, "verification",
      verified ? "Your account is verified" : "Verification removed",
      String(body.note || "") || (verified ? "An administrator verified your account." : "An administrator removed your verified status."),
      "/account", { verified });
    return json({ success: true, id, verified });
  }

  if (path === "/api/ai/research" && method === "POST") {
    if (!env.GROQ_API_KEY && !env.AI) return json({ error: "AI research is not configured yet" }, 503);
    return researchChat(request, env.GROQ_API_KEY, env.AI, async () => {
      const products = await supabaseGet(env, "new_products", `store_id=not.is.null&${BUYER_VISIBLE}`) as Record<string, unknown>[];
      // slug is pulled so each product can carry its category name in every shipped
      // language; without it a French or Swahili query never matches an English category.
      const catRows = await supabaseGet(env, "categories", "select=id,name,slug") as Record<string, unknown>[];
      const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
      const catSlugById = new Map(catRows.map(c => [Number(c.id), String(c.slug || "")]));
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
          categoryAliases: categoryAliases(
            catSlugById.get(Number(p.category_id)),
            String(catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other"),
          ),
          price: Number(p.base_price || 0),
          moq: Number(p.minimum_order_quantity || 1),
          // rating/image are what the AI result cards render; without them the page threw
          // on product.rating.toFixed(1) as soon as results actually appeared.
          rating: Number(p.rating || 0),
          image: String(p.primary_image || ""),
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
    const filters: string[] = ["store_id=not.is.null", BUYER_VISIBLE];
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

  // --- Product reviews -------------------------------------------------------------
  // The marketplace displayed a review count and sorted by it long before anything could
  // create one: new_products.review_count was read in two places and written in none. These
  // two routes are the missing half.
  //
  // Writing is restricted to a VERIFIED PURCHASE. A buyer may only review a product that
  // appears in one of their own DELIVERED orders, and the entitling order id is stored on
  // the row. Without that gate a review section is just an anonymous comment box.
  const reviewsMatch = path.match(/^\/api\/products\/(\d+)\/reviews$/);

  if (reviewsMatch && method === "GET") {
    const productId = Number(reviewsMatch[1]);
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await supabaseGet(env, "product_reviews", `product_id=eq.${productId}&order=created_at.desc&limit=100`) as Record<string, unknown>[];
    } catch (error) {
      // The table may not exist yet on an environment that has not run the migration.
      // An empty review list is a better answer here than a 500 on the product page.
      console.error("product_reviews unavailable:", error);
      return json({ reviews: [], count: 0, average: 0 });
    }
    const userIds = [...new Set(rows.map(r => Number(r.user_id)).filter(Boolean))];
    const users = userIds.length
      ? await supabaseGet(env, "marketplace_users", `id=in.(${userIds.join(",")})&select=id,name,avatar`) as Record<string, unknown>[]
      : [];
    const userById = new Map(users.map(u => [Number(u.id), u]));
    const ratings = rows.map(r => Number(r.rating)).filter(n => Number.isFinite(n));
    const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return json({
      count: rows.length,
      average: Math.round(average * 10) / 10,
      reviews: rows.map(r => {
        const author = userById.get(Number(r.user_id));
        return {
          id: r.id,
          rating: Number(r.rating),
          body: String(r.body || ""),
          authorName: String(author?.name || "Buyer"),
          authorAvatar: String(author?.avatar || ""),
          createdAt: r.created_at,
        };
      }),
    });
  }

  if (reviewsMatch && method === "POST") {
    const identity = await buyerIdentityForRequest(request, env);
    if (!identity) return json({ error: "Sign in to leave a review" }, 401);
    const productId = Number(reviewsMatch[1]);

    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return json({ error: "A review body is required" }, 400);
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "A rating from 1 to 5 is required" }, 400);
    const text = String(body.body ?? "").trim().slice(0, 2000);

    // Verified purchase: one of this buyer's DELIVERED orders must contain this product.
    const orders = await supabaseGet(env, "marketplace_orders",
      `buyer_name=eq.${encodeURIComponent(identity.token)}&status=eq.delivered&select=id`) as Record<string, unknown>[];
    if (!orders.length) return json({ error: "You can review a product once you have received it" }, 403);
    const orderIds = orders.map(o => Number(o.id));
    const items = await supabaseGet(env, "marketplace_order_items",
      `order_id=in.(${orderIds.join(",")})&product_id=eq.${productId}&select=order_id&limit=1`) as Record<string, unknown>[];
    if (!items.length) return json({ error: "You can review a product once you have received it" }, 403);

    const entitlingOrderId = Number(items[0].order_id);
    const row = { product_id: productId, user_id: identity.id, order_id: entitlingOrderId, rating, body: text || null };

    try {
      // One review per buyer per product; a second submission edits the first rather than
      // stacking duplicates (the table has a UNIQUE constraint on the pair).
      const existing = await supabaseGet(env, "product_reviews",
        `product_id=eq.${productId}&user_id=eq.${identity.id}&select=id&limit=1`) as Record<string, unknown>[];
      if (existing.length) {
        await supabasePatch(env, "product_reviews", `id=eq.${existing[0].id}`, { rating, body: text || null });
      } else {
        await supabasePost(env, "product_reviews", row);
      }
    } catch (error) {
      console.error("product_reviews write failed:", error);
      return json({ error: "Could not save your review" }, 503);
    }

    // Keep the denormalised counters on the product in step, so the card and sort stay
    // truthful without a second query on every listing read.
    try {
      const all = await supabaseGet(env, "product_reviews", `product_id=eq.${productId}&select=rating`) as Record<string, unknown>[];
      const values = all.map(r => Number(r.rating)).filter(n => Number.isFinite(n));
      const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const sourceId = productId >= 1000000 ? productId - 1000000 : productId;
      await supabasePatch(env, "new_products", `id=eq.${sourceId}`, {
        review_count: values.length,
        rating: Math.round(average * 10) / 10,
      });
    } catch (error) {
      console.error("review aggregate update failed:", error);
    }

    return json({ saved: true }, 201);
  }

  // GET /api/products/:id
  const productMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (productMatch && method === "GET") {
    const requestedId = Number(productMatch[1]);
    const sourceId = requestedId >= 1000000 ? requestedId - 1000000 : requestedId;
    const products = await supabaseGet(env, "new_products", `id=eq.${sourceId}&limit=1`) as Record<string, unknown>[];
    if (!products.length) return json({ error: "Not found" }, 404);
    // A refused listing is gone as far as a buyer is concerned, including by direct link —
    // otherwise a shared URL would keep showing something an admin has taken down.
    if (String(products[0].status) === "rejected") return json({ error: "Not found" }, 404);
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
      supabaseGet(env, "new_products", `store_id=not.is.null&${BUYER_VISIBLE}`) as Promise<Record<string, unknown>[]>,
      supabaseGet(env, "categories", "select=id,name,slug") as Promise<Record<string, unknown>[]>,
    ]);
    const catNameById = new Map(catRows.map(c => [Number(c.id), String(c.name || "")]));
    // Name -> slug, so the response can carry the category's name in every shipped
    // language. The client picks one by locale instead of always rendering English.
    const slugByName = new Map(catRows.map(c => [String(c.name || ""), String(c.slug || "")]));
    const counts = new Map<string, number>();
    newProducts.forEach((p: Record<string, unknown>) => {
      const name = String(catNameById.get(Number(p.category_id)) || p.custom_category_suggestion || "Other");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const categories = [...counts.entries()].map(([name, count]) => {
      const slug = slugByName.get(name) || "";
      const names = CATEGORY_I18N[slug];
      return {
        id: name.toLowerCase().replaceAll(" ", "-"),
        slug,
        name,
        // Every shipped language; the client renders names[locale] ?? name.
        names: names ? { fr: names.fr, sw: names.sw, en: names.en } : { fr: name, sw: name, en: name },
        count,
        image: CATEGORY_IMAGES[name] ?? "",
      };
    });
    return json(categories);
  }

  // GET /api/marketplace/summary
  if (path === "/api/marketplace/summary" && method === "GET") {
    const [products, suppliers, orders] = await Promise.all([
      supabaseGet(env, "new_products", `select=id&${BUYER_VISIBLE}`),
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
    const allNewProducts = await supabaseGet(env, "new_products", `select=id,store_id&${BUYER_VISIBLE}`) as Record<string, unknown>[];
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

  // DELETE /api/stores/:id — the seller UI has always called this to remove a store,
  // but no handler existed here, so the request 404'd and the dialog just reported
  // "Could not delete this store." Cascades to the store's products and their pictures
  // so a deleted store doesn't leave orphaned rows behind.
  if (storeSlugMatch && method === "DELETE" && /^\d+$/.test(storeSlugMatch[1])) {
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Not authenticated" }, 401);
    const storeId = Number(storeSlugMatch[1]);
    const stores = await supabaseGet(env, "stores", `id=eq.${storeId}&select=id,seller_id&limit=1`) as Record<string, unknown>[];
    if (!stores.length) return json({ error: "Store not found" }, 404);
    if (Number(stores[0].seller_id) !== Number(payload.id)) return json({ error: "You can only delete your own store" }, 403);

    const products = await supabaseGet(env, "new_products", `store_id=eq.${storeId}&select=id&${BUYER_VISIBLE}`) as Record<string, unknown>[];
    const productIds = products.map(p => Number(p.id));
    if (productIds.length) {
      await supabaseDelete(env, "new_product_pictures", `product_id=in.(${productIds.join(",")})`);
      await supabaseDelete(env, "new_products", `id=in.(${productIds.join(",")})`);
    }
    await supabaseDelete(env, "stores", `id=eq.${storeId}`);
    return json({ deleted: true });
  }

  // GET /api/stores/:id/products - Get products for a specific store
  const storeProductsMatch = path.match(/^\/api\/stores\/(\d+)\/products$/);
  // POST /api/stores/:id/products — create a product in one of the seller's own stores.
  // The seller UI has always posted here, but only GET was implemented, so every "Add
  // product" fell through to the 404 handler. Ownership of the store is enforced.
  //
  // The field names below match what the seller-central product wizard actually sends
  // (App.tsx's productBody: base_price, category_id, stock_quantity, ...). An earlier
  // version of this handler read a different shape (price, category, moq, stock, unit,
  // image, images) that the frontend never sent, so Number(undefined) made the price
  // check fail on EVERY submission ("A valid price is required"), and category, stock,
  // photos and delivery options were silently dropped. The older names are still read
  // as fallbacks so any other caller keeps working.
  if (storeProductsMatch && method === "POST") {
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Not authenticated" }, 401);
    const storeId = Number(storeProductsMatch[1]);
    const stores = await supabaseGet(env, "stores", `id=eq.${storeId}&select=id,seller_id&limit=1`) as Record<string, unknown>[];
    if (!stores.length) return json({ error: "Store not found" }, 404);
    if (Number(stores[0].seller_id) !== Number(payload.id)) return json({ error: "You can only add products to your own store" }, 403);

    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return json({ error: "A product body is required" }, 400);
    const productName = String(body.name ?? "").trim();
    if (!productName) return json({ error: "Product name is required" }, 400);
    const rawPrice = body.base_price ?? body.price ?? body.basePrice;
    const productPrice = Number(rawPrice);
    if (!Number.isFinite(productPrice) || productPrice < 0) return json({ error: "A valid price is required" }, 400);

    // The wizard sends a numeric category_id it picked from /api/categories. Only fall
    // back to matching a name when a caller sends a bare category string instead.
    const rawCategoryId = body.category_id ?? body.categoryId;
    let categoryId: number | null = Number.isFinite(Number(rawCategoryId)) && rawCategoryId != null && rawCategoryId !== ""
      ? Number(rawCategoryId)
      : null;
    if (categoryId === null && body.category) {
      const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
      const catIdByName = new Map(catRows.map(c => [String(c.name || "").toLowerCase(), Number(c.id)]));
      categoryId = catIdByName.get(String(body.category).toLowerCase()) ?? null;
    }

    const rawCompareAt = body.compare_at_price ?? body.compareAtPrice;
    const compareAtPrice = rawCompareAt != null && rawCompareAt !== "" && Number.isFinite(Number(rawCompareAt))
      ? Number(rawCompareAt)
      : null;

    const galleryInput = Array.isArray(body.product_images) ? body.product_images
      : Array.isArray(body.images) ? body.images
      : [];
    const gallery = galleryInput.filter((image): image is string => typeof image === "string" && !!image).slice(0, 8);
    // No stock photo stand-in: a random unrelated image on a seller's product is worse
    // than none, and a catalog of identical filler pictures reads as broken. The
    // storefront renders a clean tile when this is empty.
    const primaryImage = String(body.primary_image ?? body.image ?? gallery[0] ?? "");

    const deliveryAreas = Array.isArray(body.delivery_areas)
      ? body.delivery_areas.filter((area): area is string => typeof area === "string" && !!area)
      : [];

    // slug is NOT NULL; suffix keeps two same-named products from colliding.
    const slug = `${productName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product'}-${Math.random().toString(36).slice(2, 8)}`;

    const [created] = await supabasePost(env, "new_products", {
      name: productName,
      slug,
      store_id: storeId,
      seller_id: Number(payload.id),
      category_id: categoryId,
      custom_category_suggestion: categoryId ? null : (body.category || null),
      base_price: productPrice,
      compare_at_price: compareAtPrice,
      minimum_order_quantity: Number(body.minimum_order_quantity ?? body.moq) || 1,
      stock_quantity: Number(body.stock_quantity ?? body.stock) || 0,
      unit_type: body.unit_type || body.unit || "piece",
      description: body.description || "",
      primary_image: primaryImage,
      // The wizard makes the seller choose at least one of these before it will submit.
      delivery_available: body.delivery_available === true,
      pickup_available: body.pickup_available === true,
      delivery_areas: deliveryAreas,
      preparation_time: body.preparation_time || null,
      status: "approved",
    }) as Record<string, unknown>[];

    // Gallery images, when the seller supplied more than the primary one.
    if (gallery.length) {
      try {
        await supabasePost(env, "new_product_pictures", gallery.map((url, index) => ({
          product_id: Number(created.id), picture_url: url, is_primary: index === 0,
        })));
      } catch (error) { console.error("Product gallery insert failed:", error); }
    }
    return json({ id: 1000000 + Number(created.id), slug, name: productName, storeId, price: productPrice }, 201);
  }

  if (storeProductsMatch && method === "GET") {
    const storeId = Number(storeProductsMatch[1]);
    const products = await supabaseGet(env, "new_products", `store_id=eq.${storeId}&${BUYER_VISIBLE}`) as Record<string, unknown>[];
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
      if (typeof body.phone === "string" && body.phone && !isSupportedPhone(body.phone)) return json({ error: "Enter a valid Burundi (+257) or Rwanda (+250) phone number" }, 400);
    const sellerId = Number(body.sellerId);
    const name = String(body.name || "").trim();
    if (!sellerId || !name) return json({ error: "sellerId and name are required" }, 400);

    const denied = await requireSeller(request, env, sellerId);
    if (denied) return denied;

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `store`;
    const slug = `${baseSlug}-${sellerId}-${Date.now().toString(36)}`;
    // A new shopfront inherits its owner's badge. Without this, an already-verified
    // seller opening a second store got an unbadged one and had to be re-verified by
    // hand — which is how six storefronts here ended up stranded.
    let ownerVerified = false;
    try {
      const owner = await supabaseGet(env, "marketplace_users", `id=eq.${sellerId}&select=verified&limit=1`) as Record<string, unknown>[];
      ownerVerified = owner[0]?.verified === true;
    } catch (error) { console.error("Owner lookup for store badge failed:", error); }
    const [store] = await supabasePost(env, "stores", {
      seller_id: sellerId,
      is_verified: ownerVerified,
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
      // These were being dropped: the seller's uploaded store/office photo, the design
      // they picked, and the map pin. Without them a new store had no identity of its
      // own and fell back to whatever the seller's first store looked like.
      logo: body.logo || null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      store_template: body.storeTemplate || null,
      storefront_config: body.storefrontConfig || null,
    });
    return json({ store }, 201);
  }

  // GET /api/storefront-templates - Template catalog for the storefront builder.
  // Falls through to a 503 on any Supabase error so the builder uses its bundled
  // catalog instead of showing a seller an empty template picker.
  if (path === "/api/storefront-templates" && method === "GET") {
    try {
      const rows = await supabaseGet(
        env,
        "storefront_templates",
        "is_active=eq.true&select=id,name,description,preview_image,category,default_config&order=sort_order.asc",
      );
      return json(
        rows.map((row: Record<string, unknown>) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          preview: row.preview_image ?? "",
          category: row.category ?? "general",
          config: row.default_config,
        })),
      );
    } catch (error) {
      console.error("storefront_templates unavailable:", error);
      return json({ error: "Template catalog unavailable" }, 503);
    }
  }

  // GET/PUT /api/storefront/:storeId — a storefront belongs to ONE store.
  //
  // The older /api/stores/:sellerId/storefront pair below looked the config up with
  // `seller_id=eq.X ... limit=1`, so every store a seller owned served the first store's
  // storefront — a second store rendered the first one's name, logo and tagline — and
  // saving a design for one store overwrote the other. These routes address the store
  // directly, which is the only way a seller can run more than one storefront.
  const storefrontByStore = path.match(/^\/api\/storefront\/(\d+)$/);
  if (storefrontByStore && method === "GET") {
    const storeId = Number(storefrontByStore[1]);
    const stores = await supabaseGet(env, "stores", `id=eq.${storeId}&select=storefront_config,store_template&limit=1`);
    if (!stores.length) return json({ error: "Store not found" }, 404);
    // An empty object counts as no design — some rows were written as `{}` before the
    // config was persisted, and returning that leaves the buyer on a blank storefront.
    const saved = stores[0].storefront_config as { sections?: unknown[] } | null;
    if (saved && Array.isArray(saved.sections) && saved.sections.length) return json(saved);

    // A store with no saved design still gets a real storefront rather than a blank page:
    // the seeded default template, whose {{tokens}} the renderer fills from this store's
    // own record. Stores created before storefront_config was persisted land here.
    try {
      const fallback = await supabaseGet(env, "storefront_templates", "id=eq.default-ready&select=default_config&limit=1");
      if (fallback.length && fallback[0].default_config) return json({ ...(fallback[0].default_config as Record<string, unknown>), storeId });
    } catch (error) {
      console.error("default storefront template unavailable:", error);
    }
    return json({ sections: [], shopSign: null, template: stores[0].store_template || "showcase", storeId });
  }

  if (storefrontByStore && method === "PUT") {
    const storeId = Number(storefrontByStore[1]);
    const stores = await supabaseGet(env, "stores", `id=eq.${storeId}&select=id,seller_id&limit=1`);
    if (!stores.length) return json({ error: "Store not found" }, 404);

    // Only the store's own seller may redesign it.
    const denied = await requireSeller(request, env, Number(stores[0].seller_id));
    if (denied) return denied;

    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = { storefront_config: body };
    if (typeof body.template === "string") update.store_template = body.template;
    await supabasePatch(env, "stores", `id=eq.${storeId}`, update);
    return json({ success: true, config: body });
  }

  // DEPRECATED — kept only so bundles cached before the fix keep working.
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
    const body = await readJson<{ productId: number; quantity?: number }>(request);
    if (!body || !Number.isFinite(Number(body.productId))) return json({ error: "productId is required" }, 400);
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
      createNotification(env, buyer?.id ? Number(buyer.id) : null, "order", `Order #${order.id} placed`, `Your order was received. Shipping fee: ${shippingFee.toLocaleString()} BIF.`, `/orders/${order.id}`, { orderId: order.id, status: "processing", shippingFee }),
      ...sellerIds.map((sellerId: unknown) => createNotification(env, Number(sellerId), "order", `New order #${order.id}`, `A buyer placed a new order. Shipping fee: ${shippingFee.toLocaleString()} BIF.`, `/seller-central/orders/${order.id}`, { orderId: order.id, status: "processing", shippingFee })),
    ]);
    return json(created, 201);
  }

  // ── Seller verification (submission side) ─────────────────────────────────
  // The seller may only ever move themselves to 'pending'. Approving, rejecting and
  // the `verified` flag belong to a human in the admin app, so nothing here writes
  // verified / verification_note / verification_reviewed_*.
  const VERIFICATION_DOC_TYPES = new Set([
    "national_id", "passport", "business_registration", "tax_certificate", "proof_of_address", "other",
  ]);

  // GET /api/seller/verification — the signed-in seller's own status and documents
  if (path === "/api/seller/verification" && method === "GET") {
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Sign in required" }, 401);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "Account not found" }, 404);
    const user = users[0];
    if (String(user.role || "") !== "seller") return json({ error: "Seller account required" }, 403);
    let documents: Record<string, unknown>[] = [];
    try {
      documents = await supabaseGet(env, "seller_verification_documents",
        `user_id=eq.${payload.id}&order=uploaded_at.desc`) as Record<string, unknown>[];
    } catch (error) {
      console.error("Verification document lookup failed:", error);
    }
    return json({
      status: String(user.verification_status || "not_submitted"),
      verified: Boolean(user.verified),
      submittedAt: user.verification_submitted_at ?? null,
      submissionNote: user.verification_submission_note ?? null,
      // Written by the admin when a decision is made; shown to the seller verbatim.
      reviewNote: user.verification_note ?? null,
      reviewedAt: user.verification_reviewed_at ?? null,
      documents: documents.map(doc => ({
        id: doc.id,
        docType: doc.doc_type,
        fileUrl: doc.file_url,
        fileName: doc.file_name,
        uploadedAt: doc.uploaded_at,
      })),
    });
  }

  // POST /api/seller/verification — submit documents for review
  if (path === "/api/seller/verification" && method === "POST") {
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Sign in required" }, 401);
    const users = await supabaseGet(env, "marketplace_users", `id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
    if (!users.length) return json({ error: "Account not found" }, 404);
    const user = users[0];
    if (String(user.role || "") !== "seller") return json({ error: "Seller account required" }, 403);
    // Suspension is an admin decision about the account; resubmitting paperwork must not clear it.
    if (String(user.verification_status || "") === "suspended") {
      return json({ error: "This account is suspended. Please contact support." }, 403);
    }
    // Once approved, the documents are frozen. A submission here replaces the whole set,
    // so without this an approved seller could swap the real ID they were approved on for
    // something else and the approval would no longer stand for anything. Changing an
    // approved seller's paperwork is an admin action, not a self-service one.
    if (String(user.verification_status || "") === "approved") {
      return json({ error: "Your business is already verified. Contact support to change your documents." }, 403);
    }

    const body = await request.json() as { documents?: { docType?: string; fileUrl?: string; fileName?: string }[]; note?: string };
    const incoming = Array.isArray(body.documents) ? body.documents : [];
    // Businesses hold different paperwork, so no single document is required —
    // one of any type is enough to submit.
    const documents = incoming
      .filter(doc => typeof doc?.fileUrl === "string" && doc.fileUrl.trim().length > 0)
      .map(doc => ({
        docType: VERIFICATION_DOC_TYPES.has(String(doc.docType)) ? String(doc.docType) : "other",
        fileUrl: String(doc.fileUrl).trim(),
        fileName: doc.fileName ? String(doc.fileName).slice(0, 200) : null,
      }));
    if (!documents.length) return json({ error: "Attach at least one document" }, 400);
    if (documents.length > 8) return json({ error: "You can attach up to 8 documents" }, 400);

    // Replace the previous set so the reviewer always sees the current paperwork rather
    // than a pile mixing rejected copies with resubmitted ones.
    try {
      await supabaseDelete(env, "seller_verification_documents", `user_id=eq.${payload.id}`);
    } catch (error) {
      console.error("Clearing previous verification documents failed:", error);
    }
    await supabasePost(env, "seller_verification_documents", documents.map(doc => ({
      user_id: payload.id,
      doc_type: doc.docType,
      file_url: doc.fileUrl,
      file_name: doc.fileName,
    })));

    await supabasePatch(env, "marketplace_users", `id=eq.${payload.id}`, {
      verification_status: "pending",
      verification_submitted_at: new Date().toISOString(),
      verification_submission_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      // A fresh submission clears the previous decision so the seller is not left reading
      // a stale rejection while they wait for the new review.
      verification_note: null,
      verification_reviewed_at: null,
    });

    return json({ status: "pending", documents: documents.length }, 201);
  }

  // GET /api/supplier/dashboard — sales analytics for the signed-in seller
  if (path === "/api/supplier/dashboard" && method === "GET") {
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Sign in required" }, 401);
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&select=id,name`) as Record<string, unknown>[];
    const storeIds = stores.map(s => Number(s.id));
    const storeNames = stores.map(s => String(s.name || "").trim()).filter(Boolean);
    const allProducts = storeIds.length
      ? await supabaseGet(env, "new_products", `store_id=in.(${storeIds.join(",")})`) as Record<string, unknown>[]
      : [];
    // Every store the seller owns counts, not just the first one.
    const orders = await buildOrders(env, true, undefined, storeNames);

    // An order can carry several sellers' goods, so a seller earns only their own line
    // items — the order total also includes shipping and other sellers' products.
    const sellerTotal = (order: any) => (order.items || []).reduce(
      (sum: number, item: any) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
    const unitsIn = (order: any) => (order.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
    const isVoid = (order: any) => ["cancelled", "disputed"].includes(String(order.status || "").toLowerCase());
    // Cancelled and disputed orders are not earnings.
    const soldOrders = orders.filter((o: any) => !isVoid(o));

    const revenue = soldOrders.reduce((sum: number, o: any) => sum + sellerTotal(o), 0);
    const unitsSold = soldOrders.reduce((sum: number, o: any) => sum + unitsIn(o), 0);
    // Shipping is reported separately from revenue: it is mostly cost recovery, and
    // folding it in would overstate goods margin and disagree with topProducts.
    const shippingOf = (order: any) => Number(order.sellerShippingFee || 0);
    const shippingCollected = soldOrders.reduce((sum: number, o: any) => sum + shippingOf(o), 0);
    const now = new Date();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sales = Array.from({ length: 6 }, (_, i) => {
      const bucket = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${bucket.getFullYear()}-${bucket.getMonth()}`;
      const value = soldOrders.filter((o: any) => {
        const d = new Date(o.date);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).reduce((sum: number, o: any) => sum + sellerTotal(o), 0);
      return { label: monthLabels[bucket.getMonth()], date: key, value: Number(value.toFixed(2)) };
    });

    // Day-by-day series for the dashboard chart.
    const dayKey = (value: unknown) => {
      const d = new Date(value as string);
      return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
      const key = dayKey(d);
      const dayOrders = soldOrders.filter((o: any) => dayKey(o.date) === key);
      return {
        date: key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        value: Number(dayOrders.reduce((sum: number, o: any) => sum + sellerTotal(o), 0).toFixed(2)),
        orders: dayOrders.length,
      };
    });

    // Best sellers by revenue.
    const productTotals = new Map<string, { productId: unknown; name: string; units: number; revenue: number }>();
    soldOrders.forEach((order: any) => (order.items || []).forEach((item: any) => {
      const key = String(item.productId ?? item.productName ?? "");
      const row = productTotals.get(key) || { productId: item.productId, name: String(item.productName || "Product"), units: 0, revenue: 0 };
      row.units += Number(item.quantity || 0);
      row.revenue += Number(item.unitPrice || 0) * Number(item.quantity || 0);
      productTotals.set(key, row);
    }));
    const topProducts = [...productTotals.values()]
      .map(row => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const statusCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      const key = String(o.status || "processing").toLowerCase();
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    const pct = (c: number, p: number) => p === 0 ? (c === 0 ? 0 : 100) : Number((((c - p) / p) * 100).toFixed(1));
    const curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
    const curOrders = soldOrders.filter((o: any) => new Date(o.date) >= curStart);
    const prevOrders = soldOrders.filter((o: any) => { const d = new Date(o.date); return d >= prevStart && d < curStart; });
    const curRev = curOrders.reduce((s: number, o: any) => s + sellerTotal(o), 0);
    const prevRev = prevOrders.reduce((s: number, o: any) => s + sellerTotal(o), 0);
    const curShipping = curOrders.reduce((s: number, o: any) => s + shippingOf(o), 0);
    const lowStockThreshold = 10;

    return json({
      revenue: Number(revenue.toFixed(2)),
      revenueChange: pct(curRev, prevRev),
      revenue30d: Number(curRev.toFixed(2)),
      shippingCollected: Number(shippingCollected.toFixed(2)),
      shippingCollected30d: Number(curShipping.toFixed(2)),
      // Goods + shipping, so the seller can see everything they billed.
      totalCollected: Number((revenue + shippingCollected).toFixed(2)),
      orders: orders.length,
      ordersChange: pct(curOrders.length, prevOrders.length),
      orders30d: curOrders.length,
      unitsSold,
      averageOrderValue: soldOrders.length ? Number((revenue / soldOrders.length).toFixed(2)) : 0,
      products: allProducts.length,
      lowStock: allProducts.filter((p: Record<string, unknown>) => Number(p.stock_quantity || 0) <= lowStockThreshold).length,
      outOfStock: allProducts.filter((p: Record<string, unknown>) => Number(p.stock_quantity || 0) === 0).length,
      stores: stores.length,
      statusCounts,
      recentOrders: orders.slice(0, 5),
      topProducts,
      sales,
      daily,
    });
  }

  // GET /api/supplier/products
  if (path === "/api/supplier/products" && method === "GET") {
    const payload = await authPayload(request, env);
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
    const payload = await authPayload(request, env);
    if (!payload?.id) return json({ error: "Not authenticated" }, 401);
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return json({ error: "A product body is required" }, 400);
    // readJson only catches a body that fails to PARSE. `{}` parses fine, so without
    // field validation it reached the insert with name/base_price undefined and the
    // NOT NULL constraint threw a 500. Validate the columns the insert requires.
    const productName = String(body.name ?? "").trim();
    if (!productName) return json({ error: "Product name is required" }, 400);
    const productPrice = Number(body.price);
    if (!Number.isFinite(productPrice) || productPrice < 0) return json({ error: "A valid price is required" }, 400);
    const stores = await supabaseGet(env, "stores", `seller_id=eq.${payload.id}&limit=1`) as Record<string, unknown>[];
    if (!stores.length) return json({ error: "No store found. Create a store first." }, 400);
    const storeId = Number(stores[0].id);
    const catRows = await supabaseGet(env, "categories", "select=id,name") as Record<string, unknown>[];
    const catIdByName = new Map(catRows.map(c => [String(c.name || "").toLowerCase(), Number(c.id)]));
    const categoryId = catIdByName.get(String(body.category || "").toLowerCase()) || null;
    // new_products.slug is NOT NULL and was never supplied, so EVERY product creation
    // through this endpoint failed with a 500. Derive it from the name, with a short
    // random suffix so two products with the same name cannot collide.
    const slug = `${productName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product'}-${Math.random().toString(36).slice(2, 8)}`;
    const [product] = await supabasePost(env, "new_products", {
      name: productName,
      slug,
      store_id: storeId,
      seller_id: payload.id,
      category_id: categoryId,
      custom_category_suggestion: categoryId ? null : body.category,
      base_price: productPrice,
      compare_at_price: body.compareAtPrice || null,
      minimum_order_quantity: body.moq || 1,
      stock_quantity: body.stock || 0,
      unit_type: body.unit || "piece",
      description: body.description || "",
      primary_image: body.image || "",
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
    const payload = await authPayload(request, env);
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
    const payload = await authPayload(request, env);
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
    const supplierPayload = await authPayload(request, env);
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
      const shippingFee = Number(Number(body.shippingFee).toFixed(2));
      // Fees are per seller: this seller owns the row for their own store name on this
      // order, so charging a fee can no longer overwrite another seller's fee.
      const sellerNameOnOrder = orderItemRows
        .map(item => String(item.supplier_name || "").trim())
        .find(name => supplierNames.has(name));
      if (!sellerNameOnOrder) return json({ error: "Order does not belong to your store" }, 403);
      await supabaseUpsert(env, "marketplace_order_shipping", {
        order_id: Number(supplierOrderMatch[1]),
        supplier_name: sellerNameOnOrder,
        fee: shippingFee,
        updated_at: new Date().toISOString(),
      }, "order_id,supplier_name");
      // The order-level column stays as the cached sum of every seller's fee, so the
      // buyer keeps seeing one shipping number and one correct total.
      const feeRows = await supabaseGet(env, "marketplace_order_shipping", `order_id=eq.${supplierOrderMatch[1]}&select=fee`) as Record<string, unknown>[];
      const shippingTotal = feeRows.reduce((sum, row) => sum + Number(row.fee || 0), 0);
      update.shipping_fee = Number(shippingTotal.toFixed(2));
      update.total = Number((itemSubtotal + shippingTotal).toFixed(2));
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
    const detailImages = await productImagesFor(env, items.map((i: Record<string, unknown>) => i.product_id));
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
        productImage: detailImages(i.product_id),
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
    // Ownership is enforced for EVERY caller. This check used to be gated on
    // `buyer?.role === "buyer"`, so any seller or admin token could patch (and cancel)
    // any buyer's order. Sellers act on orders through /api/supplier/orders/:id/status,
    // which validates store ownership separately.
    if (String(orderRows[0].buyer_name || "") !== buyer.token) return json({ error: "Order not found" }, 404);
    // A buyer may only ever cancel their order or confirm they received it. Everything
    // else on this route is the seller's to set, through /api/supplier/orders/:id/status.
    // Without this the route wrote whatever string it was handed, so a buyer could mark an
    // order delivered before it shipped, or store a status no part of the app understands.
    const currentStatus = String(orderRows[0].status || "");
    if (body.status && body.status !== "cancelled" && body.status !== "delivered") {
      return json({ error: "You can only cancel an order or confirm you received it" }, 400);
    }
    if (body.status === "delivered" && !["ready", "out_for_delivery", "shipped"].includes(currentStatus)) {
      return json({ error: "This order is not out for delivery yet" }, 400);
    }
    if (body.status === "cancelled") {
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
      link: identity.role === "buyer" ? `/seller-central/messages?buyerId=${identity.id}` : `/messages?seller=${identity.id}`,
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
    const senderIsBuyer = Number(conv.buyer_id) === identity.id;
    await supabasePost(env, "notifications", {
      user_id: otherId,
      type: "message",
      title: "New message",
      body: body.message.slice(0, 120),
      link: senderIsBuyer ? `/seller-central/messages?buyerId=${identity.id}` : `/messages?seller=${identity.id}`,
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

/**
 * Silently migrate active users off legacy unsigned tokens.
 *
 * When a request arrives bearing a still-valid LEGACY token, hand back a freshly signed
 * replacement in a response header. The client swaps it in, and that user is migrated
 * without noticing. Do this for a few days and the eventual cutover only affects accounts
 * that have been dormant the whole time, instead of logging out the entire marketplace.
 */
async function attachSessionUpgrade(request: Request, env: Env, response: Response): Promise<Response> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer nz_")) return response;
  const raw = header.slice(10);
  if (raw.includes('.')) return response;            // already signed
  if (!ACCEPT_LEGACY_ACCESS_TOKENS) return response; // cutover done, nothing to upgrade
  const payload = await authPayload(request, env);   // re-validates, including exp
  if (!payload?.id) return response;                 // never upgrade an invalid token
  try {
    const upgraded = `nz_${await signSession(env, { id: Number(payload.id), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })}`;
    // Response bodies are streams, so clone via the constructor rather than mutating.
    const headers = new Headers(response.headers);
    headers.set("X-Session-Upgrade", upgraded);
    headers.set("Access-Control-Expose-Headers", "X-Session-Upgrade");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error("Session upgrade failed:", error);
    return response; // upgrading is best-effort and must never break the request
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const response = await handleRequest(request, env);
      return await attachSessionUpgrade(request, env, response);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Internal server error" }, 500);
    }
  },
};
