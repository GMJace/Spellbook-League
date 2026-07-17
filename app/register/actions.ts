"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  getProfileImageUpload,
  removeProfileImageUpload,
  saveProfileImageUpload,
} from "@/lib/profile-image-upload";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function registerUser(
  _prevState: { error: string },
  formData: FormData
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    discordHandle: formData.get("discordHandle"),
    email: formData.get("email"),
    password: formData.get("password"),
    roles: formData.getAll("roles"),
    acceptTerms: formData.get("acceptTerms") === "true",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please provide a name, valid email, password, at least one role, and accept the Terms of Service.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existingUser) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const profileImage = getProfileImageUpload(formData.get("profileImage"));
  let uploadedProfileImagePath: string | null = null;

  try {
    if (profileImage) {
      uploadedProfileImagePath = await saveProfileImageUpload(profileImage);
    }

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        discordHandle: parsed.data.discordHandle || null,
        email: parsed.data.email.toLowerCase(),
        profileImagePath: uploadedProfileImagePath,
        passwordHash,
        roles: {
          create: parsed.data.roles.map((role: "PLAYER" | "DM") => ({ role })),
        },
      },
    });
  } catch (error) {
    if (uploadedProfileImagePath) {
      await removeProfileImageUpload(uploadedProfileImagePath);
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not save that profile image right now.",
    };
  }

  redirect("/login?registered=1");
}
