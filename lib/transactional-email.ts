const RESEND_API_URL = "https://api.resend.com/emails";

type PasswordResetEmailInput = {
  name: string | null | undefined;
  resetUrl: string;
  to: string;
};

type PasswordChangedEmailInput = {
  name: string | null | undefined;
  to: string;
  wasCreated?: boolean;
};

type SpellbookMonthlySubscriptionEmailInput = {
  subscriberEmail: string;
  to: string;
};

type SpellbookMonthlySubscriberConfirmationEmailInput = {
  subscriberEmail: string;
};

type GrimoireSubmissionStatusEmailInput = {
  name: string | null | undefined;
  to: string;
  submissionTitle: string;
  eventSubtitle: string;
  eventDisplayDate: string;
  slotLabel: string;
  slotDateTime: string;
  decision: "APPROVED" | "REJECTED";
  actionPath?: string | null;
};

type LeagueRefundRequestEmailInput = {
  characterName: string;
  gameAdventureCode: string;
  gameDateTime: string;
  gamePath?: string | null;
  gameTier: string;
  gameTitle: string;
  matchingOrderSummaries: string[];
  playerEmail: string;
  playerName: string | null | undefined;
  to: string;
};

type LeagueRefundRequestConfirmationEmailInput = {
  gameAdventureCode: string;
  gameDateTime: string;
  gamePath?: string | null;
  gameTitle: string;
  supportEmail: string;
  to: string;
  playerName: string | null | undefined;
};

type NewGameSignupAlertEmailInput = {
  adventureCode: string;
  dmName: string;
  gameDateTime: string;
  gamePath?: string | null;
  gameTitle: string;
  priceLabel: string;
  seatsOpenLabel: string;
  tierLabel: string;
  to: string;
  playerName: string | null | undefined;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    from: process.env.EMAIL_FROM?.trim() ?? "",
    replyTo: process.env.EMAIL_REPLY_TO?.trim() ?? "",
  };
}

function getRecipientName(name: string | null | undefined) {
  return name?.trim() || "there";
}

function getAppBaseUrl() {
  const configuredBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";

  if (!configuredBaseUrl) {
    return "";
  }

  const normalizedBaseUrl = configuredBaseUrl.startsWith("http://") ||
    configuredBaseUrl.startsWith("https://")
    ? configuredBaseUrl
    : `https://${configuredBaseUrl}`;

  try {
    const parsedUrl = new URL(normalizedBaseUrl);
    return parsedUrl.origin;
  } catch {
    return normalizedBaseUrl.replace(/\/+$/, "");
  }
}

function buildAppUrl(path: string) {
  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");

  if (!baseUrl) {
    return "";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

async function sendTransactionalEmail({
  html,
  replyTo,
  subject,
  text,
  to,
}: {
  html: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  to: string;
}) {
  const { apiKey, from, replyTo: defaultReplyTo } = getEmailConfig();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      ...((replyTo?.trim() || defaultReplyTo)
        ? { reply_to: [replyTo?.trim() || defaultReplyTo] }
        : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Resend email failed with status ${response.status}: ${errorText}`
    );
  }
}

export function buildPasswordResetUrl(token: string, baseUrlOverride?: string) {
  const baseUrl = (baseUrlOverride?.trim() || getAppBaseUrl()).replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error(
      "APP_BASE_URL, AUTH_URL, NEXTAUTH_URL, or VERCEL_URL must be configured for password reset emails."
    );
  }

  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail({
  name,
  resetUrl,
  to,
}: PasswordResetEmailInput) {
  const recipientName = escapeHtml(getRecipientName(name));
  const escapedResetUrl = escapeHtml(resetUrl);
  const subject = "Reset your SPELLBOOK password";
  const text =
    `Hi ${getRecipientName(name)},\n\n` +
    "We received a request to reset the password for your SPELLBOOK account.\n\n" +
    `Use this link to choose a new password:\n${resetUrl}\n\n` +
    "If you did not request this, you can safely ignore this email.";
  const html =
    `<p>Hi ${recipientName},</p>` +
    "<p>We received a request to reset the password for your SPELLBOOK account.</p>" +
    `<p><a href="${escapedResetUrl}">Reset your password</a></p>` +
    "<p>If you did not request this, you can safely ignore this email.</p>";

  await sendTransactionalEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendPasswordChangedEmail({
  name,
  to,
  wasCreated = false,
}: PasswordChangedEmailInput) {
  const recipientName = escapeHtml(getRecipientName(name));
  const subject = wasCreated
    ? "A SPELLBOOK password was added to your account"
    : "Your SPELLBOOK password was changed";
  const text =
    `Hi ${getRecipientName(name)},\n\n` +
    (wasCreated
      ? "A password was just added to your SPELLBOOK account."
      : "Your SPELLBOOK account password was just changed.") +
    "\n\nIf you made this change, no further action is needed.\n\nIf this was not you, reset your password immediately and review your account access.";
  const html =
    `<p>Hi ${recipientName},</p>` +
    `<p>${
      wasCreated
        ? "A password was just added to your SPELLBOOK account."
        : "Your SPELLBOOK account password was just changed."
    }</p>` +
    "<p>If you made this change, no further action is needed.</p>" +
    "<p>If this was not you, reset your password immediately and review your account access.</p>";

  await sendTransactionalEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendSpellbookMonthlySubscriptionEmail({
  subscriberEmail,
  to,
}: SpellbookMonthlySubscriptionEmailInput) {
  const escapedSubscriberEmail = escapeHtml(subscriberEmail);
  const subject = "SPELLBOOK Monthly Subscription";
  const text = [
    "Please subscribe this email address to SPELLBOOK Monthly.",
    "",
    `Subscriber email: ${subscriberEmail}`,
    "",
    "This submission was sent from the SPELLBOOK website newsletter form.",
  ].join("\n");
  const html =
    "<p>Please subscribe this email address to SPELLBOOK Monthly.</p>" +
    `<p><strong>Subscriber email:</strong> ${escapedSubscriberEmail}</p>` +
    "<p>This submission was sent from the SPELLBOOK website newsletter form.</p>";

  await sendTransactionalEmail({
    to,
    replyTo: subscriberEmail,
    subject,
    text,
    html,
  });
}

export async function sendSpellbookMonthlySubscriberConfirmationEmail({
  subscriberEmail,
}: SpellbookMonthlySubscriberConfirmationEmailInput) {
  const escapedSubscriberEmail = escapeHtml(subscriberEmail);
  const subject = "You are subscribed to SPELLBOOK Monthly";
  const text = [
    "THANK YOU for subscribing!",
    "You can expect our monthly newsletter in your inbox.",
    "",
    `Subscribed email: ${subscriberEmail}`,
  ].join("\n");
  const html =
    "<p><strong>THANK YOU for subscribing!</strong></p>" +
    "<p>You can expect our monthly newsletter in your inbox.</p>" +
    `<p><strong>Subscribed email:</strong> ${escapedSubscriberEmail}</p>`;

  await sendTransactionalEmail({
    to: subscriberEmail,
    subject,
    text,
    html,
  });
}

export async function sendGrimoireSubmissionStatusEmail({
  name,
  to,
  submissionTitle,
  eventSubtitle,
  eventDisplayDate,
  slotLabel,
  slotDateTime,
  decision,
  actionPath,
}: GrimoireSubmissionStatusEmailInput) {
  const recipientName = escapeHtml(getRecipientName(name));
  const escapedSubmissionTitle = escapeHtml(submissionTitle);
  const escapedEventSubtitle = escapeHtml(eventSubtitle);
  const escapedEventDisplayDate = escapeHtml(eventDisplayDate);
  const escapedSlotLabel = escapeHtml(slotLabel);
  const escapedSlotDateTime = escapeHtml(slotDateTime);
  const actionUrl = actionPath?.trim() ? buildAppUrl(actionPath.trim()) : "";
  const escapedActionUrl = actionUrl ? escapeHtml(actionUrl) : "";
  const isApproved = decision === "APPROVED";
  const subject = isApproved
    ? "Your Grimoire DM submission was approved"
    : "Your Grimoire DM submission was not approved";
  const statusLine = isApproved
    ? `Your Grimoire Gathering DM submission for "${submissionTitle}" has been approved.`
    : `Your Grimoire Gathering DM submission for "${submissionTitle}" was reviewed but not approved this time.`;
  const boardLine = isApproved
    ? "Your table is now listed on the public Grimoire event board."
    : "Your table will not appear on the public Grimoire listings for this event.";
  const actionLine = actionUrl
    ? isApproved
      ? `View your public listing: ${actionUrl}`
      : `Review upcoming Grimoire submission openings: ${actionUrl}`
    : "";
  const htmlAction = actionUrl
    ? isApproved
      ? `<p><a href="${escapedActionUrl}">View your public listing</a></p>`
      : `<p><a href="${escapedActionUrl}">Review upcoming Grimoire submission openings</a></p>`
    : "";

  const text = [
    `Hi ${getRecipientName(name)},`,
    "",
    statusLine,
    boardLine,
    "",
    `Event: ${eventSubtitle}`,
    `Event dates: ${eventDisplayDate}`,
    `Slot: ${slotLabel}`,
    `Start time: ${slotDateTime}`,
    "",
    actionLine,
  ]
    .filter(Boolean)
    .join("\n");

  const html =
    `<p>Hi ${recipientName},</p>` +
    `<p>${
      isApproved
        ? `Your Grimoire Gathering DM submission for <strong>${escapedSubmissionTitle}</strong> has been approved.`
        : `Your Grimoire Gathering DM submission for <strong>${escapedSubmissionTitle}</strong> was reviewed but not approved this time.`
    }</p>` +
    `<p>${
      isApproved
        ? "Your table is now listed on the public Grimoire event board."
        : "Your table will not appear on the public Grimoire listings for this event."
    }</p>` +
    "<p>" +
    `<strong>Event:</strong> ${escapedEventSubtitle}<br />` +
    `<strong>Event dates:</strong> ${escapedEventDisplayDate}<br />` +
    `<strong>Slot:</strong> ${escapedSlotLabel}<br />` +
    `<strong>Start time:</strong> ${escapedSlotDateTime}` +
    "</p>" +
    htmlAction;

  await sendTransactionalEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendLeagueRefundRequestEmail({
  characterName,
  gameAdventureCode,
  gameDateTime,
  gamePath,
  gameTier,
  gameTitle,
  matchingOrderSummaries,
  playerEmail,
  playerName,
  to,
}: LeagueRefundRequestEmailInput) {
  const recipientName = escapeHtml(getRecipientName(playerName));
  const escapedCharacterName = escapeHtml(characterName);
  const escapedGameTitle = escapeHtml(gameTitle);
  const escapedGameAdventureCode = escapeHtml(gameAdventureCode);
  const escapedGameDateTime = escapeHtml(gameDateTime);
  const escapedGameTier = escapeHtml(gameTier);
  const escapedPlayerEmail = escapeHtml(playerEmail);
  const gameUrl = gamePath?.trim() ? buildAppUrl(gamePath.trim()) : "";
  const escapedGameUrl = gameUrl ? escapeHtml(gameUrl) : "";
  const orderLines = matchingOrderSummaries.length
    ? matchingOrderSummaries
    : ["No matching completed checkout order was linked automatically. Please review manually."];
  const escapedOrderLines = orderLines.map((line) => escapeHtml(line));
  const subject = `Refund request started: ${gameTitle}`;
  const text = [
    "A player left a paid SPELLBOOK game and requested refund review.",
    "",
    `Player: ${getRecipientName(playerName)}`,
    `Player email: ${playerEmail}`,
    `Character: ${characterName}`,
    `Game: ${gameTitle}`,
    `Adventure code: ${gameAdventureCode}`,
    `Tier: ${gameTier}`,
    `Scheduled time: ${gameDateTime}`,
    ...(gameUrl ? [`Game link: ${gameUrl}`] : []),
    "",
    "Completed checkout history linked to this request:",
    ...orderLines.map((line) => `- ${line}`),
  ].join("\n");
  const html =
    "<p>A player left a paid SPELLBOOK game and requested refund review.</p>" +
    "<p>" +
    `<strong>Player:</strong> ${recipientName}<br />` +
    `<strong>Player email:</strong> ${escapedPlayerEmail}<br />` +
    `<strong>Character:</strong> ${escapedCharacterName}<br />` +
    `<strong>Game:</strong> ${escapedGameTitle}<br />` +
    `<strong>Adventure code:</strong> ${escapedGameAdventureCode}<br />` +
    `<strong>Tier:</strong> ${escapedGameTier}<br />` +
    `<strong>Scheduled time:</strong> ${escapedGameDateTime}` +
    "</p>" +
    (gameUrl ? `<p><a href="${escapedGameUrl}">Open game listing</a></p>` : "") +
    "<p><strong>Completed checkout history linked to this request:</strong></p>" +
    `<ul>${escapedOrderLines.map((line) => `<li>${line}</li>`).join("")}</ul>`;

  await sendTransactionalEmail({
    to,
    replyTo: playerEmail,
    subject,
    text,
    html,
  });
}

export async function sendLeagueRefundRequestConfirmationEmail({
  gameAdventureCode,
  gameDateTime,
  gamePath,
  gameTitle,
  playerName,
  supportEmail,
  to,
}: LeagueRefundRequestConfirmationEmailInput) {
  const recipientName = escapeHtml(getRecipientName(playerName));
  const escapedGameTitle = escapeHtml(gameTitle);
  const escapedGameAdventureCode = escapeHtml(gameAdventureCode);
  const escapedGameDateTime = escapeHtml(gameDateTime);
  const escapedSupportEmail = escapeHtml(supportEmail);
  const gameUrl = gamePath?.trim() ? buildAppUrl(gamePath.trim()) : "";
  const escapedGameUrl = gameUrl ? escapeHtml(gameUrl) : "";
  const subject = `Refund request received: ${gameTitle}`;
  const text = [
    `Hi ${getRecipientName(playerName)},`,
    "",
    `You have been removed from ${gameTitle}.`,
    "SPELLBOOK staff has been emailed to begin reviewing any refund tied to this game signup.",
    "",
    `Adventure code: ${gameAdventureCode}`,
    `Scheduled time: ${gameDateTime}`,
    `Support contact: ${supportEmail}`,
    ...(gameUrl ? [`Game link: ${gameUrl}`] : []),
  ].join("\n");
  const html =
    `<p>Hi ${recipientName},</p>` +
    `<p>You have been removed from <strong>${escapedGameTitle}</strong>.</p>` +
    "<p>SPELLBOOK staff has been emailed to begin reviewing any refund tied to this game signup.</p>" +
    "<p>" +
    `<strong>Adventure code:</strong> ${escapedGameAdventureCode}<br />` +
    `<strong>Scheduled time:</strong> ${escapedGameDateTime}<br />` +
    `<strong>Support contact:</strong> ${escapedSupportEmail}` +
    "</p>" +
    (gameUrl ? `<p><a href="${escapedGameUrl}">Open game listing</a></p>` : "");

  await sendTransactionalEmail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendNewGameSignupAlertEmail({
  adventureCode,
  dmName,
  gameDateTime,
  gamePath,
  gameTitle,
  playerName,
  priceLabel,
  seatsOpenLabel,
  tierLabel,
  to,
}: NewGameSignupAlertEmailInput) {
  const recipientName = escapeHtml(getRecipientName(playerName));
  const escapedGameTitle = escapeHtml(gameTitle);
  const escapedAdventureCode = escapeHtml(adventureCode);
  const escapedGameDateTime = escapeHtml(gameDateTime);
  const escapedDmName = escapeHtml(dmName);
  const escapedTierLabel = escapeHtml(tierLabel);
  const escapedPriceLabel = escapeHtml(priceLabel);
  const escapedSeatsOpenLabel = escapeHtml(seatsOpenLabel);
  const gameUrl = gamePath?.trim() ? buildAppUrl(gamePath.trim()) : "";
  const escapedGameUrl = gameUrl ? escapeHtml(gameUrl) : "";
  const subject = `New game open for signup: ${gameTitle}`;
  const text = [
    `Hi ${getRecipientName(playerName)},`,
    "",
    `A new SPELLBOOK game is now open for signup: ${gameTitle}.`,
    "",
    `Adventure code: ${adventureCode}`,
    `DM: ${dmName}`,
    `Tier: ${tierLabel}`,
    `Scheduled time: ${gameDateTime}`,
    `Price: ${priceLabel}`,
    `Open spots: ${seatsOpenLabel}`,
    ...(gameUrl ? [`View game: ${gameUrl}`] : []),
  ].join("\n");
  const html =
    `<p>Hi ${recipientName},</p>` +
    `<p>A new <strong>SPELLBOOK</strong> game is now open for signup: <strong>${escapedGameTitle}</strong>.</p>` +
    "<p>" +
    `<strong>Adventure code:</strong> ${escapedAdventureCode}<br />` +
    `<strong>DM:</strong> ${escapedDmName}<br />` +
    `<strong>Tier:</strong> ${escapedTierLabel}<br />` +
    `<strong>Scheduled time:</strong> ${escapedGameDateTime}<br />` +
    `<strong>Price:</strong> ${escapedPriceLabel}<br />` +
    `<strong>Open spots:</strong> ${escapedSeatsOpenLabel}` +
    "</p>" +
    (gameUrl ? `<p><a href="${escapedGameUrl}">View game</a></p>` : "");

  await sendTransactionalEmail({
    to,
    subject,
    text,
    html,
  });
}
