import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

export const validate =
  (schema: ZodType, source: "body" | "query" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(400, "Validation failed", result.error.flatten().fieldErrors));
    }
    if (source === "body") req.body = result.data;
    else (req as any).validatedQuery = result.data;
    next();
  };
