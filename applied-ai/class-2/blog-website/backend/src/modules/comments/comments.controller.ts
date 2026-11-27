import { asyncHandler } from "../../utils/asyncHandler.js";
import { commentsService } from "./comments.service.js";

export const list = asyncHandler(async (req, res) => {
  res.json({ comments: await commentsService.listByPost(Number(req.params.postId)) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({
    comment: await commentsService.create(Number(req.params.postId), req.userId!, req.body),
  });
});

export const update = asyncHandler(async (req, res) => {
  res.json({
    comment: await commentsService.update(
      Number(req.params.id),
      Number(req.params.postId),
      req.userId!,
      req.body,
    ),
  });
});

export const remove = asyncHandler(async (req, res) => {
  await commentsService.remove(Number(req.params.id), Number(req.params.postId), req.userId!);
  res.status(204).send();
});
