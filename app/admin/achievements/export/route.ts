import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");

  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildAchievementsCsv(
  achievements: Array<{
    id: string;
    slug: string;
    category: string;
    name: string;
    description: string;
    badgeImagePath: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      awards: number;
    };
  }>,
) {
  const header = [
    "ID",
    "Slug",
    "Category",
    "Name",
    "Description",
    "Badge Image Path",
    "Award Count",
    "Created At",
    "Updated At",
  ];

  const rows = achievements.map((achievement) => [
    achievement.id,
    achievement.slug,
    achievement.category,
    achievement.name,
    achievement.description,
    achievement.badgeImagePath,
    achievement._count.awards,
    achievement.createdAt.toISOString(),
    achievement.updatedAt.toISOString(),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const achievements = await prisma.achievement.findMany({
    include: {
      _count: {
        select: {
          awards: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const csv = buildAchievementsCsv(achievements);
  const exportDate = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="achievements-${exportDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
