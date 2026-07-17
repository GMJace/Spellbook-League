import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function getValidPasswordResetToken(token: string) {
  const tokenHash = hashToken(token);

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
    },
  });
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!resetToken) {
    return null;
  }

  const updateResult = await prisma.passwordResetToken.updateMany({
    where: {
      id: resetToken.id,
      usedAt: null,
    },
    data: { usedAt: now },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  return resetToken;
}
