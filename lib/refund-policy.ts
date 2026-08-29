export const PAID_GAME_REFUND_WINDOW_HOURS = 72;

const PAID_GAME_REFUND_WINDOW_MS = PAID_GAME_REFUND_WINDOW_HOURS * 60 * 60 * 1000;

export function getPaidGameRefundCutoff(startAt: Date) {
  return new Date(startAt.getTime() - PAID_GAME_REFUND_WINDOW_MS);
}

export function isPaidGameRefundRequestOpen(startAt: Date, now = new Date()) {
  return now.getTime() < getPaidGameRefundCutoff(startAt).getTime();
}
