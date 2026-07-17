"use client";

import { useState } from "react";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";

const SPELLBOOK_BOOKING_EMAIL = "jace@spellbookpublishing.com";
const EMAIL_SUBJECT = "Hire a DM";
const DEFAULT_MESSAGE = "Let's begin the conversation!";

function buildMailtoLink({
  dmEmail,
  dmName,
  contactName,
  contactEmail,
  tableName,
  details,
}: {
  dmEmail: string;
  dmName: string;
  contactName: string;
  contactEmail: string;
  tableName: string;
  details: string;
}) {
  const body = [
    DEFAULT_MESSAGE,
    "",
    `Professional DM: ${dmName}`,
    `Table contact: ${contactName}`,
    `Contact email: ${contactEmail}`,
    `Table or organization: ${tableName}`,
    "",
    "Booking details:",
    details,
  ].join("\n");

  return `mailto:${encodeURIComponent(
    `${SPELLBOOK_BOOKING_EMAIL},${dmEmail}`
  )}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function HireDmEmailForm({
  dmEmail,
  dmName,
}: {
  dmEmail: string;
  dmName: string;
}) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tableName, setTableName] = useState("");
  const [details, setDetails] = useState("");

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();

        window.location.href = buildMailtoLink({
          dmEmail,
          dmName,
          contactName,
          contactEmail,
          tableName,
          details,
        });
      }}
    >
      <div className="list-card stack">
        <div>
          <h2 style={{ margin: 0 }}>Contact for the hiring table</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            This opens an email draft addressed to <RainbowSpellbook /> and
            the selected professional DM.
          </p>
        </div>

        <label>
          Contact name
          <input
            name="contactName"
            onChange={(event) => setContactName(event.target.value)}
            required
            type="text"
            value={contactName}
          />
        </label>

        <label>
          Contact email
          <input
            name="contactEmail"
            onChange={(event) => setContactEmail(event.target.value)}
            required
            type="email"
            value={contactEmail}
          />
        </label>

        <label>
          Table or organization
          <input
            name="tableName"
            onChange={(event) => setTableName(event.target.value)}
            required
            type="text"
            value={tableName}
          />
        </label>

        <label>
          Booking details
          <textarea
            name="details"
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Share dates, time zone, game style, table size, and anything else the DM should know."
            required
            rows={6}
            value={details}
          />
        </label>
      </div>

      <button type="submit">Open Hire Email</button>
    </form>
  );
}
