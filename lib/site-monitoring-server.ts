import { constants as fsConstants } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import {
  buildHealthSummary,
  extractErrorDetails,
  mapCheckStatusToHealthStatus,
  mapHealthStatusToLevel,
  normalizeConsoleArgs,
  toDetailsJson,
  truncate,
  type SiteHealthReport,
  type SiteHealthReportCheck,
  type SiteMonitorEventInput,
} from "@/lib/site-monitoring";

type MonitorPrismaClient = Pick<
  PrismaClient,
  "session" | "siteHealthCheck" | "siteMonitorEvent" | "user"
>;

type ConsoleState = typeof globalThis & {
  __spellbookSiteMonitorPatched?: boolean;
  __spellbookSiteMonitorPersisting?: boolean;
  __spellbookSiteMonitorOriginalError?: typeof console.error;
};

function writeMonitorFailure(message: string) {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // Ignore stderr failures during monitoring fallback.
  }
}

export async function recordSiteMonitorEvent(
  prisma: MonitorPrismaClient,
  input: SiteMonitorEventInput
) {
  try {
    await prisma.siteMonitorEvent.create({
      data: {
        category: input.category,
        level: input.level,
        source: truncate(input.source, 120),
        message: truncate(input.message, 500),
        detailsJson: toDetailsJson(input.details),
        requestPath: input.requestPath ? truncate(input.requestPath, 500) : null,
        stack: input.stack ? truncate(input.stack, 8000) : null,
      },
    });
  } catch (error) {
    const details = extractErrorDetails(error);
    writeMonitorFailure(
      `[site-monitoring] Failed to persist event "${input.source}": ${details.message}`
    );
  }
}

export async function logSiteError(
  prisma: MonitorPrismaClient,
  input: {
    source: string;
    error: unknown;
    details?: string[];
    requestPath?: string | null;
  }
) {
  const details = extractErrorDetails(input.error);

  await recordSiteMonitorEvent(prisma, {
    category: "APPLICATION_ERROR",
    level: "ERROR",
    source: input.source,
    message: details.message,
    details: [...(input.details ?? []), ...details.details],
    requestPath: input.requestPath,
    stack: details.stack,
  });
}

export function registerConsoleErrorMonitor(prisma: MonitorPrismaClient) {
  const consoleState = globalThis as ConsoleState;

  if (typeof window !== "undefined" || consoleState.__spellbookSiteMonitorPatched) {
    return;
  }

  consoleState.__spellbookSiteMonitorPatched = true;
  consoleState.__spellbookSiteMonitorOriginalError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    consoleState.__spellbookSiteMonitorOriginalError?.(...args);

    if (consoleState.__spellbookSiteMonitorPersisting) {
      return;
    }

    const event = normalizeConsoleArgs(args);
    consoleState.__spellbookSiteMonitorPersisting = true;

    void recordSiteMonitorEvent(prisma, {
      category: "APPLICATION_ERROR",
      level: "ERROR",
      source: "server.console.error",
      message: event.message,
      details: event.details,
      stack: event.stack,
    }).finally(() => {
      consoleState.__spellbookSiteMonitorPersisting = false;
    });
  };
}

export async function runSiteHealthCheck(
  prisma: MonitorPrismaClient,
  options: {
    triggeredByUserId?: string;
  } = {}
) {
  const startedAt = Date.now();
  const checks: SiteHealthReportCheck[] = [];
  const configuredProviders: string[] = [];

  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
    configuredProviders.push("Discord");
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    configuredProviders.push("Google");
  }

  try {
    const [userCount, activeSessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({
        where: {
          expires: {
            gt: new Date(),
          },
        },
      }),
    ]);

    checks.push({
      name: "Database connectivity",
      status: "PASS",
      message: "Core database queries completed successfully.",
      details: [`Users: ${userCount}`, `Active sessions: ${activeSessionCount}`],
    });
  } catch (error) {
    const details = extractErrorDetails(error);
    checks.push({
      name: "Database connectivity",
      status: "FAIL",
      message: details.message,
      details: details.details,
    });
  }

  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  checks.push({
    name: "Auth secret",
    status: authSecret ? "PASS" : "FAIL",
    message: authSecret
      ? "Authentication secret is configured."
      : "AUTH_SECRET (or NEXTAUTH_SECRET) is missing.",
    details: configuredProviders.length
      ? [`Configured OAuth providers: ${configuredProviders.join(", ")}`]
      : ["Configured OAuth providers: credentials only"],
  });

  const partiallyConfiguredProviders: string[] = [];

  if (Boolean(process.env.AUTH_DISCORD_ID) !== Boolean(process.env.AUTH_DISCORD_SECRET)) {
    partiallyConfiguredProviders.push("Discord");
  }

  if (Boolean(process.env.AUTH_GOOGLE_ID) !== Boolean(process.env.AUTH_GOOGLE_SECRET)) {
    partiallyConfiguredProviders.push("Google");
  }

  checks.push({
    name: "OAuth provider configuration",
    status: partiallyConfiguredProviders.length ? "WARN" : "PASS",
    message: partiallyConfiguredProviders.length
      ? `Some providers are only partially configured: ${partiallyConfiguredProviders.join(", ")}.`
      : configuredProviders.length
        ? `Configured providers: ${configuredProviders.join(", ")}.`
        : "No social OAuth providers are configured.",
    details: partiallyConfiguredProviders.length
      ? ["Set both the client ID and client secret before enabling a provider."]
      : [],
  });

  const publicDirectory = path.join(process.cwd(), "public");
  const uploadsDirectory = path.join(publicDirectory, "uploads");

  try {
    await access(publicDirectory, fsConstants.W_OK);
    await mkdir(uploadsDirectory, { recursive: true });

    checks.push({
      name: "Upload storage",
      status: "PASS",
      message: "Public uploads directory is writable.",
      details: [uploadsDirectory],
    });
  } catch (error) {
    const details = extractErrorDetails(error);
    checks.push({
      name: "Upload storage",
      status: "FAIL",
      message: details.message,
      details: [publicDirectory, ...details.details],
    });
  }

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let recentErrorCount24h = 0;

  try {
    recentErrorCount24h = await prisma.siteMonitorEvent.count({
      where: {
        level: "ERROR",
        createdAt: {
          gte: last24Hours,
        },
      },
    });

    checks.push({
      name: "Recent application errors",
      status:
        recentErrorCount24h === 0 ? "PASS" : recentErrorCount24h <= 5 ? "WARN" : "FAIL",
      message:
        recentErrorCount24h === 0
          ? "No server-side errors were captured during the last 24 hours."
          : `${recentErrorCount24h} server-side error event${recentErrorCount24h === 1 ? "" : "s"} captured during the last 24 hours.`,
      details:
        recentErrorCount24h > 0
          ? ["Review the recent error feed below for full details."]
          : [],
    });
  } catch (error) {
    const details = extractErrorDetails(error);
    checks.push({
      name: "Recent application errors",
      status: "FAIL",
      message: details.message,
      details: details.details,
    });
  }

  const status = mapCheckStatusToHealthStatus(checks);
  const durationMs = Date.now() - startedAt;
  const summary = buildHealthSummary(status, checks);
  const report: SiteHealthReport = {
    checkedAt: new Date().toISOString(),
    configuredProviders,
    recentErrorCount24h,
    checks,
  };

  const healthCheck = await prisma.siteHealthCheck.create({
    data: {
      triggeredByUserId: options.triggeredByUserId ?? null,
      status,
      summary,
      reportJson: JSON.stringify(report),
      durationMs,
    },
  });

  await recordSiteMonitorEvent(prisma, {
    category: "HEALTH_CHECK",
    level: mapHealthStatusToLevel(status),
    source: "admin.site-health.run",
    message: summary,
    details: [`durationMs=${durationMs}`, `status=${status}`],
  });

  return healthCheck;
}
