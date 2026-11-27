import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { create, list, remove, update } from "./comments.controller.js";
import { commentSchema } from "./comments.schema.js";

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/", list);
commentsRouter.post("/", requireAuth, validate(commentSchema), create);
commentsRouter.put("/:id", requireAuth, validate(commentSchema), update);
commentsRouter.delete("/:id", requireAuth, remove);
