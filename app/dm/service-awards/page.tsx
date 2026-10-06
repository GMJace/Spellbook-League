import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DatePickerField } from "@/components/date-picker-field";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import { createDmServiceLog, deleteDmServiceLog } from "./actions";

export const dynamic = "force-dynamic";

const serviceActivities = [
  ["AL_CAMPAIGN", "Dungeon Mastering any AL campaign", "1 service hour per session hour"],
  ["PREP_TIME", "Prep time", "May be included as DM service"],
  ["SESSION_ZERO_SERVICE", "Running Session Zeroes", "May be included as DM service"],
  [
    "MENTORING_SERVICE",
    "Mentoring new DMs during their sessions",
    "May be included as DM service",
  ],
  ["NEW_SKILLS", "DMs' New Skills", "5 service hours or reward option"],
  ["MENTORING_ACHIEVEMENT", "Mentoring New DMs", "5 service hours or reward option"],
  ["LEARN_TO_PLAY", "Running Learn-to-Plays", "5 service hours or reward option"],
  ["SESSION_ZERO_ACHIEVEMENT", "Session Zeroes", "5 service hours or reward option"],
  ["ONLINE_DMS", "Online DMs", "10 service hours or reward option"],
  ["ENTIRE_BOOKS", "Entire Books", "10 service hours or reward option"],
  ["SLOT_ZERO_DMS", "Slot Zero DMs", "10 service hours or reward option"],
  ["KIDS_TABLES", "Kids' Tables", "10 service hours or reward option"],
  ["EVENT_DMS", "Event DMs", "20 service hours or reward option"],
  ["LAST_MINUTE_DMS", "Last Minute DMs", "20 service hours or reward option"],
  [
    "ENTIRE_NEW_RELEASE_BOOKS",
    "Entire New Release Books",
    "20 service hours or reward option",
  ],
  ["DM_PLAYTESTERS", "DM Playtesters", "20 service hours or reward option"],
  ["DMSGUILD_LEVIATHANS", "DMsGuild Leviathans", "40 service hours or reward option"],
  ["SIX_HOUR_EVENT_DMS", "6-Hour Event DMs", "40 service hours or reward option"],
  ["FIRST_TIME_DMS", "1st Time DMs", "40 service hours or reward option"],
  ["OUTLANDER", "Outlander", "40 service hours or reward option"],
  ["MORE_INCLUSIVE_TABLES", "More Inclusive Tables", "40 service hours or reward option"],
] as const;

const rewardOptionRules = [
  [
    "Same campaign and tier",
    "Your assigned character must match the campaign and be the same tier or higher than the player's character",
  ],
  [
    "Character cannot have played it before",
    "The character receiving the reward must not have already played that adventure",
  ],
  [
    "Once per adventure per character",
    "You can assign rewards from one adventure to a character only once",
  ],
  [
    "Some rewards excluded",
    "Unpublished author-only adventures and Official Support Kit epics are excluded",
  ],
] as const;

const quickDmCheatSheet = [
  "Running AL games: 1 hour per session hour.",
  "Prep, Session Zeroes, and mentoring new DMs: may count as DM service.",
  "Using safety tools: +1 service hour per session.",
  "New AL players: +1 service hour per new AL player.",
  "Online DMing: achievement can award 10 service hours.",
  "Learn-to-play games: achievement can award 5 service hours.",
  "Slot zero sessions: achievement can award 10 service hours.",
  "Kids' tables: achievement can award 10 service hours.",
  "Last-minute DMing: achievement can award 20 service hours.",
  "Event DMing 5 hours or less: achievement can award 20 service hours.",
  "Event DMing 6+ hours: achievement can award 40 service hours.",
  "First time DMing: achievement can award 40 service hours.",
  "Running 10 DMsGuild AL one-shots from the same campaign: achievement can award 40 service hours.",
  "Improving accessibility/inclusion at your table: achievement can award 40 service hours.",
] as const;

type PageProps = {
  searchParams?: Promise<{
    service?: string;
  }>;
};

function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export default async function DmServiceAwardsPage({ searchParams }: PageProps) {
  const user = await requireRole("DM");
  const params = searchParams ? await searchParams : undefined;
  const statusMessageMap: Record<string, string> = {
    created: "Service entry logged.",
    deleted: "Service entry deleted.",
    invalid: "The service entry could not be saved. Check the required fields and hours.",
  };
  const statusMessage = params?.service ? statusMessageMap[params.service] ?? "" : "";

  const serviceLogs = await prisma.dmServiceLog.findMany({
    where: { userId: user.id },
    orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
  });
  const totalServiceHours = serviceLogs.reduce((sum, log) => sum + log.totalHours, 0);
  const achievementHours = serviceLogs.reduce((sum, log) => sum + log.achievementHours, 0);
  const bonusHours = serviceLogs.reduce(
    (sum, log) => sum + log.safetyToolSessions + log.newAlPlayerCount,
    0,
  );

  return (
    <main className="stack">
      <section className="card ledger-panel stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">DM service awards</p>
            <h1 style={{ margin: 0 }}>{user.name ?? "Dungeon Master"}</h1>
          </div>
          <Link className="button secondary" href="/dm">
            Back to DM dashboard
          </Link>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Log DM service hours, bonus service, and service award achievements.
        </p>
        {statusMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{statusMessage}</p> : null}

        <div className="grid three">
          <div className="metric">
            <div className="metric-value">{formatHours(totalServiceHours)}</div>
            <div className="metric-label">Total service hours</div>
          </div>
          <div className="metric">
            <div className="metric-value">{formatHours(achievementHours)}</div>
            <div className="metric-label">Achievement hours</div>
          </div>
          <div className="metric">
            <div className="metric-value">{formatHours(bonusHours)}</div>
            <div className="metric-label">Bonus hours</div>
          </div>
        </div>
      </section>

      <section className="list-card stack">
        <h2 style={{ margin: 0 }}>Quick DM Cheat Sheet</h2>
        <ul className="dm-service-cheat-sheet">
          {quickDmCheatSheet.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="grid two">
        <article className="list-card stack">
          <h2 style={{ margin: 0 }}>Log service</h2>
          <form action={createDmServiceLog} className="form-stack">
            <label>
              Activity
              <select name="activityType" required>
                {serviceActivities.map(([value, label, award]) => (
                  <option key={value} value={value}>
                    {label} - {award}
                  </option>
                ))}
              </select>
            </label>
            <DatePickerField label="Activity date" name="activityDate" required type="date" />
            <label>
              Title
              <input
                name="title"
                placeholder="Adventure, session, mentoring, or award name"
                required
                type="text"
              />
            </label>
            <div className="form-grid">
              <label>
                Adventure code
                <input name="adventureCode" type="text" />
              </label>
              <label>
                Session/service hours
                <input defaultValue="0" min="0" name="sessionHours" step="0.25" type="number" />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Safety tool sessions
                <input
                  defaultValue="0"
                  min="0"
                  name="safetyToolSessions"
                  step="1"
                  type="number"
                />
              </label>
              <label>
                New AL players
                <input defaultValue="0" min="0" name="newAlPlayerCount" step="1" type="number" />
              </label>
            </div>
            <label>
              Notes
              <textarea name="notes" placeholder="Optional context for this service entry." />
            </label>
            <button className="button" type="submit">
              Log service
            </button>
          </form>
        </article>

        <article className="list-card stack">
          <h2 style={{ margin: 0 }}>Award guide</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Award</th>
                </tr>
              </thead>
              <tbody>
                {serviceActivities.map(([value, label, award]) => (
                  <tr key={value}>
                    <td>{label}</td>
                    <td>{award}</td>
                  </tr>
                ))}
                <tr>
                  <td>Using safety tools in a session</td>
                  <td>+1 service hour per session</td>
                </tr>
                <tr>
                  <td>Having new AL players in your session</td>
                  <td>+1 service hour per new AL player</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="list-card stack">
        <h2 style={{ margin: 0 }}>Reward option rules</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {rewardOptionRules.map(([rule, meaning]) => (
                <tr key={rule}>
                  <td>{rule}</td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Service history</p>
          <h2 style={{ margin: 0 }}>Logged entries</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th>Title</th>
                <th>Hours</th>
                <th>Bonuses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceLogs.length ? (
                serviceLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.activityDate)}</td>
                    <td>{log.activityLabel}</td>
                    <td>
                      <div className="stack" style={{ gap: "0.25rem" }}>
                        <strong>{log.title}</strong>
                        {log.adventureCode ? <span className="muted">{log.adventureCode}</span> : null}
                        {log.notes ? <span className="muted">{log.notes}</span> : null}
                      </div>
                    </td>
                    <td>{formatHours(log.totalHours)}</td>
                    <td>
                      Safety: {log.safetyToolSessions} | New players: {log.newAlPlayerCount}
                    </td>
                    <td>
                      <form action={deleteDmServiceLog}>
                        <input name="logId" type="hidden" value={log.id} />
                        <ConfirmSubmitButton
                          className="button-danger button-small"
                          message={`Delete service entry for ${log.title}?`}
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No service hours have been logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
