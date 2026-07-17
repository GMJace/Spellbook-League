"use client";

import { FormEvent, useState } from "react";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";

export function SpellbookMonthlyForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/spellbook-monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        error?: string;
        success?: string;
      };

      if (!response.ok) {
        setError(data.error || "Subscription email could not be sent right now. Please try again shortly.");
        return;
      }

      setSuccess(
        data.success ||
          "Thank you for joining the SPELLBOOK monthly subscriber list. Watch your email for the drops every month!"
      );
      setEmail("");
    } catch {
      setError("Subscription email could not be sent right now. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack homepage-monthly-form" onSubmit={handleSubmit}>
      <label>
        <span className="sr-only">Enter your email</span>
        <input
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          required
          type="email"
          value={email}
        />
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Subscribing..." : "Subscribe"}
      </button>

      {error ? (
        <p className="homepage-monthly-error" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <p className="muted homepage-monthly-note" style={{ margin: 0 }}>
        {success ? (
          success
        ) : (
          <>
            Submitting your email gives our team permission to email you with{" "}
            <RainbowSpellbook /> updates. To unsubscribe, click the unsubscribe
            button in the footer of our emails. THANKS!
          </>
        )}
      </p>
    </form>
  );
}
