import Link from "next/link";

import { createAdventureModule } from "@/app/admin/modules/actions";
import { AdminModuleForm } from "@/components/admin-module-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TableActionMenu } from "@/components/table-action-menu";
import { normalizeAdventureLookupValue } from "@/lib/adventure-catalog";
import { requireAdminUser } from "@/lib/admin";
import {
  buildUncommonPlusMagicItems,
  buildUncommonPlusRarityByItem,
} from "@/lib/admin-module-magic-items";
import {
  getCharacterBuildMagicItemOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
} from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODULES_PER_PAGE = 20;

type SortMode = "code" | "title";

function getSortMode(value: string | undefined): SortMode {
  return value === "title" ? "title" : "code";
}

function getPageNumber(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildModulesHref(params: {
  page?: number;
  search?: string;
  sort?: SortMode;
}) {
  const searchParams = new URLSearchParams();

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query ? `/admin/modules?${query}` : "/admin/modules";
}

export default async function AdminModulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    module?: string;
    page?: string;
    search?: string;
    sort?: string;
  }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const sort = getSortMode(params.sort);
  const searchTerm = params.search?.trim() ?? "";
  const normalizedSearchTerm = normalizeAdventureLookupValue(searchTerm);
  const currentPage = getPageNumber(params.page);
  const liveModulesWhere = searchTerm
    ? {
        OR: [
          ...(normalizedSearchTerm
            ? [
                { lookupCode: { contains: normalizedSearchTerm } },
                { lookupTitle: { contains: normalizedSearchTerm } },
              ]
            : []),
          { adventureCode: { contains: searchTerm } },
          { title: { contains: searchTerm } },
          { sourceSheet: { contains: searchTerm } },
        ],
      }
    : undefined;

  const [totalLiveModules, pendingModules, legalMagicItemOptions, legalMinorPropertyOptions] =
    await Promise.all([
      prisma.adventureCatalog.count({
        where: liveModulesWhere,
      }),
      prisma.pendingAdventureModule.findMany({
        orderBy: [{ lastReportedAt: "desc" }, { adventureCode: "asc" }],
        include: {
          lastReportedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
      getLeagueLegalMagicItemOptions(),
      getLeagueLegalMinorPropertyOptions(),
    ]);
  const legalCommonMagicItemOptions = legalMagicItemOptions.Common;
  const legalUncommonPlusMagicItemOptions =
    getCharacterBuildMagicItemOptions(legalMagicItemOptions);
  const uncommonPlusRarityByItem = buildUncommonPlusRarityByItem(legalMagicItemOptions);
  const totalLivePages = Math.max(1, Math.ceil(totalLiveModules / MODULES_PER_PAGE));
  const clampedCurrentPage = Math.min(currentPage, totalLivePages);
  const modules = await prisma.adventureCatalog.findMany({
    where: liveModulesWhere,
    orderBy:
      sort === "title"
        ? [{ title: "asc" }, { adventureCode: "asc" }, { tier: "asc" }]
        : [{ adventureCode: "asc" }, { tier: "asc" }, { title: "asc" }],
    skip: (clampedCurrentPage - 1) * MODULES_PER_PAGE,
    take: MODULES_PER_PAGE,
  });
  const visibleRangeStart = totalLiveModules ? (clampedCurrentPage - 1) * MODULES_PER_PAGE + 1 : 0;
  const visibleRangeEnd = totalLiveModules
    ? Math.min(clampedCurrentPage * MODULES_PER_PAGE, totalLiveModules)
    : 0;

  const moduleMessageMap: Record<string, string> = {
    conflict: "A module with that code, title, and tier already exists.",
    created: "Module created.",
    "image-invalid": "Adventure art must be an image file under 5 MB.",
    invalid: "The requested module record could not be loaded.",
    "pending-invalid": "The pending module could not be loaded.",
    "pending-promoted": "Pending module moved into the live module catalog.",
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

        <section className="list-card stack">
          <img alt="Module create divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="stack" style={{ gap: "0.35rem" }}>
            <h2 style={{ margin: 0 }}>Add module manually</h2>
            <p className="muted" style={{ margin: 0 }}>
              Create a new autofill record here using the same module details and rewards you
              track while creating or logging a game.
            </p>
          </div>

          <form action={createAdventureModule} className="form-stack">
            <AdminModuleForm
              initialValues={{
                adventureCode: "",
                title: "",
                tier: "TIER_1",
                duration: "",
                sourceSheet: "",
                gameSummary: "",
                adventureImagePath: null,
                serviceHours: "0",
                downtimeDaysAwarded: "0",
                gold: "",
                commonMagicItems: [],
                uncommonPlusMagicItems: [],
                consumables: [],
                spellbook: "",
                boons: [],
                blessings: [],
                charms: [],
                additionalMagicRewardNotes: "",
                additionalConsumableNotes: "",
                storyAwards: "",
                sourceNotes: "",
              }}
              legalCommonMagicItemOptions={legalCommonMagicItemOptions}
              legalMinorPropertyOptions={legalMinorPropertyOptions}
              legalUncommonPlusMagicItemOptions={legalUncommonPlusMagicItemOptions}
              submitLabel="Create module"
              uncommonPlusRarityByItem={uncommonPlusRarityByItem}
            />
          </form>
        </section>

        <section className="list-card stack">
          <img alt="Pending modules divider" className="ggcon-table-divider" src="/divider4.png" />
          <div className="stack" style={{ gap: "0.35rem" }}>
            <h2 style={{ margin: 0 }}>Pending modules</h2>
            <p className="muted" style={{ margin: 0 }}>
              Player-entered adventures that did not match the live module database appear here
              for admin review before they are promoted into the autofill catalog.
            </p>
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
                  <th>Code</th>
                  <th>Title</th>
                  <th>Tier</th>
                  <th>Last reported</th>
                  <th>Reports</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingModules.length ? (
                  pendingModules.map((pendingModule) => (
                    <tr key={pendingModule.id}>
                      <td>{pendingModule.adventureCode}</td>
                      <td>
                        <div className="stack" style={{ gap: "0.2rem" }}>
                          <strong>{pendingModule.title}</strong>
                          <span className="muted">
                            {pendingModule.reportedDmName || "Unknown DM"}
                            {pendingModule.lastReportedBy?.name
                              ? ` | reported by ${pendingModule.lastReportedBy.name}`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td>{formatTier(pendingModule.tier)}</td>
                      <td>{formatDate(pendingModule.lastReportedAt)}</td>
                      <td>{pendingModule.reportCount}</td>
                      <td>
                        <TableActionMenu>
                          <Link
                            className="button button-secondary button-small"
                            href={`/admin/modules/pending/${pendingModule.id}`}
                          >
                            Review
                          </Link>
                        </TableActionMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={6} style={{ padding: "1.5rem", textAlign: "center" }}>
                      No pending modules right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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
                {totalLiveModules} record{totalLiveModules === 1 ? "" : "s"}
                {searchTerm ? ` matching "${searchTerm}"` : ""}. Showing {visibleRangeStart || 0}
                {visibleRangeEnd ? `-${visibleRangeEnd}` : ""}. Open any module to edit rewards,
                source data, and the autofill text used elsewhere in the app.
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
            <form action="/admin/modules" method="get" style={{ display: "flex", gap: "0.75rem", flex: "1 1 20rem" }}>
              <input name="sort" type="hidden" value={sort} />
              <input
                defaultValue={searchTerm}
                name="search"
                placeholder="Search code, title, or source"
                style={{ flex: 1 }}
                type="text"
              />
              <button className="button secondary" type="submit">
                Search
              </button>
            </form>
            <Link
              className={`button ${sort === "code" ? "" : "secondary"}`}
              href={buildModulesHref({ search: searchTerm, sort: "code" })}
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
              href={buildModulesHref({ search: searchTerm, sort: "title" })}
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
            {searchTerm ? (
              <Link className="button secondary" href={buildModulesHref({ sort })}>
                Clear search
              </Link>
            ) : null}
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
                    Source (DM&apos;s Guild link)
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
                          {buildUncommonPlusMagicItems(module).length ? (
                            <span className="muted">
                              {buildUncommonPlusMagicItems(module).length} uncommon+ reward
                              {buildUncommonPlusMagicItems(module).length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>{formatTier(module.tier)}</td>
                      <td>{module.duration || "Unspecified"}</td>
                      <td>{module.sourceSheet || "Unknown source"}</td>
                      <td>{formatDate(module.updatedAt)}</td>
                      <td>
                        <TableActionMenu>
                          <Link
                            className="button button-secondary button-small"
                            href={`/admin/modules/${module.id}/edit`}
                          >
                            Edit
                          </Link>
                        </TableActionMenu>
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

          <div
            className="inline-actions"
            style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}
          >
            <p className="muted" style={{ margin: 0 }}>
              Page {clampedCurrentPage} of {totalLivePages}
            </p>
            <div className="inline-actions" style={{ gap: "0.75rem" }}>
              <Link
                className={`button secondary ${clampedCurrentPage <= 1 ? "disabled" : ""}`}
                href={buildModulesHref({
                  page: Math.max(1, clampedCurrentPage - 1),
                  search: searchTerm,
                  sort,
                })}
                aria-disabled={clampedCurrentPage <= 1}
                style={clampedCurrentPage <= 1 ? { pointerEvents: "none", opacity: 0.45 } : undefined}
              >
                Previous 20
              </Link>
              <Link
                className={`button secondary ${clampedCurrentPage >= totalLivePages ? "disabled" : ""}`}
                href={buildModulesHref({
                  page: Math.min(totalLivePages, clampedCurrentPage + 1),
                  search: searchTerm,
                  sort,
                })}
                aria-disabled={clampedCurrentPage >= totalLivePages}
                style={
                  clampedCurrentPage >= totalLivePages
                    ? { pointerEvents: "none", opacity: 0.45 }
                    : undefined
                }
              >
                Next 20
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
