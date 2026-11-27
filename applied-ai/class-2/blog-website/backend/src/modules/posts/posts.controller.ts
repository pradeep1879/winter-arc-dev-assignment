import { asyncHandler } from "../../utils/asyncHandler.js";
import { postsService } from "./posts.service.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await postsService.list((req as any).validatedQuery, req.userId));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json({ post: await postsService.getBySlugOrId(String(req.params.idOrSlug), req.userId) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ post: await postsService.create(req.userId!, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ post: await postsService.update(Number(req.params.id), req.userId!, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  await postsService.remove(Number(req.params.id), req.userId!);
  res.status(204).send();
});
