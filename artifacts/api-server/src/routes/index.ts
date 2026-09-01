import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use(healthRouter);
router.use(marketplaceRouter);
router.use("/profiles", profilesRouter);

export default router;
