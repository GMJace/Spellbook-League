import Link from "next/link";
import type { CSSProperties } from "react";
import { LocalizedEventTime } from "@/components/localized-event-time";

const noticesPerBoard = 9;
const parchments = [
  "/quests__parchment1.png",
  "/quests__parchment2.png",
  "/quests__parchment3.png",
];

type QuestNotice = {
  href: string;
  title: string;
  gm: string;
  dateTime: string;
};

export function HomepageQuestboard({ quests }: { quests: QuestNotice[] }) {
  const boards = Array.from(
    { length: Math.max(1, Math.ceil(quests.length / noticesPerBoard)) },
    (_, index) => quests.slice(index * noticesPerBoard, (index + 1) * noticesPerBoard),
  );

  return (
    <section id="current-open-quests" className="card ledger-panel stack homepage-questboard-section">
      <h2>Current Open QUESTS</h2>
      {boards.map((notices, index) => (
        <div key={notices[0]?.href ?? "empty"} className="homepage-questboard">
          {notices.length ? (
            <ul className="homepage-questboard-notices">
              {notices.map((quest, noticeIndex) => {
                const parchment = parchments[(index * noticesPerBoard + noticeIndex) % parchments.length];
                return (
                  <li key={quest.href}>
                    <Link
                      className="homepage-quest-notice"
                      href={quest.href}
                      style={{ "--quest-parchment": `url("${parchment}")` } as CSSProperties}
                    >
                      <strong>{quest.title}</strong>
                      <span>{quest.gm}</span>
                      <LocalizedEventTime className="homepage-quest-notice-time" isoString={quest.dateTime} compact />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="homepage-questboard-empty">No open quests are scheduled right now.</p>
          )}
        </div>
      ))}
      <Link className="button button-secondary button-small homepage-questboard-more" href="/league#available-quests">
        More quests
      </Link>
    </section>
  );
}
