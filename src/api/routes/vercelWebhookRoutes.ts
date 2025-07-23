import { Router } from "express";
import { handleVercelWebhook } from "../controllers/vercelWebhookController.js";
import { rawBodyMiddleware } from "../middleware/rawBodyMiddleware.js";

const router: Router = Router();

/**
 * POST /api/vercel-webhook
 * Vercel deployment webhook handler
 */
router.post("/", rawBodyMiddleware, handleVercelWebhook);

export default router;