import { Router } from "express";
import { getProfile } from "./users.controller.js";

export const usersRouter = Router();
usersRouter.get("/:id", getProfile);
