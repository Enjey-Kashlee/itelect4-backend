import { Router, type Request } from "express";
import { Claim } from "../models/Claim";
import { Item } from "../models/Item";
import type { NewClaimBody, UpdateClaimBody } from "../types/index";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errors";
import { jsonBody, objectId, onlyFields, stringField } from "../middleware/validation";

interface IdParam { id: string }

async function existingItem(value: unknown): Promise<string> {
  const id = objectId(value, "itemId");
  if (!(await Item.exists({ _id: id }))) throw new HttpError(404, "No item with that id");
  return id;
}

export function createClaimsRouter(jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret));

  router.get("/", async (req, res) => {
    res.json(await Claim.find({ claimantId: req.userId }).sort({ claimedAt: -1 }));
  });

  router.get("/:id", async (req: Request<IdParam>, res) => {
    const claim = await Claim.findOne({ _id: objectId(req.params.id, "id"), claimantId: req.userId });
    if (!claim) throw new HttpError(404, "No claim with that id");
    res.json(claim);
  });

  router.post("/", async (req: Request<unknown, unknown, NewClaimBody>, res) => {
    const body = jsonBody(req.body);
    onlyFields(body, ["itemId", "proofDescription"]);
    const proofDescription = stringField(body.proofDescription, "proofDescription");
    const itemId = await existingItem(body.itemId);
    const claim = await Claim.create({ itemId, proofDescription, claimantId: req.userId });
    res.status(201).json(claim);
  });

  router.patch("/:id", async (req: Request<IdParam, unknown, UpdateClaimBody>, res) => {
    const id = objectId(req.params.id, "id");
    const filter = { _id: id, claimantId: req.userId };
    if (!(await Claim.exists(filter))) throw new HttpError(404, "No claim with that id");
    const body = jsonBody(req.body);
    onlyFields(body, ["itemId", "proofDescription"]);
    if (!Object.keys(body).length) throw new HttpError(400, "Supply at least one editable field");
    const changes: UpdateClaimBody = {};
    if ("itemId" in body) changes.itemId = await existingItem(body.itemId);
    if ("proofDescription" in body) changes.proofDescription = stringField(body.proofDescription, "proofDescription");
    const claim = await Claim.findOneAndUpdate(filter, { $set: changes }, { returnDocument: "after", runValidators: true });
    if (!claim) throw new HttpError(404, "No claim with that id");
    res.json(claim);
  });

  router.delete("/:id", async (req: Request<IdParam>, res) => {
    const claim = await Claim.findOneAndDelete({ _id: objectId(req.params.id, "id"), claimantId: req.userId });
    if (!claim) throw new HttpError(404, "No claim with that id");
    res.status(204).send();
  });
  return router;
}
