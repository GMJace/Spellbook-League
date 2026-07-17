import type {
  SiteHealthStatus,
  SiteMonitorCategory,
  SiteMonitorLevel,
} from "@prisma/client";

export type SiteHealthReportCheck = {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
  details: string[];
};

export type SiteHealthReport = {
  checkedAt: string;
  configuredProviders: string[];
  recentErrorCount24h: number;
  checks: SiteHealthReportCheck[];
};

export type SiteMonitorEventInput = {
  category: SiteMonitorCategory;
  level: SiteMonitorLevel;
  source: string;
  message: string;
  details?: string[];
  requestPath?: string | null;
  stack?: string | null;
};

export function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export function serializeUnknown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack || value.message;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function extractErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || "Unknown error",
      stack: error.stack ?? null,
      details: error.cause ? [truncate(`cause=${serializeUnknown(error.cause)}`, 400)] : [],
    };
  }

  return {
    message: truncate(serializeUnknown(error), 500) || "Unknown error",
    stack: null,
    details: [],
  };
}

export function toDetailsJson(details: string[] | undefined) {
  return JSON.stringify(
    (details ?? [])
      .map((detail) => truncate(detail, 400))
      .filter(Boolean)
      .slice(0, 20)
  );
}

export function normalizeConsoleArgs(args: unknown[]) {
  const firstError = args.find((value) => value instanceof Error) as Error | undefined;
  const stringArgs = args.filter((value) => typeof value === "string") as string[];
  const message =
    stringArgs[0]?.trim() ||
    firstError?.message?.trim() ||
    "console.error invoked without a message";
  const details = args
    .map((value) => truncate(serializeUnknown(value), 500))
    .filter(Boolean)
    .slice(0, 10);

  return {
    message: truncate(message, 500),
    stack: firstError?.stack ? truncate(firstError.stack, 8000) : null,
    details,
  };
}

export function mapCheckStatusToHealthStatus(checks: SiteHealthReportCheck[]): SiteHealthStatus {
  if (checks.some((check) => check.status === "FAIL")) {
    return "FAILING";
  }

  if (checks.some((check) => check.status === "WARN")) {
    return "DEGRADED";
  }

  return "HEALTHY";
}

export function mapHealthStatusToLevel(status: SiteHealthStatus): SiteMonitorLevel {
  if (status === "FAILING") {
    return "ERROR";
  }

  if (status === "DEGRADED") {
    return "WARN";
  }

  return "INFO";
}

export function buildHealthSummary(
  status: SiteHealthStatus,
  checks: SiteHealthReportCheck[]
) {
  const failingChecks = checks.filter((check) => check.status === "FAIL");
  const warningChecks = checks.filter((check) => check.status === "WARN");

  if (status === "HEALTHY") {
    return "All monitored systems passed the latest health check.";
  }

  if (status === "DEGRADED") {
    return `${warningChecks.length} warning check${warningChecks.length === 1 ? "" : "s"} detected.`;
  }

  return `${failingChecks.length} failing check${failingChecks.length === 1 ? "" : "s"} detected${warningChecks.length ? ` and ${warningChecks.length} warning check${warningChecks.length === 1 ? "" : "s"}` : ""}.`;
}

export function parseDetailsJson(detailsJson: string | null | undefined) {
  if (!detailsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(detailsJson);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export function parseSiteHealthReport(reportJson: string | null | undefined): SiteHealthReport | null {
  if (!reportJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(reportJson) as Partial<SiteHealthReport>;
    if (!parsed || !Array.isArray(parsed.checks)) {
      return null;
    }

    return {
      checkedAt: typeof parsed.checkedAt === "string" ? parsed.checkedAt : new Date().toISOString(),
      configuredProviders: Array.isArray(parsed.configuredProviders)
        ? parsed.configuredProviders.filter((entry): entry is string => typeof entry === "string")
        : [],
      recentErrorCount24h:
        typeof parsed.recentErrorCount24h === "number" ? parsed.recentErrorCount24h : 0,
      checks: parsed.checks
        .map((check) => {
          if (!check || typeof check !== "object") {
            return null;
          }

          const typedCheck = check as Partial<SiteHealthReportCheck>;
          return {
            name: typeof typedCheck.name === "string" ? typedCheck.name : "Unknown check",
            status:
              typedCheck.status === "PASS" ||
              typedCheck.status === "WARN" ||
              typedCheck.status === "FAIL"
                ? typedCheck.status
                : "WARN",
            message:
              typeof typedCheck.message === "string"
                ? typedCheck.message
                : "No check message available.",
            details: Array.isArray(typedCheck.details)
              ? typedCheck.details.filter((entry): entry is string => typeof entry === "string")
              : [],
          };
        })
        .filter((check): check is SiteHealthReportCheck => Boolean(check)),
    };
  } catch {
    return null;
  }
}
