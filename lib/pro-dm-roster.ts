import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ProDmRosterEntry = {
  userId: string;
  isListed: boolean;
  rating: number;
  headline: string | null;
  specialties: string | null;
  bio: string | null;
  updatedAt: string;
};

const PRO_DM_ROSTER_PATH = path.join(process.cwd(), "data", "pro-dm-roster.json");

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeEntry(entry: Partial<ProDmRosterEntry> & { userId: string }): ProDmRosterEntry {
  return {
    userId: entry.userId,
    isListed: Boolean(entry.isListed),
    rating: Math.max(1, Math.min(5, Math.round(entry.rating ?? 5))),
    headline: normalizeText(entry.headline),
    specialties: normalizeText(entry.specialties),
    bio: normalizeText(entry.bio),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

async function writeRosterEntries(entries: ProDmRosterEntry[]) {
  await mkdir(path.dirname(PRO_DM_ROSTER_PATH), { recursive: true });
  await writeFile(PRO_DM_ROSTER_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function getProDmRosterEntries() {
  try {
    const file = await readFile(PRO_DM_ROSTER_PATH, "utf8");
    const parsed = JSON.parse(file);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is Partial<ProDmRosterEntry> & { userId: string } => {
        return Boolean(entry && typeof entry === "object" && typeof entry.userId === "string");
      })
      .map((entry) => normalizeEntry(entry));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function getProDmRosterEntry(userId: string) {
  const entries = await getProDmRosterEntries();

  return entries.find((entry) => entry.userId === userId) ?? null;
}

export async function updateProDmPublicProfile(
  userId: string,
  profile: {
    headline: string | null;
    specialties: string | null;
    bio: string | null;
  }
) {
  const entries = await getProDmRosterEntries();
  const index = entries.findIndex((entry) => entry.userId === userId);
  const currentEntry =
    index >= 0
      ? entries[index]
      : normalizeEntry({
          userId,
          isListed: false,
          rating: 5,
        });

  const nextEntry = normalizeEntry({
    ...currentEntry,
    headline: profile.headline,
    specialties: profile.specialties,
    bio: profile.bio,
    updatedAt: new Date().toISOString(),
  });

  const hasPublicProfile = Boolean(
    nextEntry.isListed || nextEntry.headline || nextEntry.specialties || nextEntry.bio
  );

  if (!hasPublicProfile) {
    if (index >= 0) {
      entries.splice(index, 1);
      await writeRosterEntries(entries);
    }

    return;
  }

  if (index >= 0) {
    entries[index] = nextEntry;
  } else {
    entries.push(nextEntry);
  }

  await writeRosterEntries(entries);
}

export async function setProDmRosterListing(
  userId: string,
  isListed: boolean,
  rating?: number
) {
  const entries = await getProDmRosterEntries();
  const index = entries.findIndex((entry) => entry.userId === userId);
  const currentEntry =
    index >= 0
      ? entries[index]
      : normalizeEntry({
          userId,
          isListed: false,
          rating: 5,
        });

  const nextEntry = normalizeEntry({
    ...currentEntry,
    isListed,
    rating: rating ?? currentEntry.rating,
    updatedAt: new Date().toISOString(),
  });

  if (index >= 0) {
    entries[index] = nextEntry;
  } else {
    entries.push(nextEntry);
  }

  await writeRosterEntries(entries);
}
