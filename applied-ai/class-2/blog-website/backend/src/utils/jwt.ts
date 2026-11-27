import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: number;
}

export const signToken = (userId: number) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });

export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as JwtPayload;
