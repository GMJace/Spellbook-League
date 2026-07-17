"use server";

import { headers } from "next/headers";
import { forgotPasswordSchema } from "@/lib/validation";
import { createPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} from "@/lib/transactional-email";

export async function requestPasswordReset(
  _prevState: { error: string; success: string; devResetPath: string },
  formData: FormData
) {
  const requestHeaders = await headers();
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email address.",
      success: "",
      devResetPath: "",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  let devResetPath = "";

  if (user) {
    const { token } = await createPasswordResetToken(user.id);
    const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
    const forwardedHost =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
    const requestBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : undefined;

    if (process.env.NODE_ENV !== "production") {
      devResetPath = `/reset-password?token=${token}`;
    }

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: buildPasswordResetUrl(token, requestBaseUrl),
      });
    } catch (error) {
      console.error("Failed to send password reset email.", error);
    }
  }

  return {
    error: "",
    success:
      process.env.NODE_ENV === "production"
        ? "If that email is registered and password reset delivery is enabled, a reset link will be sent."
        : "If that email is registered, a reset link has been prepared for this local environment.",
    devResetPath,
  };
}
