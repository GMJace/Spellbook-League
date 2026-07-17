import { HandbookTabs } from "@/components/handbook-tabs";
import { getHandbooks } from "@/lib/data";

export default async function HandbooksPage() {
  const handbooks = await getHandbooks();

  return (
    <main className="panel stack">
      <div>
        <p className="eyebrow">League reference</p>
        <h1>Handbooks</h1>
        <p className="muted">
          Review the Player&apos;s Guide, DM&apos;s Guide, and Publisher&apos;s
          Guide in a single tabbed view.
        </p>
      </div>
      <HandbookTabs handbooks={handbooks} />
    </main>
  );
}
