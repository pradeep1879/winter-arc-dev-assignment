import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(10),
  published: z.boolean().optional().default(true),
});

export const updatePostSchema = createPostSchema.partial();

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(6),
  search: z.string().trim().optional(),
  authorId: z.coerce.number().int().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
