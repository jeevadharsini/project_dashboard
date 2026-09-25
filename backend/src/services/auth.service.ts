import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken, generateRefreshToken, hashToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";
import { env } from "../config/env";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// Rotates the refresh token on every use: the old one is revoked and a new
// one issued. This limits the blast radius if a refresh token is stolen -
// reuse of a revoked token is a signal the token was compromised.
export async function refresh(oldToken: string) {
  const tokenHash = hashToken(oldToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw new UnauthorizedError("Invalid refresh token");

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(newRefreshToken), expiresAt },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}
