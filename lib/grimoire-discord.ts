import "server-only";

import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

export const GRIMOIRE_DISCORD_SETTINGS_ID = "default";
export const GRIMOIRE_DISCORD_COOKIE_NAME = "grimoire_discord_access";
export const DEFAULT_GRIMOIRE_DISCORD_INVITE_URL = "https://discord.gg/jpFhaWyQGB";
export const DEFAULT_GRIMOIRE_DISCORD_PASSWORD = "Gr1mT1d1ngs";

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
    password: settings?.password || DEFAULT_GRIMOIRE_DISCORD_PASSWORD,
  };
}

export function createGrimoireDiscordAccessToken(password: string) {
  return createHash("sha256").update(password).digest("hex");
}
