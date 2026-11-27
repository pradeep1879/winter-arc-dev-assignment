import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { postsRouter } from "./modules/posts/posts.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/posts", postsRouter);
