import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import profilesRouter from "./profiles";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import storesRouter from "./stores";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use(healthRouter);
router.use(marketplaceRouter);
router.use("/profiles", profilesRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/stores", storesRouter);

export default router;
