import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const allowGoogle = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const allowDiscord = Boolean(
    process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
  );

  return (
    <main className="grid two">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Login to your league account</h1>
          <p className="muted">
            Sign in to manage characters, run games, and review your league
            activity.
          </p>
        </div>
      </section>
      <section className="panel">
        {params.registered === "1" ? (
          <p style={{ color: "#ffffff", marginTop: 0 }}>
            Account created. You can sign in now.
          </p>
        ) : null}
        {params.reset === "1" ? (
          <p style={{ color: "#ffffff", marginTop: 0 }}>
            Password updated. Sign in with your new password.
          </p>
        ) : null}
        <LoginForm allowDiscord={allowDiscord} allowGoogle={allowGoogle} />
      </section>
    </main>
  );
}
