import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DmServiceLogForm } from "@/components/dm-service-log-form";
import { requireRole } from "@/lib/auth";
import {
  dmServiceActivities,
  dmServiceAwardCategories,
  dmServiceCheatSheet,
  dmServiceRewardOptionRules,
} from "@/lib/dm-service-awards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import { createDmServiceLog, deleteDmServiceLog } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    service?: string;
  }>;
};

function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function formatHourBreakdown(log: {
  achievementHours: number;
  newAlPlayerCount: number;
  safetyToolSessions: number;
  sessionHours: number;
}) {
  const parts = [
    log.sessionHours > 0 ? `Session ${formatHours(log.sessionHours)}` : null,
    log.achievementHours > 0 ? `Award ${formatHours(log.achievementHours)}` : null,
    log.safetyToolSessions > 0 ? `Safety +${log.safetyToolSessions}` : null,
    log.newAlPlayerCount > 0 ? `New AL +${log.newAlPlayerCount}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "No hour details";
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

  const [serviceLogs, gameServiceLogs] = await Promise.all([
    prisma.dmServiceLog.findMany({
      where: { userId: user.id },
      orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.game.findMany({
      where: {
        serviceHours: { gt: 0 },
        OR: [
          { dmId: user.id },
          { loggedByUserId: user.id },
        ],
      },
      orderBy: { datePlayed: "desc" },
      select: {
        adventureCode: true,
        datePlayed: true,
        id: true,
        serviceHours: true,
        title: true,
      },
    }),
  ]);
  const gameServiceHours = gameServiceLogs.reduce((sum, game) => sum + game.serviceHours, 0);
  const totalServiceHours =
    gameServiceHours + serviceLogs.reduce((sum, log) => sum + log.totalHours, 0);
  const achievementHours = serviceLogs.reduce((sum, log) => sum + log.achievementHours, 0);
  const bonusHours = serviceLogs.reduce(
    (sum, log) => sum + log.safetyToolSessions + log.newAlPlayerCount,
    0,
  );
  const manualServiceHours =
    gameServiceHours + serviceLogs.reduce((sum, log) => sum + log.sessionHours, 0);
  const historyEntries = [
    ...serviceLogs.map((log) => ({
      action: (
        <form action={deleteDmServiceLog}>
          <input name="logId" type="hidden" value={log.id} />
          <ConfirmSubmitButton
            className="button-danger button-small"
            message={`Delete service entry for ${log.title}?`}
          >
            Delete
          </ConfirmSubmitButton>
        </form>
      ),
      activity: log.activityLabel,
      breakdown: formatHourBreakdown(log),
      date: log.activityDate,
      key: `service-${log.id}`,
      title: log.title,
      adventureCode: log.adventureCode,
      notes: log.notes,
      totalHours: log.totalHours,
    })),
    ...gameServiceLogs.map((game) => ({
      action: (
        <Link className="button secondary button-small" href={`/dm/games/${game.id}`}>
          View game
        </Link>
      ),
      activity: "DM game log",
      breakdown: `Game service ${formatHours(game.serviceHours)}`,
      date: game.datePlayed,
      key: `game-${game.id}`,
      title: game.title,
      adventureCode: game.adventureCode,
      notes: "Logged from Create/Log Game.",
      totalHours: game.serviceHours,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <main className="stack dm-service-page">
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

        <div className="dm-service-metrics">
          <div className="metric">
            <div className="metric-value">{formatHours(totalServiceHours)}</div>
            <div className="metric-label">Total service hours</div>
          </div>
          <div className="metric">
            <div className="metric-value">{formatHours(manualServiceHours)}</div>
            <div className="metric-label">Session/service hours</div>
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
          {dmServiceCheatSheet.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="grid two dm-service-workspace">
        <article className="list-card stack">
          <div>
            <h2 style={{ margin: 0 }}>Log service</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Add one or more activities. Service activity hours, fixed award hours, safety tool
              use, and new AL players all add to the service total.
            </p>
          </div>
          <DmServiceLogForm createAction={createDmServiceLog} />
        </article>

        <article className="list-card stack">
          <h2 style={{ margin: 0 }}>Award guide</h2>
          <div className="dm-service-award-list">
            {dmServiceAwardCategories.map((category) => (
              <section className="dm-service-award-group" key={category}>
                <h3>{category}</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Achievement</th>
                        <th>What You Do</th>
                        <th>Award</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dmServiceActivities
                        .filter((activity) => activity.category === category)
                        .map((activity) => (
                          <tr key={activity.value}>
                            <td>{activity.label}</td>
                            <td>{activity.detail}</td>
                            <td>{activity.award}</td>
                          </tr>
                        ))}
                      {category === "Core service" ? (
                        <>
                          <tr>
                            <td>Using safety tools in a session</td>
                            <td>Use safety tools during a session.</td>
                            <td>+1 service hour per session</td>
                          </tr>
                          <tr>
                            <td>Having new AL players in your session</td>
                            <td>Seat new Adventurers League players at your table.</td>
                            <td>+1 service hour per new AL player</td>
                          </tr>
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
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
              {dmServiceRewardOptionRules.map(({ meaning, rule }) => (
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
                <th>Entry</th>
                <th>Breakdown</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyEntries.length ? (
                historyEntries.map((entry) => (
                  <tr key={entry.key}>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.activity}</td>
                    <td>
                      <div className="stack" style={{ gap: "0.25rem" }}>
                        <strong>{entry.title}</strong>
                        {entry.adventureCode ? <span className="muted">{entry.adventureCode}</span> : null}
                        {entry.notes ? <span className="muted">{entry.notes}</span> : null}
                      </div>
                    </td>
                    <td>{entry.breakdown}</td>
                    <td>{formatHours(entry.totalHours)}</td>
                    <td>{entry.action}</td>
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
