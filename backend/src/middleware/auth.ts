import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

// authenticateUser: verifies the access token from the Authorization header.
// This is the ONLY place identity is established; every downstream handler
// trusts req.user, never a client-supplied userId/role in the body/query.
export function authenticateUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing access token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(" or ")}`));
    }
    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
// Most PM-only endpoints also allow Admin as a superuser override; routes
// that must be strictly PM-owned (e.g. "my projects") filter by creatorId
// in the controller/service layer instead of relying on this alone.
export const requireProjectManager = requireRole(Role.ADMIN, Role.PM);
export const requireDeveloper = requireRole(Role.ADMIN, Role.PM, Role.DEVELOPER);
