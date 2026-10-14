"use client";

import { useState } from "react";

export type MagicItemCardCollectionItem = {
  backImagePath: string;
  chestCode: string;
  countsAs: string;
  flavorNotes: string;
  frontImagePath: string;
  id: string;
  isCarried: boolean;
  itemName: string;
  limitedEditionLimit: number | null;
  limitedEditionNumber: number | null;
  minorProperty: string;
  rarity: string;
};

type MagicItemCardCollectionProps = {
  cards: MagicItemCardCollectionItem[];
};

function formatOptional(value: string) {
  return value.trim() || "Not added";
}

function formatLimitedEdition(number: number | null, limit: number | null) {
  return number != null && limit != null ? `${number}/${limit}` : "Not added";
}

export function MagicItemCardCollection({ cards }: MagicItemCardCollectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const card = cards[currentIndex];

  if (!card) {
    return null;
  }

  function showCard(index: number) {
    setCurrentIndex((index + cards.length) % cards.length);
    setIsFlipped(false);
  }

  return (
    <div className="magic-card-collection-carousel">
      <article className="magic-card-collection-item">
      <div className="magic-card-flip-stage">
        <div className={isFlipped ? "magic-card-flip is-flipped" : "magic-card-flip"}>
          <img
            alt={`${card.itemName} card front`}
            className="magic-card-face magic-card-face-front"
            src={card.frontImagePath}
          />
          <img
            alt={`${card.itemName} card back`}
            className="magic-card-face magic-card-face-back"
            src={card.backImagePath}
          />
        </div>
      </div>

      <div className="magic-card-navigation" aria-label="Card collection navigation">
        <button
          aria-label="Previous card"
          className="magic-card-navigation-button"
          onClick={() => showCard(currentIndex - 1)}
          title="Previous card"
          type="button"
        >
          &larr;
        </button>
        <div className="magic-card-flip-control">
          <button
            aria-label={`Flip ${card.itemName} card`}
            className="magic-card-flip-button"
            onClick={() => setIsFlipped((current) => !current)}
            title="Flip card"
            type="button"
          >
            &#8635;
          </button>
          <span className="magic-card-position" aria-live="polite">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>
        <button
          aria-label="Next card"
          className="magic-card-navigation-button"
          onClick={() => showCard(currentIndex + 1)}
          title="Next card"
          type="button"
        >
          &rarr;
        </button>
      </div>

      <div className="magic-card-meta stack">
        <div className="section-heading">
          <h3 style={{ margin: 0 }}>{card.itemName}</h3>
          {card.isCarried ? <span className="pill">Carried</span> : null}
        </div>
        <dl className="magic-card-detail-grid">
          <div>
            <dt>Counts as:</dt>
            <dd>{formatOptional(card.countsAs)}</dd>
          </div>
          <div>
            <dt>Rarity:</dt>
            <dd>{formatOptional(card.rarity)}</dd>
          </div>
          <div>
            <dt>Minor property:</dt>
            <dd>{formatOptional(card.minorProperty)}</dd>
          </div>
          <div>
            <dt>Chest code:</dt>
            <dd>{formatOptional(card.chestCode)}</dd>
          </div>
          <div>
            <dt>Limited:</dt>
            <dd>
              {formatLimitedEdition(card.limitedEditionNumber, card.limitedEditionLimit)}
            </dd>
          </div>
        </dl>
        {card.flavorNotes.trim() ? (
          <p className="muted" style={{ margin: 0 }}>
            {card.flavorNotes}
          </p>
        ) : null}
      </div>
      </article>
    </div>
  );
}
