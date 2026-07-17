import Link from "next/link";

import { deleteSpellbookMonthlySubscriber } from "@/app/admin/spellbook-monthly/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireAdminUser } from "@/lib/admin";
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
  searchParams: Promise<{ subscriber?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

  const subscribers = await getSpellbookMonthlySubscribers();
  const newestSubscriber = subscribers[0] ?? null;
  const subscriberMessageMap: Record<string, string> = {
    deleted: "Subscriber deleted.",
    invalid: "The requested subscriber could not be deleted.",
  };
  const subscriberMessage = params.subscriber
    ? subscriberMessageMap[params.subscriber]
    : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {subscriberMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{subscriberMessage}</p>
        ) : null}

        <AdminPageHeader
          description="Review newsletter signups captured from the homepage form and the public subscription API."
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
                        <form action={deleteSpellbookMonthlySubscriber}>
                          <input name="subscriberId" type="hidden" value={subscriber.id} />
                          <ConfirmSubmitButton
                            className="button-danger button-small"
                            message={`Delete ${subscriber.email} from SPELLBOOK Monthly subscribers?`}
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
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
