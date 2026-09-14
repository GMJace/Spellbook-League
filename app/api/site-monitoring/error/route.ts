import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordSiteMonitorEvent } from "@/lib/site-monitoring-server";
import { isSameOriginRequest } from "@/lib/request-origin";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",").at(-1)?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = getClientAddress(request);
  const current = requestWindows.get(key);

  if (!current || current.resetAt <= now) {
    if (requestWindows.size >= 10_000) requestWindows.clear();
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

const clientErrorSchema = z.object({
  digest: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(500),
  path: z.string().trim().max(500).optional(),
  source: z.string().trim().min(1).max(120),
  stack: z.string().trim().max(8000).optional().nullable(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request, process.env.APP_BASE_URL)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

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
