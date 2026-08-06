import Link from "next/link";

import {
  createTicketPayout,
  createTicketRefund,
  saveDmPaymentProfile,
  saveTicketSalesSettings,
  updateTicketPayout,
} from "@/app/admin/ticket-sales/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { isAdminEmail } from "@/lib/admin-access";
import { requireTicketSalesAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  buildDmPayoutCandidates,
  buildGrimoireTicketSaleRows,
  buildKnownDmCandidates,
  buildLeagueTicketSaleRows,
  buildMembershipSaleRows,
  calculateTaxAmount,
  createDmPaymentLookupKey,
  DmPaymentProfileRecord,
  sumAmounts,
  TICKET_PAYOUT_STATUSES,
  TICKET_SALE_SOURCE_TYPES,
} from "@/lib/ticket-sales";
import { formatDateTime, formatUsd } from "@/lib/utils";

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function formatPaymentMethodSummary(profile: {
  contactEmail: null | string;
  isActive: boolean;
  paymentDetails: null | string;
  paymentMethodLabel: null | string;
  paymentMethodType: null | string;
}) {
  if (!profile.paymentMethodType) {
    return "Missing payment method";
  }

  const parts = [
    profile.paymentMethodType.replace(/_/g, " "),
    profile.paymentMethodLabel,
    profile.paymentDetails,
    profile.contactEmail,
  ].filter(Boolean);

  return `${profile.isActive ? "" : "Inactive · "}${parts.join(" · ")}`;
}

function buildPayoutCandidateKey({
  checkoutType,
  dmName,
  dmUserId,
  saleSourceId,
  saleSourceType,
}: {
  checkoutType: string;
  dmName: string;
  dmUserId: null | string;
  saleSourceId: null | string;
  saleSourceType: string;
}) {
  return [
    checkoutType,
    saleSourceType,
    saleSourceId ?? "",
    createDmPaymentLookupKey({ dmName, dmUserId }),
  ].join(":");
}

function getTicketSalesPrisma() {
  return prisma as typeof prisma & {
    dmPaymentProfile?: {
      findMany?: (...args: any[]) => Promise<DmPaymentProfileRecord[]>;
    };
    ticketPayout?: {
      findMany?: (...args: any[]) => Promise<any[]>;
    };
    ticketRefund?: {
      findMany?: (...args: any[]) => Promise<any[]>;
    };
    ticketSalesSettings?: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
  };
}

async function safeFindMany<T>(
  delegate: undefined | { findMany?: (args: any) => Promise<T[]> },
  args: any,
  fallback: T[] = [],
) {
  if (!delegate?.findMany) {
    return fallback;
  }

  try {
    return await delegate.findMany(args);
  } catch {
    return fallback;
  }
}

async function safeFindUnique<T>(
  delegate: undefined | { findUnique?: (args: any) => Promise<T | null> },
  args: any,
  fallback: T | null = null,
) {
  if (!delegate?.findUnique) {
    return fallback;
  }

  try {
    return await delegate.findUnique(args);
  } catch {
    return fallback;
  }
}

export default async function AdminTicketSalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment?: string;
    payout?: string;
    refund?: string;
    settings?: string;
  }>;
}) {
  const currentUser = await requireTicketSalesAdminUser();
  const params = await searchParams;
  const navigationRole =
    !isAdminEmail(currentUser.email) && currentUser.roles.includes("EVENT_ADMIN")
      ? "EVENT_ADMIN"
      : "ADMIN";
  const prismaTicketSales = getTicketSalesPrisma();
  const ticketSalesFeatureReady = Boolean(
    prismaTicketSales.dmPaymentProfile &&
      prismaTicketSales.ticketRefund &&
      prismaTicketSales.ticketSalesSettings &&
      prismaTicketSales.ticketPayout,
  );

  const [
    completedOrders,
    games,
    grimoireEvents,
    grimoireGames,
    paymentProfiles,
    refunds,
    settings,
    payouts,
  ] = await Promise.all([
    prisma.checkoutOrder.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        amountUsd: true,
        capturedAt: true,
        checkoutType: true,
        createdAt: true,
        id: true,
        itemDataJson: true,
        payerEmail: true,
        paypalOrderId: true,
        status: true,
        summaryText: true,
      },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.game.findMany({
      select: {
        datePlayed: true,
        dm: {
          select: {
            email: true,
            name: true,
          },
        },
        dmId: true,
        dmName: true,
        id: true,
        ticketPrice: true,
        title: true,
      },
    }),
    prisma.grimoireEvent.findMany({
      select: {
        id: true,
        subtitle: true,
        ticketLabel: true,
      },
      orderBy: [{ date: "desc" }],
    }),
    prisma.grimoireCuratedGame.findMany({
      select: {
        dm: true,
        eventId: true,
        slug: true,
        ticketPrice: true,
        ticketPriceUsd: true,
        title: true,
      },
      orderBy: [{ startAt: "desc" }],
    }),
    safeFindMany(prismaTicketSales.dmPaymentProfile, {
      orderBy: [{ dmName: "asc" }],
    }),
    safeFindMany(prismaTicketSales.ticketRefund, {
      include: {
        checkoutOrder: {
          select: {
            paypalOrderId: true,
            summaryText: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ refundedAt: "desc" }, { createdAt: "desc" }],
    }),
    safeFindUnique(prismaTicketSales.ticketSalesSettings, {
      where: {
        id: "default",
      },
    }),
    safeFindMany(prismaTicketSales.ticketPayout, {
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        dmPaymentProfile: true,
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const leagueRows = buildLeagueTicketSaleRows(completedOrders, games);
  const grimoireRows = buildGrimoireTicketSaleRows(
    completedOrders,
    grimoireGames,
    grimoireEvents,
  );
  const grimoireBadgeRows = grimoireRows.filter(
    (row) => row.saleSourceType === "GRIMOIRE_BADGE",
  );
  const grimoireGameRows = grimoireRows.filter(
    (row) => row.saleSourceType === "GRIMOIRE_GAME",
  );
  const membershipRows = buildMembershipSaleRows(completedOrders);
  const knownDmCandidates = buildKnownDmCandidates({
    curatedGames: grimoireGames,
    games,
    paymentProfiles,
  });
  const payoutCandidates = buildDmPayoutCandidates({
    grimoireRows,
    leagueRows,
    paymentProfiles,
  });
  const activeSettings = settings ?? {
    defaultDmPayoutRatePct: 0,
    federalTaxRatePct: 5,
    provincialTaxRatePct: 0,
  };

  const leagueGrossUsd = sumAmounts(leagueRows.map((row) => row.totalUsd));
  const grimoireGrossUsd = sumAmounts(grimoireRows.map((row) => row.totalUsd));
  const refundTotalUsd = sumAmounts(refunds.map((refund) => refund.amountUsd));
  const pendingPayoutUsd = sumAmounts(
    payouts
      .filter((payout) => payout.status === "PENDING")
      .map((payout) => payout.payoutAmountUsd),
  );
  const paidPayoutUsd = sumAmounts(
    payouts
      .filter((payout) => payout.status === "PAID")
      .map((payout) => payout.payoutAmountUsd),
  );
  const netSalesUsd = leagueGrossUsd + grimoireGrossUsd - refundTotalUsd;
  const estimatedFederalTaxUsd = calculateTaxAmount(
    netSalesUsd,
    activeSettings.federalTaxRatePct,
  );
  const estimatedProvincialTaxUsd = calculateTaxAmount(
    netSalesUsd,
    activeSettings.provincialTaxRatePct,
  );
  const trackedPayoutKeys = new Set(
    payouts
      .filter((payout) => payout.status !== "CANCELLED")
      .map((payout) =>
        buildPayoutCandidateKey({
          checkoutType: payout.checkoutType,
          dmName: payout.dmName,
          dmUserId: payout.dmUserId,
          saleSourceId: payout.saleSourceId,
          saleSourceType: payout.saleSourceType,
        }),
      ),
  );
  const openPayoutCandidates = payoutCandidates.filter(
    (candidate) =>
      !trackedPayoutKeys.has(
        buildPayoutCandidateKey({
          checkoutType: candidate.checkoutType,
          dmName: candidate.dmName,
          dmUserId: candidate.dmUserId,
          saleSourceId: candidate.saleSourceId,
          saleSourceType: candidate.saleSourceType,
        }),
      ),
  );

  const settingsMessageMap: Record<string, string> = {
    invalid: "Ticket sales settings could not be saved.",
    unavailable: "Ticket sales settings are unavailable until the new Prisma migration/client is applied.",
    updated: "Ticket sales settings updated.",
  };
  const paymentMessageMap: Record<string, string> = {
    invalid: "DM payment method could not be saved.",
    saved: "DM payment method saved.",
    unavailable: "DM payment methods are unavailable until the new Prisma migration/client is applied.",
  };
  const refundMessageMap: Record<string, string> = {
    created: "Refund logged.",
    invalid: "Refund could not be logged.",
    unavailable: "Refund logging is unavailable until the new Prisma migration/client is applied.",
  };
  const payoutMessageMap: Record<string, string> = {
    created: "Payout created.",
    invalid: "Payout could not be saved.",
    "missing-method": "A DM payment method is required before marking a payout as paid.",
    unavailable: "Payout tracking is unavailable until the new Prisma migration/client is applied.",
    updated: "Payout updated.",
  };

  const settingsMessage = params.settings ? settingsMessageMap[params.settings] : "";
  const paymentMessage = params.payment ? paymentMessageMap[params.payment] : "";
  const refundMessage = params.refund ? refundMessageMap[params.refund] : "";
  const payoutMessage = params.payout ? payoutMessageMap[params.payout] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {settingsMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{settingsMessage}</p> : null}
        {paymentMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{paymentMessage}</p> : null}
        {refundMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{refundMessage}</p> : null}
        {payoutMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{payoutMessage}</p> : null}
        {!ticketSalesFeatureReady ? (
          <p style={{ color: "#ffe7a0", margin: 0 }}>
            Ticket-sales tables are not active in the current Prisma client yet. Sales reporting
            will load from existing checkout orders, but refunds, payout tracking, DM payment
            methods, and saved settings will stay read-only or unavailable until the migration and
            Prisma client refresh are applied.
          </p>
        ) : null}

        <AdminPageHeader
          description="Review completed league and Grimoire ticket sales, log refunds, manage DM payment methods, and track manual payouts from one place."
          navigationRole={navigationRole}
          title="Ticket sales"
        />

        <div className="ggcon-summary-metrics">
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">League ticket sales</span>
            <strong>{formatUsd(leagueGrossUsd)}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Grimoire ticket sales</span>
            <strong>{formatUsd(grimoireGrossUsd)}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Refunds logged</span>
            <strong>{formatUsd(refundTotalUsd)}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Net sales after refunds</span>
            <strong>{formatUsd(netSalesUsd)}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Pending payouts</span>
            <strong>{formatUsd(pendingPayoutUsd)}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Paid payouts</span>
            <strong>{formatUsd(paidPayoutUsd)}</strong>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Tax and payout settings</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                These rates are reporting inputs only right now. PayPal checkout still charges the
                stored ticket price directly and does not add separate tax lines yet.
              </p>
            </div>
          </div>

          <form action={saveTicketSalesSettings} className="form-stack">
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <label>
                Provincial tax %
                <input
                  defaultValue={activeSettings.provincialTaxRatePct}
                  min="0"
                  name="provincialTaxRatePct"
                  step="0.01"
                  type="number"
                />
              </label>
              <label>
                Federal tax %
                <input
                  defaultValue={activeSettings.federalTaxRatePct}
                  min="0"
                  name="federalTaxRatePct"
                  step="0.01"
                  type="number"
                />
              </label>
              <label>
                Default DM payout %
                <input
                  defaultValue={activeSettings.defaultDmPayoutRatePct}
                  min="0"
                  name="defaultDmPayoutRatePct"
                  step="0.01"
                  type="number"
                />
              </label>
            </div>
            <button className="button-secondary" type="submit">
              Save settings
            </button>
          </form>

          <div className="ggcon-summary-metrics">
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Estimated federal tax</span>
              <strong>{formatUsd(estimatedFederalTaxUsd)}</strong>
            </div>
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Estimated provincial tax</span>
              <strong>{formatUsd(estimatedProvincialTaxUsd)}</strong>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>DM payment methods</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Every DM attached to ticketed sales should have a payment method on file before a
                payout is marked paid.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>DM</th>
                  <th>Contact</th>
                  <th>Current method</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {knownDmCandidates.length ? (
                  knownDmCandidates.map((candidate) => (
                    <tr key={candidate.lookupKey}>
                      <td>
                        <strong>{candidate.dmName}</strong>
                      </td>
                      <td>{candidate.profile?.contactEmail ?? candidate.contactEmail ?? "Not provided"}</td>
                      <td>
                        {candidate.profile
                          ? formatPaymentMethodSummary(candidate.profile)
                          : "Missing payment method"}
                      </td>
                      <td>
                        <form
                          action={saveDmPaymentProfile}
                          className="form-stack"
                          style={{ minWidth: "260px" }}
                        >
                          <input name="lookupKey" type="hidden" value={candidate.lookupKey} />
                          <input name="dmName" type="hidden" value={candidate.dmName} />
                          <input
                            name="dmUserId"
                            type="hidden"
                            value={candidate.dmUserId ?? ""}
                          />
                          <label>
                            Method
                            <select
                              defaultValue={candidate.profile?.paymentMethodType ?? ""}
                              name="paymentMethodType"
                            >
                              <option value="">Select a method</option>
                              <option value="PAYPAL">PayPal</option>
                              <option value="E_TRANSFER">E-transfer</option>
                              <option value="BANK_TRANSFER">Bank transfer</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </label>
                          <label>
                            Label
                            <input
                              defaultValue={candidate.profile?.paymentMethodLabel ?? ""}
                              name="paymentMethodLabel"
                              placeholder="PayPal account, bank alias, etc."
                              type="text"
                            />
                          </label>
                          <label>
                            Details
                            <input
                              defaultValue={candidate.profile?.paymentDetails ?? ""}
                              name="paymentDetails"
                              placeholder="Address, email, last four, or instructions"
                              type="text"
                            />
                          </label>
                          <label>
                            Contact email
                            <input
                              defaultValue={
                                candidate.profile?.contactEmail ?? candidate.contactEmail ?? ""
                              }
                              name="contactEmail"
                              type="email"
                            />
                          </label>
                          <label>
                            Notes
                            <textarea
                              defaultValue={candidate.profile?.notes ?? ""}
                              name="notes"
                              rows={2}
                            />
                          </label>
                          <label
                            style={{
                              alignItems: "center",
                              display: "flex",
                              gap: "0.5rem",
                            }}
                          >
                            <input
                              defaultChecked={candidate.profile?.isActive ?? true}
                              name="isActive"
                              type="checkbox"
                            />
                            Payment method is active
                          </label>
                          <button className="button-secondary button-small" type="submit">
                            Save payment method
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No ticketed DMs have been detected yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Payout candidates</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Aggregated ticket sales by game and DM. Create a payout record when you are ready
                to track what the DM should receive for that sale source.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>DM</th>
                  <th>Seats sold</th>
                  <th>Gross sales</th>
                  <th>Payment method</th>
                  <th>Create payout</th>
                </tr>
              </thead>
              <tbody>
                {openPayoutCandidates.length ? (
                  openPayoutCandidates.map((candidate) => (
                    <tr
                      key={[
                        candidate.checkoutType,
                        candidate.saleSourceType,
                        candidate.saleSourceId,
                        candidate.dmLookupKey,
                      ].join(":")}
                    >
                      <td>
                        <strong>{candidate.saleSourceLabel}</strong>
                        <div className="muted">
                          {candidate.checkoutType} · {candidate.saleSourceType.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td>{candidate.dmName}</td>
                      <td>{candidate.seatCount}</td>
                      <td>{formatUsd(candidate.grossTicketSalesUsd)}</td>
                      <td>
                        {candidate.dmPaymentProfileId
                          ? formatPaymentMethodSummary(
                              paymentProfiles.find(
                                (profile) => profile.id === candidate.dmPaymentProfileId,
                              ) ?? {
                                contactEmail: null,
                                isActive: false,
                                paymentDetails: null,
                                paymentMethodLabel: null,
                                paymentMethodType: null,
                              },
                            )
                          : "Missing payment method"}
                      </td>
                      <td>
                        <form action={createTicketPayout} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <input name="checkoutType" type="hidden" value={candidate.checkoutType} />
                          <input name="dmName" type="hidden" value={candidate.dmName} />
                          <input
                            name="dmPaymentProfileId"
                            type="hidden"
                            value={candidate.dmPaymentProfileId ?? ""}
                          />
                          <input name="dmUserId" type="hidden" value={candidate.dmUserId ?? ""} />
                          <input
                            name="grossTicketSalesUsd"
                            type="hidden"
                            value={candidate.grossTicketSalesUsd}
                          />
                          <input name="notes" type="hidden" value="" />
                          <input name="saleSourceId" type="hidden" value={candidate.saleSourceId} />
                          <input
                            name="saleSourceLabel"
                            type="hidden"
                            value={candidate.saleSourceLabel}
                          />
                          <input
                            name="saleSourceType"
                            type="hidden"
                            value={candidate.saleSourceType}
                          />
                          <input name="seatCount" type="hidden" value={candidate.seatCount} />
                          <input
                            defaultValue={activeSettings.defaultDmPayoutRatePct}
                            min="0"
                            name="payoutRatePct"
                            step="0.01"
                            style={{ width: "90px" }}
                            type="number"
                          />
                          <button className="button-secondary button-small" type="submit">
                            Create payout
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Every current payout candidate is already tracked or there are no ticketed DM sales yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Refund log</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Refunds are manual records right now. Use this to track ticket reimbursements even
                if the money movement happened outside this page.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=refunds">
              Download CSV
            </Link>
          </div>

          <form action={createTicketRefund} className="form-stack">
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label>
                Checkout type
                <select defaultValue="LEAGUE" name="checkoutType">
                  <option value="LEAGUE">League</option>
                  <option value="GRIMOIRE">Grimoire</option>
                </select>
              </label>
              <label>
                Sale source type
                <select defaultValue="OTHER" name="saleSourceType">
                  {TICKET_SALE_SOURCE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Related order
                <select defaultValue="" name="checkoutOrderId">
                  <option value="">No linked order</option>
                  {completedOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.checkoutType} · {order.paypalOrderId} · {formatUsd(order.amountUsd)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Refund amount USD
                <input min="0.01" name="amountUsd" step="0.01" type="number" />
              </label>
              <label>
                Refunded at
                <input name="refundedAt" type="datetime-local" />
              </label>
              <label>
                Sale source id
                <input name="saleSourceId" type="text" />
              </label>
            </div>
            <label>
              Sale source label
              <input name="saleSourceLabel" required type="text" />
            </label>
            <label>
              Reason
              <input name="reason" required type="text" />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={3} />
            </label>
            <button className="button-secondary" type="submit">
              Log refund
            </button>
          </form>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Refunded</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Order</th>
                  <th>Logged by</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length ? (
                  refunds.map((refund) => (
                    <tr key={refund.id}>
                      <td>{formatDateTime(refund.refundedAt)}</td>
                      <td>
                        <strong>{refund.saleSourceLabel}</strong>
                        <div className="muted">
                          {refund.checkoutType} · {refund.saleSourceType.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td>{formatUsd(refund.amountUsd)}</td>
                      <td>
                        <strong>{refund.reason}</strong>
                        {refund.notes ? <div className="muted">{refund.notes}</div> : null}
                      </td>
                      <td>
                        {refund.checkoutOrder ? (
                          <span className="muted">{refund.checkoutOrder.paypalOrderId}</span>
                        ) : (
                          "Manual"
                        )}
                      </td>
                      <td>{refund.createdBy?.name ?? "Unknown"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No refunds have been logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Payout log</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Update the payment percentage, attach a payment method, and mark payouts paid once
                the DM has been sent funds.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=payouts">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>DM</th>
                  <th>Gross sales</th>
                  <th>Payout</th>
                  <th>Paid %</th>
                  <th>Status</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length ? (
                  payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>
                        <strong>{payout.saleSourceLabel}</strong>
                        <div className="muted">
                          {payout.checkoutType} · {payout.saleSourceType.replace(/_/g, " ")} ·{" "}
                          {payout.seatCount} seats
                        </div>
                      </td>
                      <td>{payout.dmName}</td>
                      <td>{formatUsd(payout.grossTicketSalesUsd)}</td>
                      <td>
                        <div>
                          <strong>{formatUsd(payout.payoutAmountUsd)}</strong>
                        </div>
                        <div className="muted">{formatPercent(payout.payoutRatePct)}</div>
                      </td>
                      <td>
                        {payout.status === "PAID"
                          ? formatPercent(payout.paidPayoutRatePct ?? payout.payoutRatePct)
                          : "—"}
                      </td>
                      <td>
                        {payout.status}
                        {payout.paidAt ? (
                          <div className="muted">{formatDateTime(payout.paidAt)}</div>
                        ) : null}
                      </td>
                      <td>
                        <form
                          action={updateTicketPayout}
                          className="form-stack"
                          style={{ minWidth: "260px" }}
                        >
                          <input name="payoutId" type="hidden" value={payout.id} />
                          <label>
                            Payment method
                            <select
                              defaultValue={payout.dmPaymentProfileId ?? ""}
                              name="dmPaymentProfileId"
                            >
                              <option value="">No payment method linked</option>
                              {paymentProfiles
                                .filter((profile) =>
                                  profile.lookupKey ===
                                  createDmPaymentLookupKey({
                                    dmName: payout.dmName,
                                    dmUserId: payout.dmUserId,
                                  }),
                                )
                                .map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {formatPaymentMethodSummary(profile)}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            Gross sales USD
                            <input
                              defaultValue={payout.grossTicketSalesUsd}
                              min="0"
                              name="grossTicketSalesUsd"
                              step="0.01"
                              type="number"
                            />
                          </label>
                          <label>
                            Payout %
                            <input
                              defaultValue={payout.payoutRatePct}
                              min="0"
                              name="payoutRatePct"
                              step="0.01"
                              type="number"
                            />
                          </label>
                          <label>
                            Status
                            <select defaultValue={payout.status} name="status">
                              {TICKET_PAYOUT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Notes
                            <textarea defaultValue={payout.notes ?? ""} name="notes" rows={2} />
                          </label>
                          <button className="button-secondary button-small" type="submit">
                            Save payout
                          </button>
                        </form>
                      </td>
                    </tr>
                  )) 
                ) : (
                  <tr>
                    <td colSpan={7}>No payouts have been created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Membership sales</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Completed Grimoire Guild membership purchases derived from the stored league
                checkout payload.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=memberships">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Product</th>
                  <th>Duration</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Gross</th>
                  <th>Payer / order</th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.length ? (
                  membershipRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.productName}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>
                        <strong>{row.productName}</strong>
                      </td>
                      <td>{row.durationDays} days</td>
                      <td>{row.quantity}</td>
                      <td>
                        <strong>{formatUsd(row.unitPriceUsd)}</strong>
                        <div className="muted">each</div>
                      </td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.payerEmail ?? "No payer email"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No completed membership sales were found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Event badge sales</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Completed Grimoire event badge purchases pulled out from the broader Grimoire
                checkout stream.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=badges">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Event</th>
                  <th>Badge</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Gross</th>
                  <th>Payer / order</th>
                </tr>
              </thead>
              <tbody>
                {grimoireBadgeRows.length ? (
                  grimoireBadgeRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.saleSourceType}:${row.saleSourceId}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>{row.eventLabel}</td>
                      <td>
                        <strong>{row.title}</strong>
                      </td>
                      <td>{row.quantity}</td>
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.payerEmail ?? "No payer email"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No completed event badge sales were found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>League ticket sales</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Completed paid league-ticket rows derived from stored PayPal checkout orders.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=league">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Game</th>
                  <th>DM</th>
                  <th>Seats</th>
                  <th>Ticket</th>
                  <th>Gross</th>
                  <th>Payer / order</th>
                </tr>
              </thead>
              <tbody>
                {leagueRows.length ? (
                  leagueRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.gameId}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>
                        <strong>{row.title}</strong>
                        <div className="muted">
                          {row.gameDate ? formatDateTime(row.gameDate) : "Date unavailable"}
                        </div>
                      </td>
                      <td>{row.dmName}</td>
                      <td>{row.quantity}</td>
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.payerEmail ?? "No payer email"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No completed league ticket sales were found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Ticket sales divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Grimoire ticket sales</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Completed curated-game ticket rows derived from stored Grimoire checkout orders.
              </p>
            </div>
            <Link className="button secondary" href="/admin/ticket-sales/export?report=grimoire">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Event</th>
                  <th>Item</th>
                  <th>DM</th>
                  <th>Qty</th>
                  <th>Ticket</th>
                  <th>Gross</th>
                  <th>Payer / order</th>
                </tr>
              </thead>
              <tbody>
                {grimoireGameRows.length ? (
                  grimoireGameRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.saleSourceType}:${row.saleSourceId}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>{row.eventLabel}</td>
                      <td>
                        <strong>{row.title}</strong>
                        <div className="muted">{row.saleSourceType.replace(/_/g, " ")}</div>
                      </td>
                      <td>{row.dmName ?? "Not applicable"}</td>
                      <td>{row.quantity}</td>
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.payerEmail ?? "No payer email"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No completed Grimoire game-ticket sales were found.</td>
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
