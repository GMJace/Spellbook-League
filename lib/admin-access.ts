export const ADMIN_EMAILS = [
  "cornerstonednd@gmail.com",
  "mindplay@shaw.ca",
] as const;

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}
