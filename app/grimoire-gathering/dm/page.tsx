import Link from "next/link";

import { GrimoireDmSubmissionForm } from "@/components/grimoire-dm-submission-form";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { formatGrimoireTier } from "@/lib/grimoire";
import {
  getCharacterBuildMagicItemOptions,
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
} from "@/lib/league-legal-choices";
import { getNextGrimoireEvent, getSeasonSchedule, getSlotsForEvent } from "@/lib/grimoire-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SubmissionTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

type SubmissionRow = {
  id: string;
  name: string;
  discord: string | null;
  title: string;
  gameCode: string | null;
  slotStartAt: Date;
  tier: SubmissionTier;
  seats: number;
  summary: string;
};

export default async function GrimoireDmPage() {
  const [
    nextEvent,
    seasonSchedule,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    getNextGrimoireEvent(),
    getSeasonSchedule(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);
  const publishedEvents = seasonSchedule.filter(
    (event) => new Date(event.date).getTime() >= Date.now()
  );

  if (!nextEvent || !publishedEvents.length) {
    return (
      <main className="page-shell">
        <section className="stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Run A Table</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Become a Grimoire DM</h1>
              <p className="muted ggcon-meta-note" style={{ margin: "0.5rem 0 0" }}>
                There is no upcoming Grimoire event scheduled yet.
              </p>
            </div>

            <div className="inline-actions" style={{ flexWrap: "wrap" }}>
              <Link className="button secondary" href="/grimoire-gathering">
                Back to Grimoire
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const slotPairs = await Promise.all(
    publishedEvents.map(async (event) => [event.id, await getSlotsForEvent(event.id)] as const)
  );
  const slotsByEvent = Object.fromEntries(slotPairs);
  const legalRewardsJson = JSON.stringify({
    legalBuildMagicItemOptions: getCharacterBuildMagicItemOptions(legalMagicItemOptions),
    legalCommonMagicItemOptions: legalMagicItemOptions.Common,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  });
  const slots = slotsByEvent[nextEvent.id] ?? [];
  const submissions = (await prisma.grimoireDmSubmission.findMany({
    where: {
      eventId: nextEvent.id,
      status: "APPROVED",
    },
    orderBy: [{ slotStartAt: "asc" }, { createdAt: "asc" }],
  })) as SubmissionRow[];

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Run A Table</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>Become a Grimoire DM</h1>
            <p className="muted ggcon-meta-note" style={{ margin: "0.5rem 0 0" }}>
              Submit a game for {nextEvent.subtitle} and choose the time slot you want
              to run during {nextEvent.displayDate}.
            </p>
          </div>

          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <Link className="button secondary" href="/grimoire-gathering">
              Back to Grimoire
            </Link>
            <Link className="button" href="/grimoire-gathering/cart">
              Open cart
            </Link>
          </div>
        </div>

        <div className="grid two ggcon-detail-grid">
          <section className="card ledger-panel stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">DM Submission</p>
              <h2 style={{ margin: 0 }}>Submit your game for review</h2>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Use this form to claim a slot, share your game pitch, and give staff
                the details needed to review and publish your table.
              </p>
            </div>
            <GrimoireDmSubmissionForm
              events={publishedEvents}
              initialEventId={nextEvent.id}
              legalRewardsJson={legalRewardsJson}
              slotsByEvent={slotsByEvent}
            />
          </section>

          <section className="card ledger-panel stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">Published Board</p>
              <h2 style={{ margin: 0 }}>Approved event schedule</h2>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Only approved submissions appear here. Pending and rejected tables stay
                in the admin review queue.
              </p>
            </div>

            <div className="stack">
              {slots.map((slot) => {
                const slotSubmissions = submissions.filter(
                  (submission) =>
                    submission.slotStartAt.toISOString() ===
                    new Date(slot.startAt).toISOString(),
                );

                return (
                  <section className="list-card stack" key={slot.startAt}>
                    <div className="section-heading">
                      <div>
                        <h3 style={{ margin: 0 }}>{slot.label}</h3>
                        <p className="muted ggcon-meta-note" style={{ margin: "0.35rem 0 0" }}>
                          <LocalizedEventTime isoString={slot.startAt} />
                        </p>
                      </div>
                      <span className="pill">
                        {slotSubmissions.length} submission
                        {slotSubmissions.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {slotSubmissions.length ? (
                      <div className="stack">
                        {slotSubmissions.map((submission) => (
                          <article className="ggcon-slot-entry" key={submission.id}>
                            <div className="section-heading">
                              <div>
                                <strong>{submission.title}</strong>
                                {submission.gameCode ? (
                                  <p
                                    className="muted ggcon-meta-note"
                                    style={{ margin: "0.35rem 0 0" }}
                                  >
                                    {submission.gameCode}
                                  </p>
                                ) : null}
                                <p
                                  className="muted ggcon-meta-note"
                                  style={{ margin: "0.35rem 0 0" }}
                                >
                                  {[submission.name, submission.discord]
                                    .filter(Boolean)
                                    .join(" · ")}{" "}
                                  · {formatGrimoireTier(submission.tier)} · {submission.seats} seats
                                </p>
                              </div>
                            </div>
                            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                              {submission.summary}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                        No approved games have been posted for this slot yet.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
