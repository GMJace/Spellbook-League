import { DND_SKILLS, DND_TOOLS, serializeSkillSelections, type SkillSelectionRank } from "@/lib/character";
import { deriveDndBeyondStats, getActiveDndBeyondModifiers, DDB_SKILL_IDS, type DndBeyondDerivedStats } from "@/lib/dnd-beyond-derived-stats";

const hosts = new Set(["dndbeyond.com", "www.dndbeyond.com", "ddb.ac", "www.ddb.ac"]);
const MAX_BYTES = 10 * 1024 * 1024;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const rows = (value: unknown): RecordValue[] => Array.isArray(value) ? value.map(record) : [];
const string = (value: unknown) => typeof value === "string" ? value.trim() : "";
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const id = (value: unknown) => typeof value === "number" || typeof value === "string" ? String(value) : "";
// Descriptions are rendered as text, never injected as HTML.
const plainText = (value: unknown) => string(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export type DndBeyondInventoryItem = {
  id: string; name: string; originalName: string; quantity: number;
  equipped: boolean; attuned: boolean; container: string; containerId: string | null;
  type: string; rarity: string; weight: number | null; magic: boolean;
  consumable: boolean; custom: boolean; notes: string; description: string;
};
export type DndBeyondCharacterImport = DndBeyondDerivedStats & {
  characterSheetLink: string; name: string;
  class1Name: string; class1Level: number; class1Subclass: string | null;
  class2Name: string | null; class2Level: number | null; class2Subclass: string | null;
  class3Name: string | null; class3Level: number | null; class3Subclass: string | null;
  feats?: string; proficiencies?: string; tools?: string; languages?: string;
  customSkills: { name: string; rank: string }[];
  featNames?: string[]; toolNames?: string[]; languageNames?: string[];
  inventory: DndBeyondInventoryItem[]; species: string; background: string;
  currencies: Record<string, number>; spells: { name: string; level: number | null }[];
  warnings: string[];
};

export function parseDndBeyondLink(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a full HTTPS D&D Beyond character share link."); }
  if (url.protocol !== "https:" || !hosts.has(url.hostname.toLowerCase()) || url.port || url.username || url.password) {
    throw new Error("Use an HTTPS character share link from dndbeyond.com or ddb.ac.");
  }
  return url;
}

export function isDndBeyondLink(input: string | null | undefined) {
  try { return Boolean(input && parseDndBeyondLink(input)); } catch { return false; }
}

async function readJson(response: Response) {
  if (!response.body) throw new Error("D&D Beyond returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_BYTES) throw new Error("The D&D Beyond response was too large to import.");
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new Error("D&D Beyond did not return readable character data."); }
}

export function parseDndBeyondCharacter(payload: unknown, characterId: string): DndBeyondCharacterImport {
  const envelope = record(payload);
  const data = record(envelope.data);
  if (envelope.success !== true || id(data.id) !== characterId || !string(data.name)) {
    throw new Error("D&D Beyond did not return the requested character. Check that the sheet is Public.");
  }
  // A missing list is not an empty inventory. Reject partial responses rather than erase saved items.
  if (!Array.isArray(data.inventory) || !Array.isArray(data.classes) || !data.classes.length ||
      (data.customItems != null && !Array.isArray(data.customItems))) {
    throw new Error("D&D Beyond returned incomplete character data. Saved details and inventory were kept.");
  }
  const classes = rows(data.classes).map(entry => ({
    name: string(record(entry.definition).name), level: number(entry.level),
    subclass: string(record(entry.subclassDefinition).name) || null,
  }));
  if (classes.length > 3 || classes.some(entry => !entry.name || !entry.level || !Number.isInteger(entry.level) || entry.level < 1 || entry.level > 20)) {
    throw new Error("This character's class breakdown cannot be represented in SPELLBOOK's three class slots.");
  }
  const customizations = rows(data.characterValues);
  const inventory: DndBeyondInventoryItem[] = [];
  for (const [custom, entries] of [[false, rows(data.inventory)], [true, rows(data.customItems)]] as const) {
    for (const entry of entries) {
      const definition = custom ? entry : record(entry.definition);
      const sourceId = id(entry.id);
      const originalName = string(definition.name);
      if (!sourceId || !originalName) throw new Error("D&D Beyond returned an incomplete inventory item. Saved inventory was kept.");
      const overrides = customizations.filter(value => id(value.valueId) === sourceId && id(value.valueTypeId) === id(entry.entityTypeId));
      const name = string(overrides.find(value => value.typeId === 8)?.value) || originalName;
      const quantity = number(entry.quantity) ?? 1;
      if (!Number.isInteger(quantity) || quantity < 0) throw new Error("D&D Beyond returned an invalid item quantity.");
      const containerId = id(entry.containerEntityId);
      inventory.push({
        id: `${custom ? "custom" : "item"}:${sourceId}`, name, originalName, quantity,
        equipped: entry.equipped === true, attuned: entry.isAttuned === true,
        containerId: containerId && containerId !== characterId ? containerId : null,
        container: "Carried", type: string(definition.filterType) || string(definition.type) || (custom ? "Custom item" : "Equipment"),
        rarity: string(definition.rarity), weight: number(definition.weight), magic: definition.magic === true,
        consumable: definition.isConsumable === true, custom,
        notes: plainText(overrides.find(value => value.typeId === 9)?.value ?? entry.notes),
        description: plainText(definition.description),
      });
    }
  }
  const uniqueIds = new Set(inventory.map(item => item.id));
  if (uniqueIds.size !== inventory.length) throw new Error("D&D Beyond returned duplicate inventory identifiers.");
  const itemNames = new Map(inventory.filter(item => !item.custom).map(item => [item.id.slice(5), item.name]));
  for (const item of inventory) {
    if (item.containerId) item.container = itemNames.get(item.containerId) ?? "Other container";
  }
  const result: DndBeyondCharacterImport = {
    characterSheetLink: `https://www.dndbeyond.com/characters/${characterId}`, name: string(data.name),
    class1Name: classes[0].name, class1Level: classes[0].level!, class1Subclass: classes[0].subclass,
    class2Name: classes[1]?.name ?? null, class2Level: classes[1]?.level ?? null, class2Subclass: classes[1]?.subclass ?? null,
    class3Name: classes[2]?.name ?? null, class3Level: classes[2]?.level ?? null, class3Subclass: classes[2]?.subclass ?? null,
    inventory, species: string(record(data.race).fullName) || string(record(data.race).baseName),
    background: string(record(record(data.background).customBackground).name) || string(record(record(data.background).definition).name),
    currencies: {}, spells: [], customSkills: [], ...deriveDndBeyondStats(data),
  };
  if (Array.isArray(data.feats)) {
    result.featNames = [...new Set(rows(data.feats).map(feat => string(record(feat.definition).name)).filter(Boolean))];
    result.feats = JSON.stringify(result.featNames);
  }
  // Include equipped/attuned item grants, but never inactive inventory bonuses.
  if (data.modifiers && typeof data.modifiers === "object") {
    const modifiers = getActiveDndBeyondModifiers(data);
    const skills: Record<string, SkillSelectionRank> = {};
    const tools: Record<string, true> = {};
    const languages: Record<string, true> = {};
    for (const modifier of modifiers) {
      const rawName = string(modifier.friendlySubtypeName);
      const name = [...DND_SKILLS, ...DND_TOOLS].find(entry => entry.name.toLowerCase().replace(/[’']/g, "") === rawName.toLowerCase().replace(/[’']/g, ""))?.name || rawName;
      if (!name || name.startsWith("Choose ")) continue;
      if (modifier.type === "language") languages[name] = true;
      if (modifier.type !== "proficiency" && modifier.type !== "expertise") continue;
      if (DND_SKILLS.some(skill => skill.name === name) && skills[name] !== "expertise") skills[name] = modifier.type === "expertise" ? "expertise" : "proficiency";
      if (DND_TOOLS.some(tool => tool.name === name)) tools[name] = true;
    }
    for (const [name, skillId] of Object.entries(DDB_SKILL_IDS)) {
      const override = customizations.find(value => value.typeId === 26 && id(value.valueId) === String(skillId));
      if (override?.value === 4) skills[name] = "expertise";
      else if (override?.value === 3) skills[name] = "proficiency";
      else if (override?.value === 1 || override?.value === 2) delete skills[name];
    }
    for (const proficiency of rows(data.customProficiencies)) {
      const name = string(proficiency.name);
      if (proficiency.type === 1 && name) result.customSkills.push({ name, rank: ({ 1: "Not proficient", 2: "Half proficiency", 3: "Proficiency", 4: "Expertise" } as Record<number, string>)[number(proficiency.proficiencyLevel) ?? 1] || "Not proficient" });
    }
    result.proficiencies = serializeSkillSelections(skills);
    result.toolNames = Object.keys(tools).sort();
    result.languageNames = Object.keys(languages).sort();
    result.tools = JSON.stringify(result.toolNames);
    result.languages = JSON.stringify(result.languageNames);
  }
  for (const currency of ["cp", "sp", "ep", "gp", "pp"]) {
    const value = number(record(data.currencies)[currency]);
    if (value != null && value >= 0) result.currencies[currency] = value;
  }
  const spells = [...rows(data.classSpells).flatMap(group => rows(group.spells)), ...Object.values(record(data.spells)).flatMap(rows)];
  const spellNames = new Set<string>();
  for (const spell of spells) {
    const definition = record(spell.definition);
    const name = string(definition.name);
    if (name && !spellNames.has(name)) { spellNames.add(name); result.spells.push({ name, level: number(definition.level) }); }
  }
  result.spells.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
  return result;
}

export async function importCharacterFromDndBeyondLink(input: string): Promise<DndBeyondCharacterImport> {
  let url = parseDndBeyondLink(input);
  const signal = AbortSignal.timeout(15_000);
  let characterId = url.pathname.match(/^\/(?:profile\/[^/]+\/)?characters\/(\d+)\/?$/)?.[1];
  try {
    // Resolve only allowlisted share redirects; never fetch arbitrary URLs supplied by a user.
    for (let redirects = 0; !characterId && redirects < 4; redirects++) {
      const response = await fetch(url, { redirect: "manual", cache: "no-store", signal });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      url = parseDndBeyondLink(new URL(location, url).toString());
      characterId = url.pathname.match(/^\/(?:profile\/[^/]+\/)?characters\/(\d+)\/?$/)?.[1];
    }
    if (!characterId) throw new Error("Use the character's full D&D Beyond share link, including /characters/ and its number.");
    const response = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${characterId}`, {
      cache: "no-store", redirect: "error", signal, headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      await response.body?.cancel();
      if ([401, 403, 404].includes(response.status)) throw new Error("D&D Beyond could not share this character. Set Character Privacy to Public, then try again.");
      if (response.status === 429) throw new Error("D&D Beyond is limiting requests. Please try again later.");
      throw new Error("D&D Beyond is temporarily unavailable. Saved details and inventory were kept.");
    }
    return parseDndBeyondCharacter(await readJson(response), characterId);
  } catch (error) {
    if (signal.aborted) throw new Error("D&D Beyond took too long to respond. Saved details and inventory were kept.");
    throw error;
  }
}
