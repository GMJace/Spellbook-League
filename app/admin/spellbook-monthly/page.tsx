import Link from "next/link";

import {
  deleteSpellbookMonthlySubscriber,
  updateGrimoireGuildMembershipSettings,
} from "@/app/admin/spellbook-monthly/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { TableActionMenu } from "@/components/table-action-menu";
import { requireAdminUser } from "@/lib/admin";
import {
  getAdminPatronMembershipRows,
  getGrimoireGuildMembershipSettings,
} from "@/lib/grimoire-guild-membership";
import { getSpellbookMonthlySubscribers } from "@/lib/spellbook-monthly";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminSpellbookMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ membership?: string; subscriber?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

  const [subscribers, membershipSettings, patronMemberships] = await Promise.all([
    getSpellbookMonthlySubscribers(),
    getGrimoireGuildMembershipSettings(),
    getAdminPatronMembershipRows(),
  ]);
  const newestSubscriber = subscribers[0] ?? null;
  const subscriberMessageMap: Record<string, string> = {
    deleted: "Subscriber deleted.",
    invalid: "The requested subscriber could not be deleted.",
  };
  const membershipMessageMap: Record<string, string> = {
    invalid: "The Grimoire Guild membership settings could not be saved.",
    updated: "Grimoire Guild membership settings updated.",
  };
  const subscriberMessage = params.subscriber
    ? subscriberMessageMap[params.subscriber]
    : "";
  const membershipMessage = params.membership
    ? membershipMessageMap[params.membership]
    : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {subscriberMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{subscriberMessage}</p>
        ) : null}
        {membershipMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{membershipMessage}</p>
        ) : null}

        <AdminPageHeader
          description="Review newsletter signups captured from the homepage form, and manage Grimoire Guild membership storefront settings."
          title="SPELLBOOK Monthly subscribers"
        />

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Overview</h2>
            </div>
          </div>

          <div className="ggcon-summary-metrics">
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Subscribers</span>
              <strong>{subscribers.length}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Newest signup</span>
              <strong>
                {newestSubscriber ? formatDateTime(newestSubscriber.createdAt) : "No signups yet"}
              </strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Active Patron members</span>
              <strong>{patronMemberships.length}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Membership product</span>
              <strong>{membershipSettings.productName}</strong>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Grimoire Guild membership</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                This store item appears in the League cart and grants time-based Patron access.
              </p>
            </div>
          </div>

          <form action={updateGrimoireGuildMembershipSettings} className="stack">
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label className="stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Product name</span>
                <input
                  defaultValue={membershipSettings.productName}
                  name="productName"
                  type="text"
                />
              </label>
              <label className="stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Price (USD)</span>
                <input
                  defaultValue={membershipSettings.priceUsd}
                  min="0.01"
                  name="priceUsd"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Duration (days)</span>
                <input
                  defaultValue={membershipSettings.durationDays}
                  min="1"
                  name="durationDays"
                  step="1"
                  type="number"
                />
              </label>
            </div>

            <label className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Description</span>
              <textarea
                defaultValue={membershipSettings.description}
                name="description"
                rows={3}
              />
            </label>

            <label className="ggcon-inline-checkbox">
              <input
                defaultChecked={membershipSettings.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>Show this membership in the League cart</span>
            </label>

            <div>
              <button className="button" type="submit">
                Save membership settings
              </button>
            </div>
          </form>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Active Patron memberships</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Members listed here have current or queued Grimoire Guild access that feeds the Patron character limit.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Product</th>
                  <th>Access started</th>
                  <th>Access ends</th>
                  <th>PayPal order</th>
                </tr>
              </thead>
              <tbody>
                {patronMemberships.length ? (
                  patronMemberships.map((membership) => (
                    <tr key={membership.userId}>
                      <td>{membership.displayName}</td>
                      <td>{membership.email}</td>
                      <td>{membership.productName}</td>
                      <td>{formatDateTime(membership.startedAt)}</td>
                      <td>{formatDateTime(membership.accessEndsAt)}</td>
                      <td>{membership.checkoutOrderId ?? "Manual / legacy"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={6}>
                      No active Grimoire Guild memberships are currently tracked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Subscriber list</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Duplicate email addresses are deduped automatically. Repeated signup attempts
                update the most recent signup timestamp.
              </p>
            </div>

            <a className="button secondary" href="/admin/spellbook-monthly/export">
              Export CSV
            </a>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>First subscribed</th>
                  <th>Last signup attempt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length ? (
                  subscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>{subscriber.email}</td>
                      <td>{formatDateTime(subscriber.createdAt)}</td>
                      <td>{formatDateTime(subscriber.lastSubscribedAt)}</td>
                      <td>
                        <TableActionMenu>
                          <form action={deleteSpellbookMonthlySubscriber}>
                            <input name="subscriberId" type="hidden" value={subscriber.id} />
                            <ConfirmSubmitButton
                              className="button-danger button-small"
                              message={`Delete ${subscriber.email} from SPELLBOOK Monthly subscribers?`}
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
                    <td className="muted" colSpan={4}>
                      No SPELLBOOK Monthly subscribers have been captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
