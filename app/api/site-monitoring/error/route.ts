import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordSiteMonitorEvent } from "@/lib/site-monitoring-server";

const clientErrorSchema = z.object({
  digest: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(500),
  path: z.string().trim().max(500).optional(),
  source: z.string().trim().min(1).max(120),
  stack: z.string().trim().max(8000).optional().nullable(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = clientErrorSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const details = parsed.data.digest ? [`digest=${parsed.data.digest}`] : [];

  await recordSiteMonitorEvent(prisma, {
    category: "APPLICATION_ERROR",
    level: "ERROR",
    source: parsed.data.source,
    message: parsed.data.message,
    details,
    requestPath: parsed.data.path ?? null,
    stack: parsed.data.stack ?? null,
  });

  return NextResponse.json({ ok: true });
}
