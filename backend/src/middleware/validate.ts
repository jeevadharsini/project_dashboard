import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/errors";

type Source = "body" | "query" | "params";

// Wraps a Zod schema as Express middleware. Every mutating endpoint (and
// any endpoint reading filters from the query string) runs its input
// through one of these before touching the database.
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(
          `Invalid ${source}: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
          422,
          "VALIDATION_ERROR"
        )
      );
    }
    (req as any)[source] = result.data;
    next();
  };
}
