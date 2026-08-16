import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SortMode = "code" | "title";

function getSortMode(value: string | undefined): SortMode {
  return value === "title" ? "title" : "code";
}

export default async function AdminModulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    module?: string;
    sort?: string;
  }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const sort = getSortMode(params.sort);

  const modules = await prisma.adventureCatalog.findMany({
    orderBy:
      sort === "title"
        ? [{ title: "asc" }, { adventureCode: "asc" }, { tier: "asc" }]
        : [{ adventureCode: "asc" }, { tier: "asc" }, { title: "asc" }],
  });

  const moduleMessageMap: Record<string, string> = {
    invalid: "The requested module record could not be loaded.",
  };
  const moduleMessage = params.module ? moduleMessageMap[params.module] : "";

  return (
    <main className="page-shell">
      <section className="stack" style={{ gap: "1.5rem" }}>
        {moduleMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{moduleMessage}</p> : null}

        <AdminPageHeader
          description="Browse and maintain the live module autofill catalog used by league game creation and logging."
          title="Modules"
        />

        <section
          className="list-card stack"
          style={{
            gap: "1.25rem",
            padding: "1.5rem",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: "24px",
            background:
              "radial-gradient(circle at top right, rgba(255, 209, 102, 0.16), transparent 24%), linear-gradient(180deg, rgba(18, 23, 31, 0.96), rgba(10, 14, 20, 0.98))",
            boxShadow: "0 22px 60px rgba(0, 0, 0, 0.34)",
          }}
        >
          <img
            alt="Modules divider"
            className="ggcon-table-divider"
            src="/divider4.png"
            style={{ opacity: 0.78 }}
          />
          <div
            className="section-heading"
            style={{
              alignItems: "end",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "0.9rem",
              marginBottom: "-0.1rem",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.55rem", letterSpacing: "0.02em" }}>
                Live module catalog
              </h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                {modules.length} records. Open any module to edit rewards, tier data, source sheet
                provenance, and the autofill text used elsewhere in the app.
              </p>
            </div>
          </div>

          <div
            className="inline-actions"
            style={{
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.9rem 1rem",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.035)",
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              Sort modules
            </span>
            <Link
              className={`button ${sort === "code" ? "" : "secondary"}`}
              href="/admin/modules?sort=code"
              style={{
                minHeight: "2.45rem",
                borderRadius: "999px",
                paddingInline: "1rem",
                fontSize: "0.92rem",
                border:
                  sort === "code"
                    ? "1px solid rgba(255, 209, 102, 0.55)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                background:
                  sort === "code"
                    ? "linear-gradient(135deg, #ffd166, #fca311)"
                    : "rgba(255, 255, 255, 0.04)",
                color: sort === "code" ? "#1b1408" : undefined,
                fontWeight: sort === "code" ? 700 : undefined,
              }}
            >
              Sort by code
            </Link>
            <Link
              className={`button ${sort === "title" ? "" : "secondary"}`}
              href="/admin/modules?sort=title"
              style={{
                minHeight: "2.45rem",
                borderRadius: "999px",
                paddingInline: "1rem",
                fontSize: "0.92rem",
                border:
                  sort === "title"
                    ? "1px solid rgba(255, 209, 102, 0.55)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                background:
                  sort === "title"
                    ? "linear-gradient(135deg, #ffd166, #fca311)"
                    : "rgba(255, 255, 255, 0.04)",
                color: sort === "title" ? "#1b1408" : undefined,
                fontWeight: sort === "title" ? 700 : undefined,
              }}
            >
              Sort by title
            </Link>
          </div>

          <div
            className="table-wrap"
            style={{
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              background: "rgba(8, 11, 16, 0.76)",
            }}
          >
            <table className="ledger-table">
              <thead>
                <tr>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Code
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Tier
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Duration
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Source
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Updated
                  </th>
                  <th
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {modules.length ? (
                  modules.map((module) => (
                    <tr key={module.id}>
                      <td>{module.adventureCode}</td>
                      <td>
                        <div className="stack" style={{ gap: "0.2rem" }}>
                          <strong>{module.title}</strong>
                          {module.pageNumbers ? (
                            <span className="muted">Pages: {module.pageNumbers}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{formatTier(module.tier)}</td>
                      <td>{module.duration || "Unspecified"}</td>
                      <td>{module.sourceSheet || "Unknown source"}</td>
                      <td>{formatDate(module.updatedAt)}</td>
                      <td>
                        <Link
                          className="button button-secondary button-small"
                          href={`/admin/modules/${module.id}/edit`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="muted"
                      colSpan={7}
                      style={{
                        padding: "2rem 1.25rem",
                        textAlign: "center",
                        fontSize: "0.98rem",
                        color: "rgba(255, 255, 255, 0.68)",
                      }}
                    >
                      No module records have been imported yet.
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
