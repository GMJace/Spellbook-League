import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";

export const GRIMOIRE_DISCORD_SETTINGS_ID = "default";
export const GRIMOIRE_DISCORD_COOKIE_NAME = "grimoire_discord_access";
export const DEFAULT_GRIMOIRE_DISCORD_INVITE_URL = "https://discord.gg/jpFhaWyQGB";

export type GrimoireDiscordSettingsRecord = {
  id: string;
  inviteUrl: string;
  password: string;
};

function getGrimoireDiscordSettingsDelegate() {
  return (prisma as typeof prisma & {
    grimoireDiscordSettings?: {
      findUnique?: (...args: any[]) => Promise<{
        inviteUrl?: string | null;
        password?: string | null;
      } | null>;
    };
  }).grimoireDiscordSettings;
}

export async function getGrimoireDiscordSettings(): Promise<GrimoireDiscordSettingsRecord> {
  const delegate = getGrimoireDiscordSettingsDelegate();
  const settings = delegate?.findUnique
    ? await delegate.findUnique({
        where: {
          id: GRIMOIRE_DISCORD_SETTINGS_ID,
        },
      })
    : null;

  return {
    id: GRIMOIRE_DISCORD_SETTINGS_ID,
    inviteUrl: settings?.inviteUrl?.trim() || DEFAULT_GRIMOIRE_DISCORD_INVITE_URL,
    password: settings?.password || process.env.GRIMOIRE_DISCORD_PASSWORD?.trim() || "",
  };
}

export function createGrimoireDiscordAccessToken(password: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for Discord access cookies.");
  return createHmac("sha256", secret).update(password).digest("hex");
}

export function isGrimoireDiscordPasswordValid(enteredPassword: string, password: string) {
  if (!enteredPassword || !password) return false;
  const entered = Buffer.from(enteredPassword);
  const expected = Buffer.from(password);
  return entered.length === expected.length && timingSafeEqual(entered, expected);
}
