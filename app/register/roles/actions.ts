"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getProfileImageUpload,
  removeProfileImageUpload,
  saveProfileImageUpload,
} from "@/lib/profile-image-upload";
import { prisma } from "@/lib/prisma";
import { oauthRoleSelectionSchema } from "@/lib/validation";

export async function completeOAuthRegistration(formData: FormData) {
  const user = await requireUser({ allowMissingDiscord: true });
  const profileImage = getProfileImageUpload(formData.get("profileImage"));

  const parsed = oauthRoleSelectionSchema.safeParse({
    discordHandle: formData.get("discordHandle") ?? user.discordHandle ?? "",
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Choose at least one role to continue.",
    };
  }

  let uploadedProfileImagePath: string | null = null;

  try {
    if (profileImage) {
      uploadedProfileImagePath = await saveProfileImageUpload(profileImage);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not save that profile image right now.",
    };
  }

  await prisma.$transaction(async (tx) => {
    try {
      await tx.user.update({
        where: { id: user.id },
        data: {
          discordHandle: parsed.data.discordHandle || null,
          profileImagePath:
            uploadedProfileImagePath ?? user.profileImagePath ?? null,
        },
      });

      await tx.userRole.deleteMany({
        where: { userId: user.id },
      });

      await tx.userRole.createMany({
        data: parsed.data.roles.map((role: "PLAYER" | "DM") => ({
          userId: user.id,
          role,
        })),
      });
    } catch (error) {
      if (uploadedProfileImagePath) {
        await removeProfileImageUpload(uploadedProfileImagePath);
      }

      throw error;
    }
  });

  if (
    uploadedProfileImagePath &&
    user.profileImagePath &&
    user.profileImagePath !== uploadedProfileImagePath
  ) {
    await removeProfileImageUpload(user.profileImagePath);
  }

  const redirectTo = parsed.data.roles.includes("PLAYER") ? "/player" : "/dm";
  redirect(redirectTo);
}
