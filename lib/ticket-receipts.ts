function buildReceiptNumber(prefix: "REFUND" | "SALE", timestamp: Date) {
  const isoString = timestamp.toISOString();
  const datePart = isoString.slice(0, 10).replace(/-/g, "");
  const timePart = isoString.slice(11, 19).replace(/:/g, "");
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  return `SBR-${prefix}-${datePart}-${timePart}-${randomPart}`;
}

export function createSaleReceiptNumber(timestamp = new Date()) {
  return buildReceiptNumber("SALE", timestamp);
}

export function createRefundReceiptNumber(timestamp = new Date()) {
  return buildReceiptNumber("REFUND", timestamp);
}
