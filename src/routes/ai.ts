import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import { aiRequestSchema } from "../schemas/review";
import { reviewClaim } from "../ai/gemini";

export function createAiRouter(secret: string) {
  const router = Router();
  // shortcut: counts are per instance; use a shared store if exact global limits are required.
  const limiter = rateLimit({
    windowMs: 60000,
    limit: 5,
    keyGenerator: (req) => req.userId!,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Five reviews a minute is the limit. Try again shortly.",
    },
  });
  router.post("/", requireAuth(secret), limiter, async (req, res) => {
    const parsed = aiRequestSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0]!.message);
    res.setHeader("Cache-Control", "no-store");
    res.json(await reviewClaim(parsed.data.prompt));
  });
  return router;
}
