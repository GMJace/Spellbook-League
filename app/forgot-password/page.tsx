import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid two">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Security</p>
          <h1>Forgot your password?</h1>
          <p className="muted">
            Request a one-time password reset link for your league account.
          </p>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Remembered it after all?{" "}
          <Link href="/login" className="ledger-link">
            Go back to login
          </Link>
          .
        </p>
      </section>

      <section className="panel">
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
