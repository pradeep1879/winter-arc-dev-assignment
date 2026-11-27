import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";

const extract = (req: Request) => {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extract(req);
  if (!token) return next(new AppError(401, "Authentication required"));
  try {
    req.userId = verifyToken(token).userId;
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extract(req);
  if (token) {
    try {
      req.userId = verifyToken(token).userId;
    } catch {
      /* ignore */
    }
  }
  next();
};
