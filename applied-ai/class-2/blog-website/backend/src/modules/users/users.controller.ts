import { asyncHandler } from "../../utils/asyncHandler.js";
import { usersService } from "./users.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: await usersService.getProfile(Number(req.params.id)) });
});
