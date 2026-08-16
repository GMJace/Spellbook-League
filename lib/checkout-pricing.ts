export const DEFAULT_TICKET_SALES_RATE_SETTINGS = {
  eventGameDmPayoutRatePct: 0,
  federalTaxRatePct: 5,
  leagueGameDmPayoutRatePct: 0,
  provincialTaxRatePct: 0,
} as const;

export type TicketSalesRateSettings = {
  eventGameDmPayoutRatePct: number;
  federalTaxRatePct: number;
  leagueGameDmPayoutRatePct: number;
  provincialTaxRatePct: number;
};

export function roundCurrencyUsd(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : 0;

  return Math.round(normalizedValue * 100) / 100;
}

export function normalizeTicketSalesRateSettings(
  settings?: null | Partial<TicketSalesRateSettings>,
): TicketSalesRateSettings {
  return {
    eventGameDmPayoutRatePct: settings?.eventGameDmPayoutRatePct ?? DEFAULT_TICKET_SALES_RATE_SETTINGS.eventGameDmPayoutRatePct,
    federalTaxRatePct: settings?.federalTaxRatePct ?? DEFAULT_TICKET_SALES_RATE_SETTINGS.federalTaxRatePct,
    leagueGameDmPayoutRatePct: settings?.leagueGameDmPayoutRatePct ?? DEFAULT_TICKET_SALES_RATE_SETTINGS.leagueGameDmPayoutRatePct,
    provincialTaxRatePct: settings?.provincialTaxRatePct ?? DEFAULT_TICKET_SALES_RATE_SETTINGS.provincialTaxRatePct,
  };
}

export function getCombinedSalesTaxRatePct(settings: TicketSalesRateSettings) {
  return roundCurrencyUsd(settings.federalTaxRatePct + settings.provincialTaxRatePct);
}

export function calculateSalesTaxUsd(subtotalUsd: number, salesTaxRatePct: number) {
  return roundCurrencyUsd(subtotalUsd * (salesTaxRatePct / 100));
}

export function calculateCheckoutTotals(args: {
  availableStoreCreditUsd?: number;
  salesTaxRatePct: number;
  subtotalUsd: number;
}) {
  const subtotalUsd = roundCurrencyUsd(args.subtotalUsd);
  const taxUsd = calculateSalesTaxUsd(subtotalUsd, args.salesTaxRatePct);
  const totalUsd = roundCurrencyUsd(subtotalUsd + taxUsd);
  const availableStoreCreditUsd = roundCurrencyUsd(args.availableStoreCreditUsd ?? 0);
  const storeCreditAppliedUsd = roundCurrencyUsd(
    Math.min(totalUsd, Math.max(availableStoreCreditUsd, 0)),
  );
  const payableAmountUsd = roundCurrencyUsd(
    Math.max(totalUsd - storeCreditAppliedUsd, 0),
  );

  return {
    payableAmountUsd,
    storeCreditAppliedUsd,
    subtotalUsd,
    taxUsd,
    totalUsd,
  };
}
