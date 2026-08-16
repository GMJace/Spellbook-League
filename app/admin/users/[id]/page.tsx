import Link from "next/link";
import { notFound } from "next/navigation";

import { updateUserStoreCredit } from "@/app/admin/users/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ProfileAvatar } from "@/components/profile-avatar";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    credit?: string;
  }>;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminUserProfilePage({ params, searchParams }: PageProps) {
  await requireAdminUser();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      roles: {
        orderBy: {
          role: "asc",
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const creditMessageMap: Record<string, string> = {
    held: "That credit change would drop the balance below the user's held checkout credit.",
    invalid: "The requested account credit change could not be completed.",
    updated: "Account credit updated.",
  };
  const creditMessage = resolvedSearchParams.credit
    ? creditMessageMap[resolvedSearchParams.credit]
    : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {creditMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{creditMessage}</p> : null}

        <AdminPageHeader
          description="Review account details, live roles, and store credit for this user."
          title={user.name}
        />

        <section className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Account snapshot</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Joined {formatDateTime(user.createdAt)}
              </p>
            </div>
            <Link className="button secondary" href="/admin/users">
              Back to directory
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ProfileAvatar
              name={user.name}
              size={96}
              src={user.profileImagePath}
            />
            <div className="stack" style={{ gap: "0.45rem" }}>
              <div>
                <strong>{user.name}</strong>
              </div>
              <div>{user.email}</div>
              <div className="muted">
                Discord: {user.discordHandle?.trim() || "Not provided"}
              </div>
              <div className="muted">
                Roles:{" "}
                {user.roles.length ? user.roles.map((role) => role.role).join(", ") : "None"}
              </div>
            </div>
          </div>
        </section>

        <section className="list-card stack">
          <img
            alt="Store credit divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Account credit</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Credit is applied before PayPal during checkout. Held credit is reserved for open
                checkouts that have not completed yet.
              </p>
            </div>
          </div>

          <div className="ggcon-summary-metrics">
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Current balance</span>
              <strong>${user.storeCreditUsd.toFixed(2)}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Held for open checkout</span>
              <strong>${user.storeCreditHeldUsd.toFixed(2)}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Available now</span>
              <strong>${Math.max(user.storeCreditUsd - user.storeCreditHeldUsd, 0).toFixed(2)}</strong>
            </div>
          </div>

          <form action={updateUserStoreCredit} className="form-stack">
            <input name="targetUserId" type="hidden" value={user.id} />
            <input name="returnTo" type="hidden" value={`/admin/users/${user.id}`} />

            <div className="form-grid">
              <label>
                Adjust by USD
                <input
                  defaultValue="0"
                  inputMode="decimal"
                  name="amountUsd"
                  step="0.01"
                  type="number"
                />
              </label>
              <label>
                Update mode
                <select defaultValue="ADJUST" name="mode">
                  <option value="ADJUST">Add / subtract this amount</option>
                  <option value="SET">Set total balance to this amount</option>
                </select>
              </label>
            </div>

            <p className="muted" style={{ margin: 0 }}>
              Use a negative number to subtract credit. Setting the total balance cannot reduce the
              account below any held checkout credit.
            </p>

            <div>
              <button className="button-secondary" type="submit">
                Save account credit
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
