import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import esimRouter from "./esim";
import walletRouter from "./wallet";
import userRouter from "./user";
import familyRouter from "./family";
import referralRouter from "./referral";
import redeemRouter from "./redeem";
import ticketsRouter from "./tickets";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(esimRouter);
router.use(walletRouter);
router.use(userRouter);
router.use(familyRouter);
router.use(referralRouter);
router.use(redeemRouter);
router.use(ticketsRouter);
router.use(adminRouter);

export default router;
