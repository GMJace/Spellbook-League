import Link from "next/link";

import {
  createAchievement,
  deleteAchievement,
  updateAchievement,
} from "@/app/admin/achievements/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { HashAnchorScroll } from "@/components/hash-anchor-scroll";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    achievement?: string;
    selected?: string;
  }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

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

  const achievementMessageMap: Record<string, string> = {
    conflict: "That achievement slug is already in use. Pick a different slug.",
    created: "Achievement created.",
    deleted: "Achievement deleted.",
    imageInvalid: "Upload a PNG, JPG, WEBP, or GIF badge image up to 5 MB.",
    invalid: "The achievement change could not be completed.",
    updated: "Achievement updated.",
  };
  const achievementMessage = params.achievement
    ? achievementMessageMap[params.achievement]
    : "";
  const existingCategories = Array.from(
    new Set(
      achievements
        .map((achievement) => achievement.category.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const selectedAchievement =
    achievements.find((achievement) => achievement.id === params.selected) ??
    achievements[0] ??
    null;

  return (
    <main className="page-shell">
      <HashAnchorScroll anchorId="existing-achievements" />
      <section className="stack">
        {achievementMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{achievementMessage}</p>
        ) : null}

        <AdminPageHeader
          description="Manage the live achievement catalog, including names, categories, descriptions, badge paths, and slugs used by the award flow."
          extraActions={
            <>
              <Link className="button secondary" href="/admin/achievements/export">
                Export CSV
              </Link>
              <Link className="button secondary" href="/dm/achievements">
                DM achievements
              </Link>
            </>
          }
          title="Achievements"
        />

        <section className="list-card stack">
          <img
            alt="Achievement admin divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Create achievement</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                The slug is generated automatically from the achievement name.
              </p>
            </div>
          </div>

          <form
            action={createAchievement}
            className="form-stack"
          >
            <div className="form-grid">
              <label>
                Name
                <input maxLength={120} name="name" required type="text" />
              </label>
              <label>
                Category
                <input maxLength={120} name="category" required type="text" />
              </label>
              <label>
                Badge image
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  name="badgeImage"
                  type="file"
                />
              </label>
            </div>

            <label>
              Description
              <textarea maxLength={1200} name="description" required rows={4} />
            </label>

            <button className="button-secondary" type="submit">
              Create achievement
            </button>
          </form>
        </section>

        <section className="list-card stack">
          <img
            alt="Achievement catalog divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading" id="existing-achievements">
            <div>
              <h2 style={{ margin: 0 }}>Existing achievements</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Editing an achievement updates the DM award screens and player
                records immediately. Deleting one also removes its existing award
                history.
              </p>
            </div>
          </div>

          {achievements.length ? (
            <div className="stack">
              <form
                action="/admin/achievements#existing-achievements"
                className="form-stack"
                method="get"
              >
                {params.achievement ? (
                  <input name="achievement" type="hidden" value={params.achievement} />
                ) : null}
                <label>
                  Select achievement to edit
                  <select
                    defaultValue={selectedAchievement?.id ?? ""}
                    name="selected"
                  >
                    {achievements.map((achievement) => (
                      <option key={achievement.id} value={achievement.id}>
                        {achievement.category} | {achievement.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button-secondary" type="submit">
                  Load achievement
                </button>
              </form>

              {selectedAchievement ? (
                <article className="panel stack">
                  <div
                    className="inline-actions"
                    style={{ justifyContent: "space-between", alignItems: "flex-start" }}
                  >
                    <div className="inline-actions" style={{ alignItems: "flex-start" }}>
                      {selectedAchievement.badgeImagePath ? (
                        <img
                          alt={`${selectedAchievement.name} badge`}
                          src={selectedAchievement.badgeImagePath}
                          style={{
                            width: "56px",
                            height: "56px",
                            objectFit: "cover",
                            borderRadius: "14px",
                            border: "1px solid rgba(255, 255, 255, 0.18)",
                          }}
                        />
                      ) : (
                        <div
                          className="pill"
                          style={{
                            minWidth: "56px",
                            minHeight: "56px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          No badge
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0 }}>{selectedAchievement.name}</h3>
                        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                          {selectedAchievement.category}
                        </p>
                        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                          {selectedAchievement._count.awards} award
                          {selectedAchievement._count.awards === 1 ? "" : "s"} | Created{" "}
                          {formatDate(selectedAchievement.createdAt)}
                        </p>
                      </div>
                    </div>

                    <form action={deleteAchievement}>
                      <input
                        name="achievementId"
                        type="hidden"
                        value={selectedAchievement.id}
                      />
                      <ConfirmSubmitButton
                        className="button-danger button-small"
                        message={`Delete "${selectedAchievement.name}"? This will also remove ${selectedAchievement._count.awards} awarded record${selectedAchievement._count.awards === 1 ? "" : "s"}.`}
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  <form
                    action={updateAchievement}
                    className="form-stack"
                  >
                    <input
                      name="achievementId"
                      type="hidden"
                      value={selectedAchievement.id}
                    />
                    <input
                      name="selectedAchievementId"
                      type="hidden"
                      value={selectedAchievement.id}
                    />

                    <div className="form-grid">
                      <label>
                        Name
                        <input
                          defaultValue={selectedAchievement.name}
                          maxLength={120}
                          name="name"
                          required
                          type="text"
                        />
                      </label>
                      <label>
                        Category
                        <select
                          defaultValue={selectedAchievement.category}
                          name="category"
                          required
                        >
                          {existingCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Replace badge image
                        <input
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          name="badgeImage"
                          type="file"
                        />
                      </label>
                    </div>

                    <label>
                      Description
                      <textarea
                        defaultValue={selectedAchievement.description}
                        maxLength={1200}
                        name="description"
                        required
                        rows={4}
                      />
                    </label>

                    <div className="inline-actions" style={{ justifyContent: "space-between" }}>
                      <span className="muted">
                        Updated {formatDate(selectedAchievement.updatedAt)}
                      </span>
                      <button className="button-secondary" type="submit">
                        Save achievement
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}
            </div>
          ) : (
            <div className="empty">
              No achievements are configured yet. Use the form above to add the
              first one.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
