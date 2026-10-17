import { Router, type Request } from "express";
import { Item } from "../models/Item";
import { HttpError } from "../middleware/errors";
import { objectId } from "../middleware/validation";

export function createItemsRouter(): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json(await Item.find().sort({ title: 1 }));
  });
  router.get("/:id", async (req: Request<{ id: string }>, res) => {
    const item = await Item.findById(objectId(req.params.id, "id"));
    if (!item) throw new HttpError(404, "No item with that id");
    res.json(item);
  });
  return router;
}
