// D&D Beyond v5 supplies components rather than the totals displayed by its sheet.
// Keep these calculations separate from fetching and persistence so they can be
// checked against public sheets and synthetic equipment/override combinations.
type Row = Record<string, unknown>;
export const asRow = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
export const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.map(asRow) : [];
const num = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const text = (value: unknown) => typeof value === "string" ? value : "";
const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const abilityNames = ["", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
export const DDB_SKILL_IDS: Record<string, number> = { Athletics: 2, Acrobatics: 3, "Sleight of Hand": 4, Stealth: 5, Arcana: 6, History: 7, Investigation: 8, Nature: 9, Religion: 10, "Animal Handling": 11, Insight: 12, Medicine: 13, Perception: 14, Survival: 15, Deception: 16, Intimidation: 17, Performance: 18, Persuasion: 19 };

type Modifier = Row & { source: string; sourceItem?: Row };
export function getActiveDndBeyondModifiers(data: Row): Modifier[] {
  const classes = asRows(data.classes);
  const options = Object.values(asRow(data.options)).flatMap(asRows);
  const choices = Object.values(asRow(data.choices)).flatMap(asRows);
  const modifiers: Modifier[] = [];
  for (const [source, entries] of Object.entries(asRow(data.modifiers))) {
    if (source === "item") continue; // This group includes unequipped/unattuned gear.
    for (const modifier of asRows(entries)) {
      if (source === "class") {
        const owner = classes.find(c => asRows(c.classFeatures).some(f => same(asRow(f.definition).id, modifier.componentId)));
        const feature = asRows(owner?.classFeatures).find(f => same(asRow(f.definition).id, modifier.componentId));
        if (owner && (num(asRow(feature?.definition).requiredLevel) ?? 0) > (num(owner.level) ?? 0)) continue;
      }
      // Selected option modifiers (including activated Bladesong) are retained;
      // the isGranted flag alone is not a selection flag for skills or ASIs.
      const option = options.find(o => same(asRow(o.definition).id, modifier.componentId));
      if (option) {
        const relevant = choices.filter(c => same(c.componentId, option.componentId));
        if (relevant.length && !relevant.some(c => same(c.optionValue, modifier.componentId))) continue;
      }
      modifiers.push({ ...modifier, source });
    }
  }
  for (const item of asRows(data.inventory)) {
    const definition = asRow(item.definition);
    if (!(item.equipped === true || definition.canEquip === false) || (num(item.quantity) ?? 1) <= 0) continue;
    for (const modifier of asRows(definition.grantedModifiers)) {
      if ((definition.canAttune === true || modifier.requiresAttunement === true) && item.isAttuned !== true) continue;
      modifiers.push({ ...modifier, source: "item", sourceItem: item });
    }
  }
  return modifiers;
}

export type DndBeyondDerivedStats = {
  hitPoints?: number; currentHitPoints?: number; temporaryHitPoints?: number;
  armorClass?: number; passivePerception?: number; spellSaveDc?: number | null;
  blindsightFt?: number | null; darkvisionFt?: number | null;
  tremorsenseFt?: number | null; truesightFt?: number | null;
  spellSaveDcs: { name: string; dc: number }[];
  senseNotes: string[]; warnings: string[];
};

export function deriveDndBeyondStats(data: Row, modifiers = getActiveDndBeyondModifiers(data)): DndBeyondDerivedStats {
  const result: DndBeyondDerivedStats = { warnings: [], spellSaveDcs: [], senseNotes: [] };
  const classes = asRows(data.classes);
  const level = sum(classes.map(c => num(c.level) ?? 0));
  const values = asRows(data.characterValues);
  const custom = (typeId: number, valueId?: number) => num(values.find(v => v.typeId === typeId && (valueId === undefined || same(v.valueId, valueId)))?.value);
  const completeModifiers = data.modifiers != null && typeof data.modifiers === "object";
  const unrestricted = (m: Modifier) => !text(m.restriction).trim();
  const matching = (type: string, subType: string) => modifiers.filter(m => m.type === type && m.subType === subType);
  const abilities: Record<number, number | undefined> = {};
  const backgroundAsi = asRows(asRow(asRow(data.background).definition).grantedFeats).some(f => /ability score/i.test(text(f.name)));
  for (let stat = 1; stat <= 6; stat++) {
    const override = num(asRows(data.overrideStats).find(s => s.id === stat)?.value);
    if (override !== undefined) { abilities[stat] = override; continue; }
    const base = num(asRows(data.stats).find(s => s.id === stat)?.value);
    if (base === undefined || !completeModifiers) continue;
    const subtype = `${abilityNames[stat]}-score`;
    const bonuses = matching("bonus", subtype).filter(m => !(backgroundAsi && m.source === "race"));
    let cap = 20 + sum(matching("bonus", "ability-score-maximum").filter(m => m.statId === stat && unrestricted(m)).map(m => num(m.value) ?? 0));
    let bonus = 0;
    let uncertain = false;
    for (const m of bonuses) {
      const restriction = text(m.restriction);
      const maximum = restriction.match(/(?:maximum (?:is now|of)|maximum score of)\s*(\d+)/i);
      if (maximum) cap = Math.max(cap, Number(maximum[1]));
      else if (restriction && !/^\+\d+ to (?:score maximum|maximum score)|Can't be an Ability Score|That you do not have Saving Throw Proficiency/i.test(restriction)) { uncertain = true; continue; }
      const raisedCap = restriction.match(/^\+(\d+) to (?:score maximum|maximum score)/i);
      if (raisedCap) cap += Number(raisedCap[1]);
      bonus += num(m.value) ?? 0;
    }
    if (uncertain) continue;
    const set = matching("set", subtype).filter(m => unrestricted(m) || text(m.restriction).toLowerCase() === "if not already higher").map(m => num(m.value) ?? 0);
    abilities[stat] = Math.max(Math.min(cap, base + bonus) + (num(asRows(data.bonusStats).find(s => s.id === stat)?.value) ?? 0), ...set);
  }
  const abilityMod = (stat: number) => abilities[stat] === undefined ? undefined : Math.floor((abilities[stat]! - 10) / 2);
  const modifierValue = (m: Modifier): number | undefined => num(m.value) ?? (num(m.statId) ? abilityMod(num(m.statId)!) : undefined);
  const total = (mods: Modifier[]) => sum(mods.map(m => modifierValue(m) ?? 0));
  const pb = num(data.proficiencyBonus) ?? (2 + Math.floor((level - 1) / 4) + total(matching("bonus", "proficiency-bonus").filter(unrestricted)));

  result.hitPoints = num(data.overrideHitPoints) ?? num(data.maxHitPoints);
  const con = abilityMod(3);
  if (result.hitPoints === undefined && num(data.baseHitPoints) !== undefined && con !== undefined && completeModifiers) {
    const perLevel = matching("bonus", "hit-points-per-level");
    const fixed = matching("bonus", "hit-points").filter(m => !m.dice && num(m.value) !== undefined);
    if ([...perLevel, ...fixed].every(unrestricted)) {
      const bonus = sum(perLevel.map(m => {
        const owner = m.source === "class" ? classes.find(c => asRows(c.classFeatures).some(f => same(asRow(f.definition).id, m.componentId))) : undefined;
        return (modifierValue(m) ?? 0) * (owner ? num(owner.level) ?? level : level);
      }));
      result.hitPoints = Math.max(1, num(data.baseHitPoints)! + con * level + bonus + total(fixed) + (num(data.bonusHitPoints) ?? 0));
    }
  }
  if (result.hitPoints !== undefined && num(data.removedHitPoints) !== undefined) result.currentHitPoints = Math.max(0, result.hitPoints - num(data.removedHitPoints)!);
  result.temporaryHitPoints = num(data.temporaryHitPoints);

  result.armorClass = custom(1) ?? num(data.armorClass);
  const dex = abilityMod(2);
  if (result.armorClass === undefined && dex !== undefined && completeModifiers) {
    const armor = asRows(data.inventory).filter(i => i.equipped === true && (num(i.quantity) ?? 1) > 0 && asRow(i.definition).filterType === "Armor");
    const suits = armor.filter(i => asRow(i.definition).armorTypeId !== 4);
    const shields = armor.filter(i => asRow(i.definition).armorTypeId === 4);
    const unarmored = suits.length === 0;
    const hasShield = shields.length > 0;
    let uncertain = suits.length > 1 || shields.length > 1;
    const applies = (m: Modifier) => {
      const restriction = text(m.restriction).trim().toLowerCase();
      if (!restriction) return true;
      if (m.sourceItem && /^while (?:holding|wielding|wearing) (?:the|this) /.test(restriction)) return true;
      if (/^(?:while|when) (?:you are |you're )?(?:wearing armor|armored)\.?$/.test(restriction)) return !unarmored;
      if (/^(?:while|when) (?:you are |you're )?(?:not wearing armor|unarmored)\.?$/.test(restriction)) return unarmored;
      if (/not wearing armor.*(?:not |nor |or )?(?:using|wielding).*shield/.test(restriction)) return unarmored && !hasShield;
      uncertain = true;
      return false;
    };
    const bases = [10 + dex];
    const equippedArmorBonus = (item: Row) => total(modifiers.filter(m => m.sourceItem === item && m.type === "bonus" && m.subType === "armor-class" && applies(m)));
    // sourceItem references come from the same payload objects (asRow does not clone).
    if (!unarmored) {
      const definition = asRow(suits[0].definition);
      const type = num(definition.armorTypeId);
      const base = num(definition.armorClass);
      if (base === undefined || ![1, 2, 3].includes(type ?? 0)) uncertain = true;
      const mediumCap = Math.max(2, ...matching("set", "ac-max-dex-armored-modifier").filter(applies).map(m => num(m.value) ?? 2));
      bases.splice(0, bases.length, (base ?? 10) + (type === 3 ? 0 : type === 2 ? Math.min(dex, mediumCap) : dex) + equippedArmorBonus(suits[0]));
    } else {
      for (const m of matching("set", "unarmored-armor-class").filter(applies)) {
        const owner = m.source === "class" ? classes.find(c => asRows(c.classFeatures).some(f => same(asRow(f.definition).id, m.componentId))) : undefined;
        if (hasShield && text(asRow(owner?.definition).name) === "Monk") continue;
        const related = modifiers.filter(other => other.source === m.source && same(other.componentId, m.componentId));
        const ignoreDex = related.some(other => other.type === "ignore" && other.subType === "unarmored-dex-ac-bonus");
        const cap = Math.min(20, ...related.filter(other => other.subType === "ac-max-dex-modifier").map(other => num(other.value) ?? 20));
        const extra = modifierValue(m);
        if (extra === undefined) { uncertain = true; continue; }
        bases.push(10 + (ignoreDex ? 0 : Math.min(dex, cap)) + extra);
      }
    }
    for (const m of matching("set", "minimum-base-armor").filter(applies)) if (num(m.value) !== undefined) bases.push(num(m.value)!);
    const shieldAC = sum(shields.map(i => (num(asRow(i.definition).armorClass) ?? 2) + equippedArmorBonus(i)));
    const misc = matching("bonus", "armor-class").filter(m => !m.sourceItem || !armor.includes(m.sourceItem)).filter(applies);
    const armorBonuses = matching("bonus", unarmored ? "unarmored-armor-class" : "armored-armor-class").filter(m => !unarmored || !hasShield).filter(applies);
    if ([...misc, ...armorBonuses].some(m => modifierValue(m) === undefined)) uncertain = true;
    if (!uncertain) result.armorClass = Math.max(...bases) + shieldAC + total(misc) + total(armorBonuses) + (custom(2) ?? 0) + (custom(3) ?? 0);
  }

  result.passivePerception = num(data.passivePerception);
  const perceptionAbility = custom(27, 14) ?? 5;
  const wis = abilityMod(perceptionAbility);
  if (result.passivePerception === undefined && wis !== undefined && completeModifiers) {
    let rank = matching("expertise", "perception").length ? 2 : matching("proficiency", "perception").length ? 1 : 0;
    const overrideRank = custom(26, 14);
    if (overrideRank !== undefined) rank = ({ 1: 0, 2: 0.5, 3: 1, 4: 2 } as Record<number, number>)[overrideRank] ?? rank;
    else if (rank === 0 && modifiers.some(m => m.type === "half-proficiency" && ["ability-checks", "perception", "wisdom-ability-checks"].includes(text(m.subType)))) rank = 0.5;
    const bonuses = modifiers.filter(m => m.type === "bonus" && ["perception", "passive-perception", "ability-checks", `${abilityNames[perceptionAbility]}-ability-checks`].includes(text(m.subType)));
    if (bonuses.every(unrestricted)) {
      const advantage = modifiers.some(m => m.type === "advantage" && ["perception", "ability-checks", `${abilityNames[perceptionAbility]}-ability-checks`].includes(text(m.subType)) && unrestricted(m));
      const disadvantage = modifiers.some(m => m.type === "disadvantage" && ["perception", "ability-checks", `${abilityNames[perceptionAbility]}-ability-checks`].includes(text(m.subType)) && unrestricted(m));
      result.passivePerception = 10 + wis + Math.floor(pb * rank) + total(bonuses) + (custom(24, 14) ?? 0) + (custom(25, 14) ?? 0) + (advantage === disadvantage ? 0 : advantage ? 5 : -5);
    }
  }

  result.spellSaveDc = num(data.spellSaveDc) ?? num(data.spellSaveDC);
  let casterMissing = false;
  for (const c of classes) {
    const definition = asRow(c.definition);
    const subclass = asRow(c.subclassDefinition);
    const ability = num(subclass.spellCastingAbilityId) ?? num(definition.spellCastingAbilityId);
    if (!ability) {
      if (definition.canCastSpells === true || subclass.canCastSpells === true) casterMissing = true;
      continue;
    }
    const mod = abilityMod(ability);
    const subtype = `${text(definition.name).toLowerCase().replace(/\s+/g, "-")}-spell-save-dc`;
    const bonuses = modifiers.filter(m => m.type === "bonus" && ["spell-save-dc", subtype].includes(text(m.subType)));
    if (mod === undefined || !completeModifiers || !bonuses.every(unrestricted)) { casterMissing = true; continue; }
    result.spellSaveDcs.push({ name: text(definition.name), dc: 8 + pb + mod + total(bonuses) });
  }
  if (result.spellSaveDc === undefined && !casterMissing && completeModifiers) result.spellSaveDc = result.spellSaveDcs.length ? Math.max(...result.spellSaveDcs.map(c => c.dc)) : null;

  if (completeModifiers && Array.isArray(data.customSenses)) {
    for (const [index, sense] of ["blindsight", "darkvision", "tremorsense", "truesight"].entries()) {
      const field = `${sense}Ft` as "blindsightFt" | "darkvisionFt" | "tremorsenseFt" | "truesightFt";
      const base = modifiers.filter(m => ["set-base", "set"].includes(text(m.type)) && m.subType === sense);
      const extra = modifiers.filter(m => ["sense", "bonus"].includes(text(m.type)) && m.subType === sense);
      const override = asRows(data.customSenses).find(s => s.senseId === index + 1);
      if (override && num(override.distance) === undefined) { result.senseNotes.push(`${sense}: ${text(override.distance)}`); continue; }
      const conditional = [...base, ...extra].filter(m => !unrestricted(m) && !/plus \d+ feet if wearer already has darkvision|you can see normally in darkness/i.test(text(m.restriction)));
      if (conditional.length) { result.warnings.push(`Check ${sense}: its D&D Beyond bonus has a condition.`); continue; }
      const range = num(override?.distance) ?? Math.max(0, ...base.map(m => num(m.value) ?? 0)) + total(extra);
      if (Number.isInteger(range) && range >= 0 && range <= 2147483647) result[field] = range > 0 ? range : null;
      else result.warnings.push(`Could not determine ${sense} from D&D Beyond. Your saved value was kept.`);
      for (const m of base) if (text(m.restriction)) result.senseNotes.push(text(m.restriction));
    }
  }
  for (const [field, label] of [["hitPoints", "maximum HP"], ["armorClass", "AC"], ["passivePerception", "passive Perception"], ["spellSaveDc", "spell save DC"]] as const) {
    const value = result[field];
    if (value !== undefined && value !== null && (!Number.isInteger(value) || value < 0 || value > 2147483647)) delete result[field];
    if (result[field] === undefined) result.warnings.push(`Could not determine ${label} from D&D Beyond. Your saved value was kept.`);
  }
  return result;
}
