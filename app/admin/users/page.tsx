import Link from "next/link";

import { AdminUserRemovalCard } from "@/components/admin-user-removal-card";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { TableActionMenu } from "@/components/table-action-menu";
import {
  addProDmToRoster,
  addEventAdminRole,
  addLeagueAdminRole,
  addPatronRole,
  createAdminNotification,
  deleteProDmReview,
  removeDmFromRoster,
  removeEventAdminRole,
  removeLeagueAdminRole,
  removePatronRole,
  removeProDmFromRoster,
  updateUserStoreCredit,
  updateProDmRating,
} from "@/app/admin/users/actions";
import { requireAdminUser } from "@/lib/admin";
import { getProDmRatingSummaryMap, getProDmReviews } from "@/lib/pro-dm-reviews";
import { getProDmRosterEntries } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";
import { formatStarRating } from "@/lib/utils";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDate(date);
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    proDm?: string;
    review?: string;
    notification?: string;
    dmRoster?: string;
    eventAdmin?: string;
    leagueAdmin?: string;
    patron?: string;
    credit?: string;
  }>;
}) {
  const adminUser = await requireAdminUser();
  const params = await searchParams;
  const proDmRosterEntries = await getProDmRosterEntries();
  const proDmReviews = await getProDmReviews();
  const proDmRosterMap = new Map(
    proDmRosterEntries.map((entry) => [entry.userId, entry])
  );
  const ratingSummaryMap = getProDmRatingSummaryMap(proDmRosterEntries, proDmReviews);

  const users = await prisma.user.findMany({
    include: {
      roles: {
        orderBy: {
          role: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  type AdminUserRow = (typeof users)[number];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentProDmReviews = proDmReviews
    .filter((review) => {
      const createdAt = new Date(review.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo;
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

  const removableUsers = users
    .filter((user: AdminUserRow) => user.id !== adminUser.id)
    .map((user: AdminUserRow) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

  const dmUsers = users.filter((user: AdminUserRow) =>
    user.roles.some((role: AdminUserRow["roles"][number]) => role.role === "DM")
  );
  const proDmUsers = dmUsers.filter((user: AdminUserRow) =>
    proDmRosterMap.get(user.id)?.isListed
  );

  const proDmMessageMap: Record<string, string> = {
    added: "Professional DM roster updated.",
    updated: "Professional DM rating updated.",
    removed: "DM removed from the professional roster.",
    invalid: "The requested Professional DM roster change could not be completed.",
  };

  const proDmMessage = params.proDm ? proDmMessageMap[params.proDm] : "";
  const reviewMessageMap: Record<string, string> = {
    deleted: "DM rating deleted.",
    invalid: "The requested DM rating could not be removed.",
  };
  const reviewMessage = params.review ? reviewMessageMap[params.review] : "";
  const notificationMessageMap: Record<string, string> = {
    sent: "Notification sent.",
    invalid: "The requested notification could not be created.",
  };
  const notificationMessage = params.notification
    ? notificationMessageMap[params.notification]
    : "";
  const dmRosterMessageMap: Record<string, string> = {
    removed: "DM removed from the regular roster.",
    invalid: "The requested regular DM roster change could not be completed.",
  };
  const dmRosterMessage = params.dmRoster
    ? dmRosterMessageMap[params.dmRoster]
    : "";
  const eventAdminMessageMap: Record<string, string> = {
    added: "Event Admin role granted.",
    removed: "Event Admin role removed.",
    invalid: "The requested Event Admin change could not be completed.",
  };
  const eventAdminMessage = params.eventAdmin
    ? eventAdminMessageMap[params.eventAdmin]
    : "";
  const leagueAdminMessageMap: Record<string, string> = {
    added: "League Admin role granted.",
    removed: "League Admin role removed.",
    invalid: "The requested League Admin change could not be completed.",
  };
  const leagueAdminMessage = params.leagueAdmin
    ? leagueAdminMessageMap[params.leagueAdmin]
    : "";
  const patronMessageMap: Record<string, string> = {
    added: "Patron role granted.",
    removed: "Patron role removed.",
    invalid: "The requested Patron change could not be completed.",
  };
  const patronMessage = params.patron ? patronMessageMap[params.patron] : "";
  const creditMessageMap: Record<string, string> = {
    held: "That credit change would drop the balance below the user's held checkout credit.",
    invalid: "The requested account credit change could not be completed.",
    updated: "Account credit updated.",
  };
  const creditMessage = params.credit ? creditMessageMap[params.credit] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {proDmMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{proDmMessage}</p>
        ) : null}
        {reviewMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{reviewMessage}</p>
        ) : null}
        {notificationMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{notificationMessage}</p>
        ) : null}
        {dmRosterMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{dmRosterMessage}</p>
        ) : null}
        {eventAdminMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{eventAdminMessage}</p>
        ) : null}
        {leagueAdminMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{leagueAdminMessage}</p>
        ) : null}
        {patronMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{patronMessage}</p>
        ) : null}
        {creditMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{creditMessage}</p>
        ) : null}

        <AdminPageHeader
          description="Manage notifications, league legal choices, professional DM roster, ratings, and user records from one place."
          title="Directory"
        />

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Send notification</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Create an admin notification for one user or everyone in the system.
              </p>
            </div>
          </div>

          <form action={createAdminNotification} className="form-stack">
            <label>
              Recipient
              <select name="targetUserId" defaultValue="ALL_USERS">
                <option value="ALL_USERS">All users</option>
                {users.map((user: AdminUserRow) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input name="title" type="text" maxLength={120} required />
            </label>
            <label>
              Message
              <textarea name="body" rows={5} maxLength={1200} required />
            </label>
            <button className="button-secondary" type="submit">
              Send notification
            </button>
          </form>
        </div>

        <div className="list-card stack">
          <img
            alt="Professional DM roster divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Professional DM roster</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Promote DMs into the public Hire a DM roster, tune their five-star rating,
                and jump directly to their public profile page.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Discord Handle</th>
                  <th>Rating</th>
                  <th>Public Page</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proDmUsers.length ? (
                  proDmUsers.map((user: AdminUserRow) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.discordHandle || "Not provided"}</td>
                      <td>
                        {formatStarRating(
                          ratingSummaryMap.get(user.id)?.rating ??
                            proDmRosterMap.get(user.id)?.rating ??
                            5
                        )}
                      </td>
                      <td>
                        <Link
                          className="button button-secondary button-small"
                          href={`/hire-a-dm/${user.id}`}
                        >
                          View profile
                        </Link>
                      </td>
                      <td>
                        <TableActionMenu panelStyle={{ minWidth: "15rem" }}>
                          <form action={updateProDmRating} style={{ display: "flex", gap: "0.5rem" }}>
                            <input name="targetUserId" type="hidden" value={user.id} />
                            <select
                              name="rating"
                              defaultValue={String(proDmRosterMap.get(user.id)?.rating ?? 5)}
                            >
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <option key={rating} value={rating}>
                                  {rating} star{rating === 1 ? "" : "s"}
                                </option>
                              ))}
                            </select>
                            <button className="button-secondary button-small" type="submit">
                              Save
                            </button>
                          </form>

                          <form action={removeProDmFromRoster}>
                            <input name="targetUserId" type="hidden" value={user.id} />
                            <ConfirmSubmitButton
                              className="button-secondary button-small"
                              message={`Remove ${user.name} from the professional DM roster?`}
                            >
                              Remove
                            </ConfirmSubmitButton>
                          </form>
                        </TableActionMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={6}>
                      No professional DMs are listed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Recent DM ratings divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Recent DM ratings</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Ratings submitted during the last 7 days. Delete entries here if one
                was submitted in error.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Dungeon Master</th>
                  <th>Game</th>
                  <th>Played</th>
                  <th>Submitted</th>
                  <th>Rating</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentProDmReviews.length ? (
                  recentProDmReviews.map((review) => (
                    <tr key={review.id}>
                      <td>{userMap.get(review.userId)?.name ?? "Unknown DM"}</td>
                      <td>{review.game}</td>
                      <td>{formatDateLabel(review.date)}</td>
                      <td>{formatDateTimeLabel(review.createdAt)}</td>
                      <td>{formatStarRating(review.rating)}</td>
                      <td style={{ minWidth: "18rem", whiteSpace: "pre-wrap" }}>
                        {review.notes || "No notes provided"}
                      </td>
                      <td>
                        <TableActionMenu>
                          <form action={deleteProDmReview}>
                            <input name="reviewId" type="hidden" value={review.id} />
                            <ConfirmSubmitButton
                              className="button-danger button-small"
                              message={`Delete the DM rating for ${
                                userMap.get(review.userId)?.name ?? "this DM"
                              }? This cannot be undone.`}
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        </TableActionMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={7}>
                      No DM ratings have been submitted in the last 7 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Regular DM roster divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Regular DM roster</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Add any DM from the main roster into the Professional <RainbowSpellbook />{" "}
                DMs lineup.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Discord Handle</th>
                  <th>Joined</th>
                  <th>Pro roster</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dmUsers.length ? (
                  dmUsers.map((user: AdminUserRow) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.discordHandle || "Not provided"}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        {proDmRosterMap.get(user.id)?.isListed ? (
                          <span className="muted">Already on pro roster</span>
                        ) : (
                          <form action={addProDmToRoster} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input name="targetUserId" type="hidden" value={user.id} />
                            <select name="rating" defaultValue="5">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <option key={rating} value={rating}>
                                  {rating} star{rating === 1 ? "" : "s"}
                                </option>
                              ))}
                            </select>
                            <button className="button-secondary button-small" type="submit">
                              Add to pro roster
                            </button>
                          </form>
                        )}
                      </td>
                      <td>
                        <form action={removeDmFromRoster}>
                          <input name="targetUserId" type="hidden" value={user.id} />
                          <ConfirmSubmitButton
                            className="button-danger button-small"
                            message={`Remove ${user.name} from the regular DM roster? This will also remove any public Hire a DM listing.`}
                          >
                            Remove DM
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={6}>
                      No DMs are registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="User directory divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>User directory</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Complete account list with contact details and league roles.
              </p>
            </div>
            <Link className="button secondary" href="/">
              Back
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Discord Handle</th>
                  <th>Store credit</th>
                  <th>Event Admin</th>
                  <th>League Admin</th>
                  <th>Patron</th>
                  <th>Pro DM</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: AdminUserRow) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.discordHandle || "Not provided"}</td>
                    <td>${user.storeCreditUsd.toFixed(2)}</td>
                    <td>
                      {user.roles.some((role: AdminUserRow["roles"][number]) => role.role === "EVENT_ADMIN")
                        ? "Yes"
                        : "No"}
                    </td>
                    <td>
                      {user.roles.some((role: AdminUserRow["roles"][number]) => role.role === "LEAGUE_ADMIN")
                        ? "Yes"
                        : "No"}
                    </td>
                    <td>
                      {user.roles.some((role: AdminUserRow["roles"][number]) => role.role === "PATRON")
                        ? "Yes"
                        : "No"}
                    </td>
                    <td>{proDmRosterMap.get(user.id)?.isListed ? "Yes" : "No"}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      {user.id === adminUser.id ? (
                        <TableActionMenu>
                          <Link
                            className="button button-secondary button-small"
                            href={`/admin/users/${user.id}`}
                          >
                            View profile
                          </Link>
                          <span className="muted">Current account</span>
                        </TableActionMenu>
                      ) : (
                        <TableActionMenu panelStyle={{ minWidth: "18rem" }}>
                          <Link
                            className="button button-secondary button-small"
                            href={`/admin/users/${user.id}`}
                          >
                            View profile
                          </Link>
                          <form action={updateUserStoreCredit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input name="targetUserId" type="hidden" value={user.id} />
                            <input name="mode" type="hidden" value="ADJUST" />
                            <input name="returnTo" type="hidden" value="/admin/users" />
                            <input
                              defaultValue="0"
                              inputMode="decimal"
                              name="amountUsd"
                              step="0.01"
                              style={{ maxWidth: "7rem" }}
                              type="number"
                            />
                            <button className="button-secondary button-small" type="submit">
                              Adjust credit
                            </button>
                          </form>
                          {user.roles.some(
                            (role: AdminUserRow["roles"][number]) => role.role === "EVENT_ADMIN"
                          ) ? (
                            <form action={removeEventAdminRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-danger button-small"
                                message={`Remove Event Admin access from ${user.name}?`}
                              >
                                Remove Event Admin
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form action={addEventAdminRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-secondary button-small"
                                message={`Grant Event Admin access to ${user.name}? This will allow access to Grimoire moderation.`}
                              >
                                Make Event Admin
                              </ConfirmSubmitButton>
                            </form>
                          )}
                          {user.roles.some(
                            (role: AdminUserRow["roles"][number]) => role.role === "LEAGUE_ADMIN"
                          ) ? (
                            <form action={removeLeagueAdminRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-danger button-small"
                                message={`Remove League Admin access from ${user.name}? This will remove access to the League legal choices page.`}
                              >
                                Remove League Admin
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form action={addLeagueAdminRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-secondary button-small"
                                message={`Grant League Admin access to ${user.name}? This only allows access to the League legal choices page.`}
                              >
                                Make League Admin
                              </ConfirmSubmitButton>
                            </form>
                          )}
                          {user.roles.some(
                            (role: AdminUserRow["roles"][number]) => role.role === "PATRON"
                          ) ? (
                            <form action={removePatronRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-danger button-small"
                                message={`Remove Patron access from ${user.name}? This will return the account to the standard 3-character limit.`}
                              >
                                Remove Patron
                              </ConfirmSubmitButton>
                            </form>
                          ) : (
                            <form action={addPatronRole}>
                              <input name="targetUserId" type="hidden" value={user.id} />
                              <ConfirmSubmitButton
                                className="button-secondary button-small"
                                message={`Grant Patron access to ${user.name}? This will raise the account character limit to 100.`}
                              >
                                Make Patron
                              </ConfirmSubmitButton>
                            </form>
                          )}
                        </TableActionMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AdminUserRemovalCard users={removableUsers} />
      </section>
    </main>
  );
}
