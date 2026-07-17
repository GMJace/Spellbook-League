import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { parseDetailsJson, parseSiteHealthReport } from "@/lib/site-monitoring";
import { runSiteHealthCheckAction } from "@/app/admin/site-health/actions";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function getStatusStyles(value: string) {
  switch (value) {
    case "HEALTHY":
    case "PASS":
    case "INFO":
      return {
        background: "rgba(70, 155, 105, 0.18)",
        border: "1px solid rgba(70, 155, 105, 0.35)",
        color: "#b8f3ca",
      };
    case "DEGRADED":
    case "WARN":
      return {
        background: "rgba(201, 162, 67, 0.18)",
        border: "1px solid rgba(201, 162, 67, 0.35)",
        color: "#ffe7a0",
      };
    default:
      return {
        background: "rgba(181, 78, 78, 0.18)",
        border: "1px solid rgba(181, 78, 78, 0.35)",
        color: "#ffb0b0",
      };
  }
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      style={{
        ...getStatusStyles(value),
        borderRadius: "999px",
        display: "inline-flex",
        fontSize: "0.8rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "0.35rem 0.7rem",
        textTransform: "uppercase",
      }}
    >
      {formatStatusLabel(value)}
    </span>
  );
}

export default async function AdminSiteHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ health?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [latestHealthCheck, recentHealthChecks, recentErrorEvents, recentLogs, errorCount24h, logCount24h] =
    await Promise.all([
      prisma.siteHealthCheck.findFirst({
        include: {
          triggeredBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.siteHealthCheck.findMany({
        include: {
          triggeredBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
      prisma.siteMonitorEvent.findMany({
        where: {
          level: "ERROR",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
      prisma.siteMonitorEvent.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      }),
      prisma.siteMonitorEvent.count({
        where: {
          level: "ERROR",
          createdAt: {
            gte: last24Hours,
          },
        },
      }),
      prisma.siteMonitorEvent.count({
        where: {
          createdAt: {
            gte: last24Hours,
          },
        },
      }),
    ]);

  const latestReport = parseSiteHealthReport(latestHealthCheck?.reportJson);
  const healthMessageMap: Record<string, string> = {
    failed: "The health check could not be completed. The failure has been logged.",
    ran: "Health check completed.",
  };
  const healthMessage = params.health ? healthMessageMap[params.health] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {healthMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{healthMessage}</p> : null}

        <AdminPageHeader
          description="Review captured application errors, recent system logs, and the latest health report before going live."
          extraActions={
            <form action={runSiteHealthCheckAction}>
              <button className="button secondary" type="submit">
                Run health check
              </button>
            </form>
          }
          title="Site health"
        />

        <div className="list-card stack">
          <div className="ggcon-summary-metrics">
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Latest overall status</span>
              <strong>
                {latestHealthCheck ? (
                  <StatusPill value={latestHealthCheck.status} />
                ) : (
                  "No report yet"
                )}
              </strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Errors in last 24h</span>
              <strong>{errorCount24h}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Logs in last 24h</span>
              <strong>{logCount24h}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Last health check</span>
              <strong>
                {latestHealthCheck ? formatDateTime(latestHealthCheck.createdAt) : "Not run yet"}
              </strong>
            </div>
          </div>
        </div>

        <section className="list-card stack">
          <img alt="Site health divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Latest health report</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Manual health checks verify core database access, auth configuration,
                upload storage, and recent error volume.
              </p>
            </div>
          </div>

          {latestHealthCheck && latestReport ? (
            <div className="stack">
              <div
                className="panel stack"
                style={{ gap: "0.6rem" }}
              >
                <div
                  className="inline-actions"
                  style={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <StatusPill value={latestHealthCheck.status} />
                    <strong>{latestHealthCheck.summary}</strong>
                    <span className="muted">
                      Ran {formatDateTime(latestHealthCheck.createdAt)} by{" "}
                      {latestHealthCheck.triggeredBy?.name ||
                        latestHealthCheck.triggeredBy?.email ||
                        "System"}
                    </span>
                  </div>
                  <span className="muted">{formatDuration(latestHealthCheck.durationMs)}</span>
                </div>

                {latestReport.configuredProviders.length ? (
                  <p className="muted" style={{ margin: 0 }}>
                    OAuth providers: {latestReport.configuredProviders.join(", ")}
                  </p>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    OAuth providers: none configured
                  </p>
                )}
              </div>

              <div className="table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Check</th>
                      <th>Status</th>
                      <th>Result</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestReport.checks.map((check) => (
                      <tr key={check.name}>
                        <td>{check.name}</td>
                        <td>
                          <StatusPill value={check.status} />
                        </td>
                        <td style={{ minWidth: "20rem" }}>{check.message}</td>
                        <td style={{ minWidth: "16rem" }}>
                          {check.details.length ? (
                            <ul className="contact-list" style={{ margin: 0 }}>
                              {check.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="muted">No extra details</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty">
              No health report has been captured yet. Run the health check to create the
              first report.
            </div>
          )}
        </section>

        <section className="list-card stack">
          <img alt="Recent checks divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Recent health checks</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                The latest ten manual runs, including who triggered them and how long they took.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Checked</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Triggered by</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentHealthChecks.length ? (
                  recentHealthChecks.map((check) => (
                    <tr key={check.id}>
                      <td>{formatDateTime(check.createdAt)}</td>
                      <td>
                        <StatusPill value={check.status} />
                      </td>
                      <td style={{ minWidth: "18rem" }}>{check.summary}</td>
                      <td>{check.triggeredBy?.name || check.triggeredBy?.email || "System"}</td>
                      <td>{formatDuration(check.durationMs)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={5}>
                      No health checks have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="list-card stack">
          <img alt="Recent errors divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Recent error events</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Server-side console errors and client error boundary reports captured by the app.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Message</th>
                  <th>Path</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {recentErrorEvents.length ? (
                  recentErrorEvents.map((event) => {
                    const details = parseDetailsJson(event.detailsJson);

                    return (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.createdAt)}</td>
                        <td>{event.source}</td>
                        <td style={{ minWidth: "18rem", whiteSpace: "pre-wrap" }}>{event.message}</td>
                        <td>{event.requestPath || "N/A"}</td>
                        <td style={{ minWidth: "18rem" }}>
                          {details.length || event.stack ? (
                            <details>
                              <summary>View details</summary>
                              {details.length ? (
                                <ul className="contact-list">
                                  {details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {event.stack ? (
                                <pre
                                  style={{
                                    margin: "0.75rem 0 0",
                                    overflowX: "auto",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {event.stack}
                                </pre>
                              ) : null}
                            </details>
                          ) : (
                            <span className="muted">No extra details</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={5}>
                      No error events have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="list-card stack">
          <img alt="Site logs divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Recent site logs</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Health checks and application events captured in the site monitoring feed.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length ? (
                  recentLogs.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDateTime(event.createdAt)}</td>
                      <td>
                        <StatusPill value={event.level} />
                      </td>
                      <td>{formatStatusLabel(event.category)}</td>
                      <td>{event.source}</td>
                      <td style={{ minWidth: "20rem", whiteSpace: "pre-wrap" }}>{event.message}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={5}>
                      No site logs have been captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
