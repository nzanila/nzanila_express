import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { storesTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    if (token.startsWith('nz_')) {
      const payload = JSON.parse(Buffer.from(token.slice(3), 'base64').toString());
      req.userId = payload.id;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/stores/:sellerId/storefront - Load storefront config
router.get('/:sellerId/storefront', async (req, res) => {
  try {
    const idOrSellerId = parseInt(req.params.sellerId);
    let [store] = await db.select().from(storesTable).where(eq(storesTable.sellerId, idOrSellerId));
    if (!store) {
      [store] = await db.select().from(storesTable).where(eq(storesTable.id, idOrSellerId));
    }
    if (!store) {
      return res.json({ sections: [], shopSign: null, template: 'showcase', storeId: idOrSellerId });
    }
    const config = (store as any).storefrontConfig as unknown;
    // tolerate missing column or empty
    if (config && typeof config === 'object' && (config as any).sections) {
      res.json(config);
    } else {
      res.json({ sections: [], shopSign: null, template: 'showcase', storeId: idOrSellerId });
    }
    return;
  } catch (error) {
    console.error('Error fetching storefront:', error);
    // resilient: return empty config instead of 500 so builder still works
    res.json({ sections: [], shopSign: null, template: 'showcase', storeId: parseInt(req.params.sellerId) || 0 });
    return;
  }
});

// PUT /api/stores/:sellerId/storefront - Save storefront config
router.put('/:sellerId/storefront', requireAuth, async (req: any, res: any) => {
  try {
    const sellerId = parseInt(req.params.sellerId);

    if (req.userId !== sellerId) {
      return res.status(403).json({ error: 'Can only edit your own storefront' });
    }

    const parsed = req.body as {
      storeId: number;
      sections: unknown;
      shopSign: unknown;
      template: string;
      updatedAt: string;
    };

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return res.status(400).json({ error: 'Invalid storefront config: sections must be an array' });
    }

    const [store] = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.sellerId, sellerId));

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    await db
      .update(storesTable)
      .set({
        storefrontConfig: parsed as any,
        storeTemplate: parsed.template || 'showcase',
        updatedAt: new Date(),
      })
      .where(eq(storesTable.id, store.id));

    res.json({ success: true, config: parsed });
    return;
  } catch (error) {
    console.error('Error saving storefront:', error);
    res.status(500).json({ error: 'Failed to save storefront' });
    return;
  }
});

export default router;
