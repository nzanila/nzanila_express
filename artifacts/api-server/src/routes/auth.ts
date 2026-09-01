import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { marketplaceUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const router: IRouter = Router();

// ── Password hashing ──

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashToVerify = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashToVerify, "hex"));
}

// ── OTP (kept for future phone verification) ──

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp API not configured, skipping OTP send");
    return;
  }

  const cleanPhone = phone.replace(/[^\d]/g, "");
  const message = `Your Nzanila Express verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send failed:", err);
  }
}

// ── Helpers ──

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\s/g, "");
  if (normalized.startsWith("+")) normalized = normalized.slice(1);
  if (normalized.startsWith("0")) normalized = "257" + normalized.slice(1);
  if (!normalized.startsWith("257") && !normalized.startsWith("250")) normalized = "257" + normalized;
  return normalized;
}

function createSession(userId: number, phone: string) {
  const accessToken = `nz_${btoa(JSON.stringify({ id: userId, phone, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))}`;
  return {
    accessToken,
    refreshToken: `nz_refresh_${userId}`,
    expiresIn: 7 * 24 * 60 * 60,
    expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
}

function dtoUser(u: Record<string, unknown>) {
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

// ═══════════════════════════════════════
// AUTH ROUTES (Password-based)
// ═══════════════════════════════════════

// POST /auth/signup — register with password
router.post("/signup", async (req, res) => {
  try {
    const { phone, name, role, password } = req.body;

    if (!phone || !name || !role || !password) {
      res.status(400).json({ error: "Phone, name, role, and password are required" });
      return;
    }
    if (!["buyer", "seller"].includes(role)) {
      res.status(400).json({ error: "Role must be 'buyer' or 'seller'" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const existing = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    if (existing.length) {
      res.status(409).json({ error: "Phone number already registered" });
      return;
    }

    const passwordHash = hashPassword(password);

    const [profile] = await db
      .insert(marketplaceUsersTable)
      .values({
        authUserId: crypto.randomUUID(),
        phone: normalizedPhone,
        name,
        role,
        location: "Bujumbura",
        verified: false,
        avatar: "",
        passwordHash,
      })
      .returning();

    const session = createSession(profile.id, normalizedPhone);

    res.status(201).json({
      message: "Account created successfully",
      user: dtoUser(profile as Record<string, unknown>),
      session,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login — login with password
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: "Phone and password are required" });
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    const users = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    if (!users.length) {
      res.status(404).json({ error: "Phone number not registered" });
      return;
    }

    const user = users[0];

    if (!user.passwordHash) {
      res.status(400).json({ error: "Account was created without a password. Please reset your password." });
      return;
    }

    if (!verifyPassword(password, user.passwordHash as string)) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const session = createSession(user.id, normalizedPhone);

    res.json({
      message: "Login successful",
      user: dtoUser(user as Record<string, unknown>),
      session,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════
// OTP ROUTES (for future phone verification)
// ═══════════════════════════════════════

// POST /auth/send-otp — send OTP via WhatsApp (for verifying phone on existing accounts)
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone || "");

    const users = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    if (!users.length) {
      res.status(404).json({ error: "Phone number not registered" });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db
      .update(marketplaceUsersTable)
      .set({ otpCode: otp, otpExpiresAt: expiresAt })
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    await sendWhatsAppOtp("+" + normalizedPhone, otp);

    res.json({
      message: "OTP sent via WhatsApp",
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/verify-otp — verify OTP and mark phone as verified
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, token } = req.body;
    const normalizedPhone = normalizePhone(phone || "");

    if (!token) {
      res.status(400).json({ error: "OTP code is required" });
      return;
    }

    const users = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    if (!users.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = users[0];

    if (user.otpCode !== token) {
      res.status(400).json({ error: "Invalid OTP code" });
      return;
    }

    if (user.otpExpiresAt && new Date(user.otpExpiresAt as string) < new Date()) {
      res.status(400).json({ error: "OTP code has expired" });
      return;
    }

    await db
      .update(marketplaceUsersTable)
      .set({ verified: true, otpCode: null, otpExpiresAt: null })
      .where(eq(marketplaceUsersTable.phone, normalizedPhone));

    res.json({ message: "Phone number verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ═══════════════════════════════════════
// SESSION ROUTES
// ═══════════════════════════════════════

// POST /auth/refresh — extend session
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }

    const match = refreshToken.match(/^nz_refresh_(\d+)$/);
    if (!match) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const userId = parseInt(match[1]);
    const users = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.id, userId));

    if (!users.length) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const user = users[0];
    const session = createSession(user.id, user.phone);

    res.json({ session });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me — get current user profile
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer nz_")) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const payload = JSON.parse(atob(auth.slice(10)));
    if (payload.exp && payload.exp < Date.now()) {
      res.status(401).json({ error: "Token expired" });
      return;
    }

    const users = await db
      .select()
      .from(marketplaceUsersTable)
      .where(eq(marketplaceUsersTable.id, payload.id));

    if (!users.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: dtoUser(users[0] as Record<string, unknown>) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /auth/logout
router.post("/logout", async (_req, res) => {
  res.json({ message: "Logged out" });
});

export default router;
