import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { commentsRouter } from "../comments/comments.routes.js";
import { create, getOne, list, remove, update } from "./posts.controller.js";
import { createPostSchema, listPostsQuerySchema, updatePostSchema } from "./posts.schema.js";

export const postsRouter = Router();

postsRouter.get("/", optionalAuth, validate(listPostsQuerySchema, "query"), list);
postsRouter.get("/:idOrSlug", optionalAuth, getOne);
postsRouter.post("/", requireAuth, validate(createPostSchema), create);
postsRouter.put("/:id", requireAuth, validate(updatePostSchema), update);
postsRouter.delete("/:id", requireAuth, remove);

// nested: /posts/:postId/comments
postsRouter.use("/:postId/comments", commentsRouter);
