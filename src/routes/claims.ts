import { Router, type Request } from "express";
import { Claim } from "../models/Claim";
import { claimTransaction, lockClaimableItem } from "../data/claimTransactions";
import type { NewClaimBody, UpdateClaimBody } from "../types/index";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import {
  jsonBody,
  objectId,
  onlyFields,
  stringField,
} from "../middleware/validation";

interface IdParam {
  id: string;
}

export function createClaimsRouter(jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret));

  router.get("/", async (req, res) => {
    res.json(
      await Claim.find({ claimantId: req.userId })
        .sort({ claimedAt: -1 })
        .populate("item", "title location"),
    );
  });

  router.get("/:id", async (req: Request<IdParam>, res) => {
    const claim = await Claim.findOne({
      _id: objectId(req.params.id, "id"),
      claimantId: req.userId,
    }).populate("item", "title location");
    if (!claim) throw new HttpError(404, "No claim with that id");
    res.json(claim);
  });

  router.post(
    "/",
    requireRole("student"),
    async (req: Request<unknown, unknown, NewClaimBody>, res) => {
      const body = jsonBody(req.body);
      onlyFields(body, ["itemId", "proofDescription"]);
      const proofDescription = stringField(
        body.proofDescription,
        "proofDescription",
      );
      const claim = await claimTransaction(async (session) => {
        const itemId = await lockClaimableItem(body.itemId, session);
        const [created] = await Claim.create(
          [{ itemId, proofDescription, claimantId: req.userId }],
          { session },
        );
        return created;
      });
      res.status(201).json(claim);
    },
  );

  router.patch(
    "/:id",
    async (req: Request<IdParam, unknown, UpdateClaimBody>, res) => {
      const id = objectId(req.params.id, "id");
      const filter = { _id: id, claimantId: req.userId };
      const existing = await Claim.findOne(filter);
      if (!existing) throw new HttpError(404, "No claim with that id");
      if (existing.status !== "pending")
        throw new HttpError(409, "Reviewed claims cannot be changed");
      const body = jsonBody(req.body);
      onlyFields(body, ["itemId", "proofDescription"]);
      if (!Object.keys(body).length)
        throw new HttpError(400, "Supply at least one editable field");
      const changes: UpdateClaimBody = {};
      if ("itemId" in body) changes.itemId = objectId(body.itemId, "itemId");
      if ("proofDescription" in body)
        changes.proofDescription = stringField(
          body.proofDescription,
          "proofDescription",
        );
      const update = async (session?: import("mongoose").ClientSession) => {
        if (changes.itemId && session)
          await lockClaimableItem(changes.itemId, session);
        const claim = await Claim.findOneAndUpdate(
          { ...filter, status: "pending" },
          { $set: changes },
          { returnDocument: "after", runValidators: true, session },
        );
        if (!claim)
          throw new HttpError(409, "This claim changed. Refresh the list.");
        return claim;
      };
      const claim = changes.itemId
        ? await claimTransaction(update)
        : await update();
      res.json(claim);
    },
  );

  router.delete("/:id", async (req: Request<IdParam>, res) => {
    const claim = await Claim.findOneAndDelete({
      _id: objectId(req.params.id, "id"),
      claimantId: req.userId,
      status: "pending",
    });
    if (!claim) {
      if (await Claim.exists({ _id: req.params.id, claimantId: req.userId }))
        throw new HttpError(409, "Reviewed claims cannot be deleted");
      throw new HttpError(404, "No claim with that id");
    }
    res.status(204).send();
  });
  return router;
}
