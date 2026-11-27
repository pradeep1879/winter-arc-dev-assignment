import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { CommentInput } from "./comments.schema.js";

const include = { author: { select: { id: true, name: true } } } as const;

export const commentsService = {
  async listByPost(postId: number) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, "Post not found");
    return prisma.comment.findMany({ where: { postId }, include, orderBy: { createdAt: "asc" } });
  },

  async create(postId: number, userId: number, input: CommentInput) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, "Post not found");
    return prisma.comment.create({ data: { ...input, postId, authorId: userId }, include });
  },

  async update(id: number, postId: number, userId: number, input: CommentInput) {
    const c = await prisma.comment.findFirst({ where: { id, postId } });
    if (!c) throw new AppError(404, "Comment not found");
    if (c.authorId !== userId) throw new AppError(403, "You can only edit your own comments");
    return prisma.comment.update({ where: { id }, data: input, include });
  },

  async remove(id: number, postId: number, userId: number) {
    const c = await prisma.comment.findFirst({ where: { id, postId }, include: { post: true } });
    if (!c) throw new AppError(404, "Comment not found");
    if (c.authorId !== userId && c.post.authorId !== userId) {
      throw new AppError(403, "You cannot delete this comment");
    }
    await prisma.comment.delete({ where: { id } });
  },
};
