import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { signToken } from "../../utils/jwt.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

export const authService = {
  async register(input: RegisterInput) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new AppError(409, "Email already registered");
    const user = await prisma.user.create({
      data: { ...input, password: await bcrypt.hash(input.password, 10) },
      select: publicUser,
    });
    return { user, token: signToken(user.id) };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new AppError(401, "Invalid email or password");
    }
    const { password: _pw, ...safe } = user;
    return { user: safe, token: signToken(user.id) };
  },

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
    if (!user) throw new AppError(401, "User no longer exists");
    return user;
  },
};
