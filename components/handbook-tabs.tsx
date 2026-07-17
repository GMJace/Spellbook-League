"use client";

import { useState } from "react";

type Handbook = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

export function HandbookTabs({ handbooks }: { handbooks: Handbook[] }) {
  const [activeId, setActiveId] = useState(handbooks[0]?.id ?? "");

  const activeHandbook = handbooks.find((handbook) => handbook.id === activeId) ?? handbooks[0];

  if (!handbooks.length) {
    return <div className="empty">No handbook content is available.</div>;
  }

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Handbooks">
        {handbooks.map((handbook) => (
          <button
            key={handbook.id}
            type="button"
            className={`tab-button ${activeHandbook.id === handbook.id ? "active" : ""}`}
            onClick={() => setActiveId(handbook.id)}
          >
            {handbook.title}
          </button>
        ))}
      </div>
      <div className="list-card">
        <h3>{activeHandbook.title}</h3>
        <p className="muted">{activeHandbook.content}</p>
      </div>
    </div>
  );
}
