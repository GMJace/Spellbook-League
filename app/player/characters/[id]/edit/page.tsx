import { CharacterEditContent } from "@/components/character-edit-page-content";

export const dynamic = "force-dynamic";

export default function EditCharacterPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string; message?: string }>;
}) {
  return CharacterEditContent(props);
}
