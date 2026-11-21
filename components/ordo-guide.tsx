import Link from "next/link";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import content from "@/lib/ordo-guide-content.json";

type GuideBlock =
  | { type: "paragraph" | "heading" | "list"; text: string }
  | { type: "image"; src: string; alt: string; width: number; height: number; fullWidth?: boolean }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] };

type GuideSection = { id: string; title: string; blocks: GuideBlock[] };
const sections = content as GuideSection[];
const itemArtwork: Record<string, { src: string; alt: string }> = {
  "ORDO Signet Ring": { src: "/ORDO%20ring.png", alt: "ORDO Signet Ring" },
  "ORDO Satchel Pocket": { src: "/Ordo%20Satchel.png", alt: "ORDO Satchel" },
};

function PlanescapeBlocks({ blocks }: { blocks: GuideBlock[] }) {
  const balancedEdge = blocks.findIndex((block) => block.type === "heading" && block.text === "The Balanced Edge");
  if (balancedEdge < 0) return <GuideBlocks blocks={blocks} />;
  return (
    <>
      <GuideBlocks blocks={blocks.slice(0, balancedEdge + 1)} />
      <div className="ordo-text-art-columns">
        <div><GuideBlocks blocks={blocks.slice(balancedEdge + 1)} /></div>
        <img
          src="/ORDO_sword%20and%20scale.png"
          alt="ORDO sword and scales"
          width="1254"
          height="1254"
          loading="lazy"
        />
      </div>
    </>
  );
}

function DiviospecBlocks({ blocks }: { blocks: GuideBlock[] }) {
  const groups: { heading: string; blocks: GuideBlock[] }[] = [];
  const introduction: GuideBlock[] = [];
  for (const block of blocks) {
    if (block.type === "heading") groups.push({ heading: block.text, blocks: [] });
    else if (groups.length) groups[groups.length - 1].blocks.push(block);
    else introduction.push(block);
  }
  return (
    <>
      <GuideBlocks blocks={introduction} />
      {groups.map((group) => (
        <div className="ordo-diviospec" key={group.heading}>
          <h3>{group.heading}</h3>
          <div className="ordo-diviospec-columns">
            <div><GuideBlocks blocks={group.blocks.filter((block) => block.type === "image")} /></div>
            <div><GuideBlocks blocks={group.blocks.filter((block) => block.type !== "image")} /></div>
          </div>
        </div>
      ))}
    </>
  );
}

function MatriarchBlocks({ blocks }: { blocks: GuideBlock[] }) {
  const nextHeading = blocks.findIndex((block) => block.type === "heading");
  const splitAt = nextHeading < 0 ? blocks.length : nextHeading;
  return (
    <>
      <div className="ordo-text-art-columns">
        <div><GuideBlocks blocks={blocks.slice(0, splitAt)} /></div>
        <img
          src="/art_matriarch%20class.png"
          alt="Matriarch-class ORDO war galleon"
          width="1536"
          height="1024"
          loading="lazy"
        />
      </div>
      <GuideBlocks blocks={blocks.slice(splitAt)} />
    </>
  );
}

function EquipmentBlocks({ blocks }: { blocks: GuideBlock[] }) {
  const result = [];
  let cursor = 0;
  while (cursor < blocks.length) {
    const block = blocks[cursor];
    const artwork = block.type === "heading" ? itemArtwork[block.text] : undefined;
    if (!artwork || block.type !== "heading") {
      let end = cursor + 1;
      while (end < blocks.length) {
        const next = blocks[end];
        if (next.type === "heading" && itemArtwork[next.text]) break;
        end++;
      }
      result.push(<GuideBlocks key={cursor} blocks={blocks.slice(cursor, end)} />);
      cursor = end;
      continue;
    }
    let end = cursor + 1;
    while (end < blocks.length) {
      const next = blocks[end];
      if (next.type === "heading" && !["Pocket of Holding", "Scroll File"].includes(next.text)) break;
      end++;
    }
    result.push(
      <div className="ordo-item" key={cursor}>
        <h3>{block.text}</h3>
        <div className="ordo-text-art-columns">
          <div><GuideBlocks blocks={blocks.slice(cursor + 1, end)} /></div>
          <img src={artwork.src} alt={artwork.alt} width="1024" height="1024" loading="lazy" />
        </div>
      </div>
    );
    cursor = end;
  }
  return result;
}

function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  return blocks.map((block, index) => {
    if (block.type === "image") {
      return <img key={index} className={block.fullWidth ? "ordo-guide-banner" : "ordo-guide-emblem"} src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" />;
    }
    if (block.type === "table") {
      return (
        <div className="table-wrap" key={index} tabIndex={0} role="region" aria-label={block.caption}>
          <table className="ordo-guide-table">
            <caption>{block.caption}</caption>
            <thead><tr>{block.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => cellIndex === 0
                ? <th scope="row" key={cellIndex}>{cell}</th>
                : <td key={cellIndex}>{cell}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
    }
    if (block.type === "heading") {
      if (block.text === "The City of Sigil") {
        return (
          <div className="inline-actions ordo-guide-sigil-heading" key={index}>
            <h3>{block.text}</h3>
            <Link className="button button-secondary button-small" href="/lore/city-of-doors-guide">
              City of Doors Guide
            </Link>
          </div>
        );
      }
      return <h3 key={index}>{block.text}</h3>;
    }
    if (block.type === "list") {
      if (index > 0 && blocks[index - 1].type === "list") return null;
      const items = [];
      for (let next = index; next < blocks.length; next++) {
        const item = blocks[next];
        if (item.type !== "list") break;
        items.push(<li key={next}>{item.text}</li>);
      }
      return <ul key={index}>{items}</ul>;
    }
    return <p key={index}>{block.text}</p>;
  });
}

export function OrdoGuide() {
  return (
    <div className="stack quests-guide-page ordo-guide" id="ordo-guide-top">
      <header className="panel stack quests-guide-header ordo-guide-header">
        <p className="eyebrow"><RainbowSpellbook /> Lore Guides</p>
        <h1 className="ordo-guide-logo">
          <img src="/ORDO-logo-large.png" alt="ORDO Guide" width="1024" height="1024" />
        </h1>
        <Link className="button button-secondary button-small" href="/#lore-guides">
          Back to SPELLBOOK Lore Guides
        </Link>
      </header>
      <article className="panel quests-guide-copy">
        {sections.map((section) => (
          <section id={section.id} key={section.id}>
            {section.id === "planescape-in-a-nutshell" && (
              <>
              <img
                className="ordo-guide-planes"
                src="/The%20Planes.png"
                alt="The planes of the multiverse"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <hr className="ordo-guide-planes-divider" />
              </>
            )}
            <h2>{section.title}</h2>
            {section.id === "the-diviospecs-the-big-five"
              ? <DiviospecBlocks blocks={section.blocks} />
              : section.id === "planescape-in-a-nutshell"
              ? <PlanescapeBlocks blocks={section.blocks} />
              : section.id === "matriarch-class-ships"
              ? <MatriarchBlocks blocks={section.blocks} />
              : section.id === "ordo-specific-equipment"
              ? <EquipmentBlocks blocks={section.blocks} />
              : <GuideBlocks blocks={section.blocks} />}
            {section.id === "the-brass" && (
              <img
                className="ordo-guide-brass"
                src="/the-brass.png"
                alt="The Brass gathered around the ORDO council table"
                width="1198"
                height="703"
                loading="lazy"
              />
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
