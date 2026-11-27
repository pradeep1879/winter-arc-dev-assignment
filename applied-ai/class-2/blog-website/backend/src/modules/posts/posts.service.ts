import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slug.js";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "./posts.schema.js";

const include = {
  author: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} as const;

const uniqueSlug = async (title: string, excludeId?: number) => {
  const base = slugify(title);
  let slug = base;
  let i = 1;
  while (true) {
    const found = await prisma.post.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${++i}`;
  }
};

export const postsService = {
  async list(q: ListPostsQuery, userId?: number) {
    const where = {
      AND: [
        q.authorId ? { authorId: q.authorId } : {},
        q.search ? { OR: [{ title: { contains: q.search } }, { content: { contains: q.search } }] } : {},
        // drafts only visible to their author
        { OR: [{ published: true }, ...(userId ? [{ authorId: userId }] : [])] },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.post.count({ where }),
    ]);
    return { items, page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) };
  },

  async getBySlugOrId(idOrSlug: string, userId?: number) {
    const post = await prisma.post.findFirst({
      where: /^\d+$/.test(idOrSlug) ? { id: Number(idOrSlug) } : { slug: idOrSlug },
      include,
    });
    if (!post || (!post.published && post.authorId !== userId)) throw new AppError(404, "Post not found");
    return post;
  },

  async create(userId: number, input: CreatePostInput) {
    return prisma.post.create({
      data: { ...input, slug: await uniqueSlug(input.title), authorId: userId },
      include,
    });
  },

  async update(id: number, userId: number, input: UpdatePostInput) {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Post not found");
    if (post.authorId !== userId) throw new AppError(403, "You can only edit your own posts");
    return prisma.post.update({
      where: { id },
      data: {
        ...input,
        ...(input.title && input.title !== post.title ? { slug: await uniqueSlug(input.title, id) } : {}),
      },
      include,
    });
  },

  async remove(id: number, userId: number) {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Post not found");
    if (post.authorId !== userId) throw new AppError(403, "You can only delete your own posts");
    await prisma.post.delete({ where: { id } });
  },
};
