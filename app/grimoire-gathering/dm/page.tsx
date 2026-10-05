import Link from "next/link";

import { GrimoireDmSubmissionForm } from "@/components/grimoire-dm-submission-form";
import { LocalizedEventTime } from "@/components/localized-event-time";
import {
  getCharacterBuildMagicItemOptions,
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
} from "@/lib/league-legal-choices";
import { getNextGrimoirePlanningEvent, getSlotsForEvent } from "@/lib/grimoire-server";
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
    planningEvent,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    getNextGrimoirePlanningEvent(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  if (!planningEvent) {
    return (
      <main className="page-shell">
        <section className="stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Run A Table</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Become a Grimoire DM</h1>
              <p className="muted ggcon-meta-note" style={{ margin: "0.5rem 0 0" }}>
                There is no upcoming Grimoire event open for advance DM submissions yet.
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

  const slots = await getSlotsForEvent(planningEvent.id);
  const slotsByEvent = {
    [planningEvent.id]: slots,
  };
  const legalRewardsJson = JSON.stringify({
    legalBuildMagicItemOptions: getCharacterBuildMagicItemOptions(legalMagicItemOptions),
    legalCommonMagicItemOptions: legalMagicItemOptions.Common,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  });
  const submissions = (await prisma.grimoireDmSubmission.findMany({
    where: {
      eventId: planningEvent.id,
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
              Submit a game for {planningEvent.subtitle} before the public schedule opens.
              Choose the time slot you want to run during {planningEvent.displayDate}.
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
                the details needed to review your table before the lineup goes public.
              </p>
            </div>
            <GrimoireDmSubmissionForm
              events={[planningEvent]}
              initialEventId={planningEvent.id}
              legalRewardsJson={legalRewardsJson}
              slotsByEvent={slotsByEvent}
            />
          </section>

          <section className="card ledger-panel stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">Planning Board</p>
              <h2 style={{ margin: 0 }}>Event slot availability</h2>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                The game lineup stays private until the schedule opens. This view only shows
                submission capacity for each planned slot.
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
                        {slot.availableGameSlots} of {slot.gameSlotCount} open
                      </span>
                    </div>
                    <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                      {slotSubmissions.length} approved submission
                      {slotSubmissions.length === 1 ? "" : "s"} already held for staff planning.
                    </p>
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
