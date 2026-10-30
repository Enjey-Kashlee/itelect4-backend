import { Router, type Request } from "express";
import { Item } from "../models/Item";
import { HttpError } from "../middleware/errors";
import {
  jsonBody,
  objectId,
  onlyFields,
  stringField,
} from "../middleware/validation";
import { requireAuth, requireRole } from "../middleware/auth";
import { User } from "../models/User";

export function createItemsRouter(jwtSecret: string): Router {
  const router = Router();
  router.post(
    "/",
    requireAuth(jwtSecret),
    requireRole("security_admin"),
    async (req, res) => {
      const body = jsonBody(req.body);
      onlyFields(body, ["title", "description", "location", "reportedById"]);
      const reportedById = objectId(body.reportedById, "reportedById");
      if (
        !(await User.exists({
          _id: reportedById,
          role: "student",
          isActive: true,
        }))
      )
        throw new HttpError(400, "Choose an active student reporter");
      const item = await Item.create({
        title: stringField(body.title, "title"),
        description: stringField(body.description, "description"),
        location: stringField(body.location, "location"),
        reportedById,
        status: "lost",
      });
      await item.populate("reportedBy", "name");
      res.status(201).json(item);
    },
  );
  router.get("/", async (_req, res) => {
    res.json(
      await Item.find().sort({ title: 1 }).populate("reportedBy", "name"),
    );
  });
  router.get("/:id", async (req: Request<{ id: string }>, res) => {
    const item = await Item.findById(objectId(req.params.id, "id")).populate(
      "reportedBy",
      "name",
    );
    if (!item) throw new HttpError(404, "No item with that id");
    res.json(item);
  });
  return router;
}
