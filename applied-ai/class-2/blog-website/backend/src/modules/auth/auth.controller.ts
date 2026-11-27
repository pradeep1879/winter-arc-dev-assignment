import { asyncHandler } from "../../utils/asyncHandler.js";
import { authService } from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body));
});

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await authService.me(req.userId!) });
});
