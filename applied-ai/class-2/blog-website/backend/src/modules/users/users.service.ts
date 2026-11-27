import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

export const usersService = {
  async getProfile(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        posts: {
          where: { published: true },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, slug: true, createdAt: true },
        },
      },
    });
    if (!user) throw new AppError(404, "User not found");
    return user;
  },
};
