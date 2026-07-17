"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getProfileImageUpload,
  removeProfileImageUpload,
  saveProfileImageUpload,
} from "@/lib/profile-image-upload";
import { updateProDmPublicProfile } from "@/lib/pro-dm-roster";
import { sendPasswordChangedEmail } from "@/lib/transactional-email";
import {
  changePasswordSchema,
  discordHandleSchema,
  hasDiscordHandle,
  leagueRolesSchema,
  rolesRequireDiscordHandle,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  discordHandle: discordHandleSchema,
  dmProfileHeadline: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal("")),
  dmProfileSpecialties: z
    .string()
    .trim()
    .max(140)
    .optional()
    .or(z.literal("")),
  dmProfileBio: z
    .string()
    .trim()
    .max(1200)
    .optional()
    .or(z.literal("")),
  roles: leagueRolesSchema,
}).superRefine((data, ctx) => {
  if (rolesRequireDiscordHandle(data.roles) && !hasDiscordHandle(data.discordHandle)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Discord handle is required for player and DM accounts.",
      path: ["discordHandle"],
    });
  }
});

export async function updateProfile(formData: FormData) {
  const user = await requireUser({ allowMissingDiscord: true });
  const profileImage = getProfileImageUpload(formData.get("profileImage"));
  const shouldRemoveProfileImage = formData.get("removeProfileImage") === "true";

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    discordHandle: formData.get("discordHandle") ?? "",
    dmProfileHeadline: formData.get("dmProfileHeadline") ?? "",
    dmProfileSpecialties: formData.get("dmProfileSpecialties") ?? "",
    dmProfileBio: formData.get("dmProfileBio") ?? "",
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    redirect("/profile?error=invalid");
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.id !== user.id) {
    redirect("/profile?error=email-in-use");
  }

  let uploadedProfileImagePath: string | null = null;

  try {
    if (profileImage) {
      uploadedProfileImagePath = await saveProfileImageUpload(profileImage);
    }
  } catch (error) {
    redirect(
      `/profile?error=${encodeURIComponent(
        error instanceof Error ? error.message : "image"
      )}`
    );
  }

  const nextProfileImagePath = uploadedProfileImagePath
    ? uploadedProfileImagePath
    : shouldRemoveProfileImage
      ? null
      : user.profileImagePath ?? null;
  const previousProfileImagePath =
    uploadedProfileImagePath || shouldRemoveProfileImage
      ? user.profileImagePath ?? null
      : null;

  await prisma.$transaction(async (tx) => {
    try {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: parsed.data.name,
          email: normalizedEmail,
          discordHandle: parsed.data.discordHandle || null,
          profileImagePath: nextProfileImagePath,
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

  const shouldStoreDmPublicProfile = parsed.data.roles.includes("DM");

  await updateProDmPublicProfile(user.id, {
    headline: shouldStoreDmPublicProfile ? parsed.data.dmProfileHeadline || null : null,
    specialties: shouldStoreDmPublicProfile
      ? parsed.data.dmProfileSpecialties || null
      : null,
    bio: shouldStoreDmPublicProfile ? parsed.data.dmProfileBio || null : null,
  });

  if (
    previousProfileImagePath &&
    previousProfileImagePath !== nextProfileImagePath
  ) {
    await removeProfileImageUpload(previousProfileImagePath);
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/player");
  revalidatePath("/player/characters/[id]", "page");
  revalidatePath("/dm");
  revalidatePath("/dm/[id]", "page");
  revalidatePath("/dm/players");
  revalidatePath("/hire-a-dm");
  revalidatePath("/hire-a-dm/[id]", "page");
  revalidatePath(`/hire-a-dm/${user.id}`);

  redirect("/profile?updated=1");
}

export async function updatePassword(
  _prevState: { error: string; success: string },
  formData: FormData
) {
  const user = await requireUser({ allowMissingDiscord: true });
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please review the password fields.",
      success: "",
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser) {
    return {
      error: "We could not update the password for this account.",
      success: "",
    };
  }

  if (dbUser.passwordHash) {
    if (!parsed.data.currentPassword) {
      return {
        error: "Enter your current password to make a change.",
        success: "",
      };
    }

    const currentPasswordMatches = await bcrypt.compare(
      parsed.data.currentPassword,
      dbUser.passwordHash
    );

    if (!currentPasswordMatches) {
      return {
        error: "Your current password was incorrect.",
        success: "",
      };
    }

    const passwordIsUnchanged = await bcrypt.compare(
      parsed.data.newPassword,
      dbUser.passwordHash
    );

    if (passwordIsUnchanged) {
      return {
        error: "Choose a new password that is different from the current one.",
        success: "",
      };
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  revalidatePath("/profile");

  try {
    await sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      wasCreated: !dbUser.passwordHash,
    });
  } catch (error) {
    console.error("Failed to send password changed email.", error);
  }

  return {
    error: "",
    success: dbUser.passwordHash
      ? "Password updated."
      : "Password created. You can now sign in with email and password.",
  };
}
