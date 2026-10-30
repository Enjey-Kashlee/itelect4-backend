import { Router, type Request } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import { jsonBody, objectId, onlyFields } from "../middleware/validation";
import { Claim } from "../models/Claim";
import { Item } from "../models/Item";
import { User } from "../models/User";
import { claimTransaction, lockClaimableItem } from "../data/claimTransactions";
import type { ClaimStatus } from "../types/index";

export function createAdminRouter(jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret), requireRole("security_admin"));

  router.get("/students", async (_req, res) => {
    res.json(
      await User.find({ role: "student", isActive: true })
        .select("name email")
        .sort({ name: 1, email: 1 }),
    );
  });

  router.get("/claims", async (req, res) => {
    onlyFields(req.query, ["status"]);
    const status = req.query.status ?? "pending";
    if (
      typeof status !== "string" ||
      !["pending", "approved", "rejected"].includes(status)
    )
      throw new HttpError(400, "Choose pending, approved, or rejected claims");
    res.json(
      await Claim.find({ status: status as ClaimStatus })
        .sort({ claimedAt: -1 })
        .populate("item", "title location status")
        .populate("claimant", "name"),
    );
  });

  router.patch(
    "/claims/:id/status",
    async (req: Request<{ id: string }>, res) => {
      const id = objectId(req.params.id, "id");
      const body = jsonBody(req.body);
      onlyFields(body, ["status"]);
      if (body.status !== "approved" && body.status !== "rejected")
        throw new HttpError(400, "Choose approved or rejected");
      const status = body.status;
      const result = await claimTransaction(async (session) => {
        const claim = await Claim.findById(id).session(session);
        if (!claim) throw new HttpError(404, "No claim with that id");
        if (String(claim.claimantId) === req.userId)
          throw new HttpError(403, "You cannot review your own claim");
        if (claim.status !== "pending")
          throw new HttpError(
            409,
            "This claim has already been reviewed. Refresh the list.",
          );
        if (status === "approved") {
          if (
            !(await User.exists({
              _id: claim.claimantId,
              role: "student",
              isActive: true,
            }).session(session))
          )
            throw new HttpError(
              409,
              "The claimant is unavailable for approval",
            );
          const item = await Item.findById(claim.itemId).session(session);
          if (!item || item.status !== "lost")
            throw new HttpError(409, "This item is unavailable for approval");
          await lockClaimableItem(String(claim.itemId), session);
          await Item.updateOne(
            { _id: claim.itemId },
            { $set: { status: "found" } },
            { session },
          );
        }
        const decision = {
          status,
          reviewedById: req.userId,
          reviewedAt: new Date(),
        };
        claim.set(decision);
        await claim.save({ session });
        let rejectedOtherClaimsCount = 0;
        if (status === "approved") {
          const rejected = await Claim.updateMany(
            { itemId: claim.itemId, status: "pending" },
            { $set: { ...decision, status: "rejected" } },
            { session },
          );
          rejectedOtherClaimsCount = rejected.modifiedCount;
        }
        return { claim, rejectedOtherClaimsCount };
      });
      res.json(result);
    },
  );
  return router;
}
