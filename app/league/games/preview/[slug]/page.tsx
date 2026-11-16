import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { questboardExamples } from "@/lib/questboard-preview";

export default async function QuestboardPreviewDetails({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { slug } = await params;
  const quest = questboardExamples.find((example) => example.slug === slug);
  if (!quest) notFound();

  return (
    <section className="panel stack">
      <p className="eyebrow">Questboard preview</p>
      <h1>{quest.title}</h1>
      <p>{quest.gm}</p>
      <p><LocalizedEventTime isoString={quest.dateTime} /></p>
      <p>{quest.description}</p>
      <p>This example is for layout testing.</p>
      <Link href="/?questboard=preview#current-open-quests">Back to the questboard</Link>
    </section>
  );
}
