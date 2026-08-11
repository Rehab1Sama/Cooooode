import { Router, type IRouter } from "express";
import healthRouter from "./health";
import maqraaRouter from "./maqraa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(maqraaRouter);

export default router;
