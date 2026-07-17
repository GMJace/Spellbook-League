import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  achievementBadgeSourceFileBySlug,
  achievementBadgeSlugOrder,
  getAchievementBadgePath,
} from "../prisma/achievement-badge-map";

const prisma = new PrismaClient();
const legacyAchievementSlugAliases: Record<string, string> = {
  "deaths-door-duelist": "death-s-door-duelist",
  "executioners-timing": "executioner-s-timing",
};

async function main() {
  const repoRoot = process.cwd();
  const sourceDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(repoRoot, "..", "badges", "Achievements");
  const targetDir = path.resolve(repoRoot, "public", "uploads", "achievement-badges");

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Badge source directory not found: ${sourceDir}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"));

  for (const [index, slug] of achievementBadgeSlugOrder.entries()) {
    const configuredSourceFileName = achievementBadgeSourceFileBySlug[slug];
    const prefix = `Achievements_${String(index).padStart(4, "0")}_`;
    const sourceFileName =
      configuredSourceFileName ??
      sourceFiles.find((fileName) => fileName.startsWith(prefix));

    if (!sourceFileName) {
      throw new Error(`Missing badge file for index ${index}: ${prefix}*.png`);
    }

    const sourcePath = path.join(sourceDir, sourceFileName);
    const targetPath = path.join(targetDir, `${slug}.png`);

    fs.copyFileSync(sourcePath, targetPath);
  }

  const updates = await Promise.all(
    achievementBadgeSlugOrder.map(async (slug) => {
      const badgeImagePath = getAchievementBadgePath(slug);
      const directUpdate = await prisma.achievement.updateMany({
        where: { slug },
        data: { badgeImagePath },
      });

      if (directUpdate.count > 0) {
        return directUpdate.count;
      }

      const legacySlug = legacyAchievementSlugAliases[slug];

      if (!legacySlug) {
        return 0;
      }

      const legacyUpdate = await prisma.achievement.updateMany({
        where: { slug: legacySlug },
        data: {
          slug,
          badgeImagePath,
        },
      });

      return legacyUpdate.count;
    })
  );

  const updatedCount = updates.reduce((sum, count) => sum + count, 0);

  console.log(
    `Imported ${achievementBadgeSlugOrder.length} badge image files and updated ${updatedCount} achievement records.`
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
