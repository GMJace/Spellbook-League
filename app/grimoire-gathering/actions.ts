"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createGrimoireDiscordAccessToken,
  getGrimoireDiscordSettings,
  GRIMOIRE_DISCORD_COOKIE_NAME,
} from "@/lib/grimoire-discord";

export async function unlockGrimoireDiscord(formData: FormData) {
  const enteredPassword = String(formData.get("password") ?? "").trim();
  const settings = await getGrimoireDiscordSettings();

  if (enteredPassword !== settings.password) {
    redirect("/grimoire-gathering?discord=invalid");
  }

  const cookieStore = await cookies();

  cookieStore.set(
    GRIMOIRE_DISCORD_COOKIE_NAME,
    createGrimoireDiscordAccessToken(settings.password),
    {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/grimoire-gathering",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  redirect("/grimoire-gathering?discord=unlocked");
}
