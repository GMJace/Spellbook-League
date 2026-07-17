"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { resetPasswordSchema } from "@/lib/validation";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { sendPasswordChangedEmail } from "@/lib/transactional-email";

export async function resetPassword(
  _prevState: { error: string; success: string },
  formData: FormData
) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please review the password fields.",
      success: "",
    };
  }

  const resetToken = await consumePasswordResetToken(parsed.data.token);

  if (!resetToken) {
    return {
      error: "This password reset link is invalid or has expired.",
      success: "",
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: resetToken.userId },
    select: { email: true, name: true },
  });

  if (!dbUser) {
    return {
      error: "We could not find the account for this reset request.",
      success: "",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  revalidatePath("/login");

  try {
    await sendPasswordChangedEmail({
      to: dbUser.email,
      name: dbUser.name,
    });
  } catch (error) {
    console.error("Failed to send password changed email.", error);
  }

  return {
    error: "",
    success: "Password reset complete.",
  };
}
