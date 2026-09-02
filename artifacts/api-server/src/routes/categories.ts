import { Router } from "express";
import { db } from "../../db";
import { categoriesTable, categorySuggestionsTable } from "@workspace/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

const router = Router();

// GET /api/categories - List all categories (tree structure)
router.get("/", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.isActive, true))
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));

    // Build tree structure
    const topLevel = categories.filter(c => !c.parentId);
    const children = categories.filter(c => c.parentId);

    const tree = topLevel.map(parent => ({
      ...parent,
      children: children.filter(c => c.parentId === parent.id)
    }));

    res.json({ categories: tree, flat: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:id - Get single category
router.get("/:id", async (req, res) => {
  try {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, parseInt(req.params.id)));

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ category });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /api/categories/suggest - Seller suggests a new category
router.post("/suggest", async (req, res) => {
  try {
    const { sellerId, suggestedName, reason, parentId } = req.body;

    if (!sellerId || !suggestedName) {
      return res.status(400).json({ error: "sellerId and suggestedName are required" });
    }

    const [suggestion] = await db
      .insert(categorySuggestionsTable)
      .values({
        sellerId,
        suggestedName,
        reason,
        parentId: parentId || null,
        status: "pending",
      })
      .returning();

    res.status(201).json({ suggestion });
  } catch (error) {
    console.error("Error creating category suggestion:", error);
    res.status(500).json({ error: "Failed to create suggestion" });
  }
});

// GET /api/categories/suggestions - List pending suggestions (admin)
router.get("/suggestions", async (req, res) => {
  try {
    const { status } = req.query;
    const where = status
      ? eq(categorySuggestionsTable.status, status as string)
      : undefined;

    const suggestions = await db
      .select()
      .from(categorySuggestionsTable)
      .where(where);

    res.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// PATCH /api/categories/suggestions/:id - Admin approve/reject
router.patch("/suggestions/:id", async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const [updated] = await db
      .update(categorySuggestionsTable)
      .set({ status, adminNote, updatedAt: new Date() })
      .where(eq(categorySuggestionsTable.id, parseInt(req.params.id)))
      .returning();

    // If approved, create the actual category
    if (status === "approved") {
      const slug = updated.suggestedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await db.insert(categoriesTable).values({
        name: updated.suggestedName,
        slug,
        parentId: updated.parentId,
        isActive: true,
      });
    }

    res.json({ suggestion: updated });
  } catch (error) {
    console.error("Error updating suggestion:", error);
    res.status(500).json({ error: "Failed to update suggestion" });
  }
});

export default router;
