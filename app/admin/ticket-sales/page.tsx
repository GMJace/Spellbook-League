import Link from "next/link";

import {
  createPendingDmPayouts,
  createSpellbookExpenseReceipt,
  createTicketRefund,
  saveDmPaymentProfile,
  saveTicketSalesSettings,
  updateTicketPayoutGroup,
} from "@/app/admin/ticket-sales/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TableActionMenu } from "@/components/table-action-menu";
import { requireTicketSalesAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  buildDmPayoutCandidates,
  buildGrimoireTicketSaleRows,
  buildKnownDmCandidates,
  buildLeagueTicketSaleRows,
  buildMembershipSaleRows,
  calculatePayoutAmount,
  calculateTaxAmount,
  createDmPaymentLookupKey,
  DmPaymentProfileRecord,
  sumAmounts,
  TICKET_PAYOUT_STATUSES,
} from "@/lib/ticket-sales";
import {
  getCombinedSalesTaxRatePct,
  normalizeTicketSalesRateSettings,
} from "@/lib/checkout-pricing";
import { formatDate, formatDateTime, formatUsd } from "@/lib/utils";

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
    spellbookExpenseReceipt?: {
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
    "spellbook-expense"?: string;
  }>;
}) {
  await requireTicketSalesAdminUser();
  const params = await searchParams;
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
    spellbookExpenseReceipts,
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
        receiptNumber: true,
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
            payerEmail: true,
            paypalOrderId: true,
            receiptNumber: true,
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
    safeFindMany(prismaTicketSales.spellbookExpenseReceipt, {
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
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
  const activeSettings = normalizeTicketSalesRateSettings(settings);
  const combinedSalesTaxRatePct = getCombinedSalesTaxRatePct(activeSettings);

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
  const payoutCandidateDmRollups = Array.from(
    openPayoutCandidates
      .reduce(
        (rollups, candidate) => {
          const existingRollup = rollups.get(candidate.dmLookupKey) ?? {
            combinedEstimatedPayoutUsd: 0,
            dmLookupKey: candidate.dmLookupKey,
            dmName: candidate.dmName,
            eventTicketSalesUsd: 0,
            leagueTicketSalesUsd: 0,
          };

          if (candidate.checkoutType === "LEAGUE") {
            existingRollup.leagueTicketSalesUsd += candidate.grossTicketSalesUsd;
            existingRollup.combinedEstimatedPayoutUsd += calculatePayoutAmount(
              candidate.grossTicketSalesUsd,
              activeSettings.leagueGameDmPayoutRatePct,
            );
          } else {
            existingRollup.eventTicketSalesUsd += candidate.grossTicketSalesUsd;
            existingRollup.combinedEstimatedPayoutUsd += calculatePayoutAmount(
              candidate.grossTicketSalesUsd,
              activeSettings.eventGameDmPayoutRatePct,
            );
          }

          rollups.set(candidate.dmLookupKey, existingRollup);

          return rollups;
        },
        new Map<
          string,
          {
            combinedEstimatedPayoutUsd: number;
            dmLookupKey: string;
            dmName: string;
            eventTicketSalesUsd: number;
            leagueTicketSalesUsd: number;
          }
        >(),
      )
      .values(),
  )
    .map((rollup) => ({
      ...rollup,
      combinedEstimatedPayoutUsd: sumAmounts([rollup.combinedEstimatedPayoutUsd]),
      eventTicketSalesUsd: sumAmounts([rollup.eventTicketSalesUsd]),
      leagueTicketSalesUsd: sumAmounts([rollup.leagueTicketSalesUsd]),
    }))
    .sort((left, right) => left.dmName.localeCompare(right.dmName));
  const payoutLogRowMap = payouts.reduce(
    (rows, payout) => {
      const rowKey = payout.groupKey ?? payout.id;
      const existingRow = rows.get(rowKey) ?? {
        combinedPayoutUsd: 0,
        createdAt: payout.createdAt,
        dmName: payout.dmName,
        dmPaymentProfileId: payout.dmPaymentProfileId ?? "",
        dmUserId: payout.dmUserId ?? null,
        eventTicketSalesUsd: 0,
        groupKeyOrPayoutId: rowKey,
        isGrouped: Boolean(payout.groupKey),
        leagueTicketSalesUsd: 0,
        notes: payout.notes ?? "",
        status: payout.status,
      };

      if (payout.createdAt < existingRow.createdAt) {
        existingRow.createdAt = payout.createdAt;
      }

      if (payout.checkoutType === "LEAGUE") {
        existingRow.leagueTicketSalesUsd += payout.grossTicketSalesUsd;
      } else {
        existingRow.eventTicketSalesUsd += payout.grossTicketSalesUsd;
      }

      existingRow.combinedPayoutUsd += payout.payoutAmountUsd;
      existingRow.dmPaymentProfileId = payout.dmPaymentProfileId ?? existingRow.dmPaymentProfileId;
      existingRow.notes = payout.notes ?? existingRow.notes;
      existingRow.status =
        existingRow.status === payout.status ? existingRow.status : "PENDING";

      rows.set(rowKey, existingRow);

      return rows;
    },
    new Map<
      string,
      {
        combinedPayoutUsd: number;
        createdAt: Date;
        dmName: string;
        dmPaymentProfileId: string;
        dmUserId: null | string;
        eventTicketSalesUsd: number;
        groupKeyOrPayoutId: string;
        isGrouped: boolean;
        leagueTicketSalesUsd: number;
        notes: string;
        status: "CANCELLED" | "PAID" | "PENDING";
      }
    >(),
  );
  const payoutLogRowValues = Array.from(payoutLogRowMap.values()) as Array<{
    combinedPayoutUsd: number;
    createdAt: Date;
    dmName: string;
    dmPaymentProfileId: string;
    dmUserId: null | string;
    eventTicketSalesUsd: number;
    groupKeyOrPayoutId: string;
    isGrouped: boolean;
    leagueTicketSalesUsd: number;
    notes: string;
    status: "CANCELLED" | "PAID" | "PENDING";
  }>;
  const payoutLogRows = payoutLogRowValues
    .map((row) => ({
      combinedPayoutUsd: sumAmounts([row.combinedPayoutUsd]),
      createdAt: row.createdAt,
      dmName: row.dmName,
      dmPaymentProfileId: row.dmPaymentProfileId,
      dmUserId: row.dmUserId,
      eventTicketSalesUsd: sumAmounts([row.eventTicketSalesUsd]),
      groupKeyOrPayoutId: row.groupKeyOrPayoutId,
      isGrouped: row.isGrouped,
      leagueTicketSalesUsd: sumAmounts([row.leagueTicketSalesUsd]),
      notes: row.notes,
      status: row.status,
    }))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

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
  const spellbookExpenseMessageMap: Record<string, string> = {
    created: "SPELLBOOK purchase or subscription logged.",
    invalid: "SPELLBOOK purchase or subscription could not be logged.",
    unavailable:
      "SPELLBOOK purchase tracking is unavailable until the new Prisma migration/client is applied.",
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
  const spellbookExpenseMessage = params["spellbook-expense"]
    ? spellbookExpenseMessageMap[params["spellbook-expense"]]
    : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {settingsMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{settingsMessage}</p> : null}
        {paymentMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{paymentMessage}</p> : null}
        {refundMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{refundMessage}</p> : null}
        {payoutMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{payoutMessage}</p> : null}
        {spellbookExpenseMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{spellbookExpenseMessage}</p>
        ) : null}
        {!ticketSalesFeatureReady ? (
          <p style={{ color: "#ffe7a0", margin: 0 }}>
            Ticket-sales tables are not active in the current Prisma client yet. Sales reporting
            will load from existing checkout orders, but refunds, payout tracking, DM payment
            methods, and saved settings will stay read-only or unavailable until the migration and
            Prisma client refresh are applied.
          </p>
        ) : null}

        <AdminPageHeader
          description="Review completed league and Grimoire sales, log refunds, manage DM payment methods, track payouts, and monitor SPELLBOOK accounting in one place."
          title="Accounting"
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
                Sales tax is applied in the live carts and PayPal checkout totals. DM payout
                defaults are split so league games and event games can use different percentages.
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
                League games payout %
                <input
                  defaultValue={activeSettings.leagueGameDmPayoutRatePct}
                  min="0"
                  name="leagueGameDmPayoutRatePct"
                  step="0.01"
                  type="number"
                />
              </label>
              <label>
                Event games payout %
                <input
                  defaultValue={activeSettings.eventGameDmPayoutRatePct}
                  min="0"
                  name="eventGameDmPayoutRatePct"
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
              <span className="muted">Combined sales tax rate</span>
              <strong>{formatPercent(combinedSalesTaxRatePct)}</strong>
            </div>
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
              <h2 style={{ margin: 0 }}>SPELLBOOK purchases / subscriptions</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Track internal SPELLBOOK purchases, tools, and subscription receipts in one place.
              </p>
            </div>
            <Link
              className="button secondary"
              href="/admin/accounting/export?report=spellbook-expenses"
            >
              Download CSV
            </Link>
          </div>

          <form action={createSpellbookExpenseReceipt} className="form-stack">
            <div
              className="spellbook-expense-grid"
              style={{
                display: "grid",
                gap: "1rem",
              }}
            >
              <label>
                Date
                <input name="expenseDate" required type="date" />
              </label>
              <label>
                Card
                <select defaultValue="Jace" name="cardHolder">
                  <option value="Jace">Jace</option>
                  <option value="Trevor">Trevor</option>
                </select>
              </label>
              <label>
                Company
                <input name="company" required type="text" />
              </label>
              <label>
                Service/Item
                <input name="serviceItem" required type="text" />
              </label>
              <label>
                Total
                <input min="0" name="totalUsd" required step="0.01" type="number" />
              </label>
              <label>
                Tax Paid
                <input min="0" name="taxPaidUsd" required step="0.01" type="number" />
              </label>
            </div>
            <button className="button-secondary" type="submit">
              Log purchase
            </button>
          </form>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Card</th>
                  <th>Company</th>
                  <th>Service/Item</th>
                  <th>Total</th>
                  <th>Tax Paid</th>
                </tr>
              </thead>
              <tbody>
                {spellbookExpenseReceipts.length ? (
                  spellbookExpenseReceipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{formatDate(receipt.expenseDate)}</td>
                      <td>{receipt.cardHolder}</td>
                      <td>{receipt.company}</td>
                      <td>{receipt.serviceItem}</td>
                      <td>{formatUsd(receipt.totalUsd)}</td>
                      <td>{formatUsd(receipt.taxPaidUsd)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No SPELLBOOK purchases or subscriptions have been logged yet.</td>
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

          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Pending DM Payouts</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Open payout candidates grouped by DM using the current default payout rates:
                {" "}league at {formatPercent(activeSettings.leagueGameDmPayoutRatePct)} and
                {" "}event games at {formatPercent(activeSettings.eventGameDmPayoutRatePct)}.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>DM</th>
                  <th>League ticket sales</th>
                  <th>Event ticket sales</th>
                  <th>Combined estimated payout</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payoutCandidateDmRollups.length ? (
                  payoutCandidateDmRollups.map((rollup) => (
                    <tr key={rollup.dmLookupKey}>
                      <td>
                        <strong>{rollup.dmName}</strong>
                      </td>
                      <td>{formatUsd(rollup.leagueTicketSalesUsd)}</td>
                      <td>{formatUsd(rollup.eventTicketSalesUsd)}</td>
                      <td>
                        <strong>{formatUsd(rollup.combinedEstimatedPayoutUsd)}</strong>
                      </td>
                      <td>
                        <TableActionMenu>
                          <form action={createPendingDmPayouts}>
                            <input
                              name="candidatesJson"
                              type="hidden"
                              value={JSON.stringify(
                                openPayoutCandidates
                                  .filter((candidate) => candidate.dmLookupKey === rollup.dmLookupKey)
                                  .map((candidate) => ({
                                    checkoutType: candidate.checkoutType,
                                    dmName: candidate.dmName,
                                    dmPaymentProfileId: candidate.dmPaymentProfileId ?? "",
                                    dmUserId: candidate.dmUserId ?? "",
                                    grossTicketSalesUsd: candidate.grossTicketSalesUsd,
                                    notes: "",
                                    payoutRatePct:
                                      candidate.checkoutType === "LEAGUE"
                                        ? activeSettings.leagueGameDmPayoutRatePct
                                        : activeSettings.eventGameDmPayoutRatePct,
                                    saleSourceId: candidate.saleSourceId,
                                    saleSourceLabel: candidate.saleSourceLabel,
                                    saleSourceType: candidate.saleSourceType,
                                    seatCount: candidate.seatCount,
                                  })),
                              )}
                            />
                            <button className="button-secondary button-small" type="submit">
                              Add to payout log
                            </button>
                          </form>
                        </TableActionMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No pending DM payouts are available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <Link className="button secondary" href="/admin/accounting/export?report=payouts">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>DM</th>
                  <th>League ticket sales</th>
                  <th>Event ticket sales</th>
                  <th>Combined payout</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payoutLogRows.length ? (
                  payoutLogRows.map((payout) => (
                    <tr key={payout.groupKeyOrPayoutId}>
                      <td>
                        {formatDateTime(payout.createdAt)}
                      </td>
                      <td>{payout.dmName}</td>
                      <td>{formatUsd(payout.leagueTicketSalesUsd)}</td>
                      <td>{formatUsd(payout.eventTicketSalesUsd)}</td>
                      <td>
                        <strong>{formatUsd(payout.combinedPayoutUsd)}</strong>
                      </td>
                      <td>
                        {payout.status}
                      </td>
                      <td>
                        <TableActionMenu panelStyle={{ minWidth: "18rem" }}>
                          <form
                            action={updateTicketPayoutGroup}
                            className="form-stack"
                            style={{ minWidth: "260px" }}
                          >
                            <input
                              name="groupKeyOrPayoutId"
                              type="hidden"
                              value={payout.groupKeyOrPayoutId}
                            />
                            <input
                              name="isGrouped"
                              type="hidden"
                              value={payout.isGrouped ? "true" : "false"}
                            />
                            <label>
                              Payment method
                              <select
                                defaultValue={payout.dmPaymentProfileId}
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
                              League ticket sales USD
                              <input
                                defaultValue={payout.leagueTicketSalesUsd}
                                min="0"
                                name="leagueTicketSalesUsd"
                                step="0.01"
                                type="number"
                              />
                            </label>
                            <label>
                              Event ticket sales USD
                              <input
                                defaultValue={payout.eventTicketSalesUsd}
                                min="0"
                                name="eventTicketSalesUsd"
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
                              <textarea defaultValue={payout.notes} name="notes" rows={2} />
                            </label>
                            <button className="button-secondary button-small" type="submit">
                              Update payout
                            </button>
                          </form>
                        </TableActionMenu>
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
              <h2 style={{ margin: 0 }}>Refund log</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Refunds are manual records right now. Use this to track ticket reimbursements even
                if the money movement happened outside this page.
              </p>
            </div>
            <Link className="button secondary" href="/admin/accounting/export?report=refunds">
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
                Receipt #
                <select defaultValue="" name="checkoutOrderId" required>
                  <option value="">Select a receipt #</option>
                  {completedOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.receiptNumber ?? order.paypalOrderId} · {order.checkoutType} ·{" "}
                      {formatUsd(order.amountUsd)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Refund amount USD
                <input min="0.01" name="amountUsd" step="0.01" type="number" />
              </label>
              <label>
                Credit amount USD
                <input min="0" name="creditAmountUsd" step="0.01" type="number" />
              </label>
              <label>
                Refunded at
                <input name="refundedAt" type="datetime-local" />
              </label>
            </div>
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
                  <th>Date</th>
                  <th>Refund USD</th>
                  <th>Credit USD</th>
                  <th>Receipt #</th>
                  <th>Reason</th>
                  <th>Notes</th>
                  <th>Payer</th>
                  <th>Logged by</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length ? (
                  refunds.map((refund) => (
                    <tr key={refund.id}>
                      <td>{formatDateTime(refund.refundedAt)}</td>
                      <td>{formatUsd(refund.amountUsd)}</td>
                      <td>{refund.creditGiven ? formatUsd(refund.creditAmountUsd) : "—"}</td>
                      <td>
                        {refund.checkoutOrder ? (
                          <>
                            <div>{refund.receiptNumber ?? "No refund receipt #"}</div>
                            <div className="muted">
                              Sale: {refund.checkoutOrder.receiptNumber ?? "No sale receipt #"}
                            </div>
                            <div className="muted">{refund.checkoutOrder.paypalOrderId}</div>
                          </>
                        ) : (
                          <span className="muted">{refund.receiptNumber ?? "No refund receipt #"}</span>
                        )}
                      </td>
                      <td>
                        <strong>{refund.reason}</strong>
                      </td>
                      <td>
                        {refund.creditGiven ? (
                          <div className="muted">
                            Credit given: {formatUsd(refund.creditAmountUsd)}
                          </div>
                        ) : null}
                        {refund.notes ? (
                          <div>{refund.notes}</div>
                        ) : !refund.creditGiven ? (
                          "—"
                        ) : null}
                      </td>
                      <td>{refund.checkoutOrder?.payerEmail ?? "No payer email"}</td>
                      <td>{refund.createdBy?.name ?? "Unknown"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No refunds have been logged yet.</td>
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
            <Link className="button secondary" href="/admin/accounting/export?report=memberships">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Gross</th>
                  <th>Receipt #</th>
                  <th>Payer</th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.length ? (
                  membershipRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.productName}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>
                        <strong>{formatUsd(row.unitPriceUsd)}</strong>
                        <div className="muted">each</div>
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.receiptNumber ?? "No receipt #"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                      <td>{row.payerEmail ?? "No payer email"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No completed membership sales were found.</td>
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
            <Link className="button secondary" href="/admin/accounting/export?report=badges">
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
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Gross</th>
                  <th>Receipt #</th>
                  <th>Payer</th>
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
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.receiptNumber ?? "No receipt #"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                      <td>{row.payerEmail ?? "No payer email"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No completed event badge sales were found.</td>
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
            <Link className="button secondary" href="/admin/accounting/export?report=league">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>DM</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Gross</th>
                  <th>Receipt #</th>
                  <th>Payer</th>
                </tr>
              </thead>
              <tbody>
                {leagueRows.length ? (
                  leagueRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.gameId}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>
                        <strong>{row.dmName}</strong>
                        <div className="muted">{row.title}</div>
                        <div className="muted">
                          {row.gameDate ? formatDateTime(row.gameDate) : "Date unavailable"}
                        </div>
                      </td>
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.receiptNumber ?? "No receipt #"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                      <td>{row.payerEmail ?? "No payer email"}</td>
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
            <Link className="button secondary" href="/admin/accounting/export?report=grimoire">
              Download CSV
            </Link>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Event</th>
                  <th>DM</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Gross</th>
                  <th>Receipt #</th>
                  <th>Payer</th>
                </tr>
              </thead>
              <tbody>
                {grimoireGameRows.length ? (
                  grimoireGameRows.map((row) => (
                    <tr key={`${row.checkoutOrderId}:${row.saleSourceType}:${row.saleSourceId}`}>
                      <td>{formatDateTime(row.capturedAt ?? row.createdAt)}</td>
                      <td>{row.eventLabel}</td>
                      <td>
                        <strong>{row.dmName ?? "Not applicable"}</strong>
                        <div className="muted">{row.title}</div>
                        <div className="muted">{row.saleSourceType.replace(/_/g, " ")}</div>
                      </td>
                      <td>
                        <strong>{row.ticketPriceLabel}</strong>
                        <div className="muted">{formatUsd(row.unitPriceUsd)} each</div>
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatUsd(row.totalUsd)}</td>
                      <td>
                        <strong>{row.receiptNumber ?? "No receipt #"}</strong>
                        <div className="muted">{row.paypalOrderId}</div>
                      </td>
                      <td>{row.payerEmail ?? "No payer email"}</td>
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
