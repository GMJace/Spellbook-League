import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loreGuides } from "@/lib/lore-guides";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = loreGuides.find((entry) => entry.slug === slug);
  if (!guide) notFound();
  return { title: `${guide.label} | SPELLBOOK` };
}

export default async function LoreGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = loreGuides.find((entry) => entry.slug === slug);
  if (!guide) notFound();

  return (
    <section className="panel stack quests-guide-copy">
      <h1>{guide.label}</h1>
      <p>This guide is coming soon.</p>
      <Link href="/#lore-guides">Back to SPELLBOOK Lore Guides</Link>
    </section>
  );
}
