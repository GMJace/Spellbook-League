"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export async function loginUser(
  _prevState: { error: string },
  formData: FormData
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { roles: true },
  });

  if (!user) {
    return { error: "Login failed. Check your email and password." };
  }

  if (!user.passwordHash) {
    return { error: "This account uses Google sign-in. Use the Google button instead." };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return { error: "Login failed. Check your email and password." };
  }

  const redirectTo = user.roles.some((role: { role: string }) => role.role === "PLAYER")
    ? "/player"
    : "/dm";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Login failed. Check your email and password." };
    }

    throw error;
  }

  redirect(redirectTo);
}
