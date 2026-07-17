import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getValidPasswordResetToken } from "@/lib/password-reset";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const resetToken = token ? await getValidPasswordResetToken(token) : null;
  const isValid = Boolean(resetToken);

  return (
    <main className="grid two">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Security</p>
          <h1>Reset password</h1>
          <p className="muted">
            Choose a new password for your league account.
          </p>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Need another link?{" "}
          <Link href="/forgot-password" className="ledger-link">
            Request a new reset email
          </Link>
          .
        </p>
      </section>

      <section className="panel">
        {isValid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="stack">
            <p style={{ color: "#ffffff", margin: 0 }}>
              This password reset link is invalid or has expired.
            </p>
            <Link href="/forgot-password" className="ledger-link">
              Request a fresh reset link
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
