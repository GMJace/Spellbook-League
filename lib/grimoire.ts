export type GrimoireTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

export type SeasonEvent = {
  id: string;
  label: string;
  subtitle: string;
  date: string;
  displayDate: string;
  theme: string;
  themeDetails: string[];
  focus: string;
  ticketLabel: string;
  ticketPrice: string;
  ticketPriceUsd: number;
  finale?: boolean;
};

export type GrimoireParticipant = {
  name: string;
  character: string;
};

export type GrimoireGame = {
  eventId: string;
  slug: string;
  game: string;
  summary: string;
  details: string[];
  adventureImagePath?: string | null;
  startAt: string;
  dm: string;
  tier: GrimoireTier;
  ticketPrice: string;
  ticketPriceUsd: number;
  seatCapacity: number;
  signedUp: GrimoireParticipant[];
  waitlist: GrimoireParticipant[];
  gameCode?: string | null;
  isSubmission?: boolean;
};

export type GrimoireEventSlot = {
  eventId: string;
  label: string;
  startAt: string;
};

export const grimoireEventTicketNotice =
  "Ticket prices for each game may vary. You must purchase an event badge to be able to purchase tickets.";

export const seasonSchedule: SeasonEvent[] = [
  {
    id: "ggcon-2026-09",
    label: "September",
    subtitle: "Season Kickoff : Grim Tidings",
    date: "2026-09-18T18:00:00-06:00",
    displayDate: "September 18-20, 2026",
    theme: "Grim Tidings",
    themeDetails: [
      "The season opens with ominous omens, whispered prophecies, and uneasy alliances forming across the realm.",
      "Adventures lean into mysteries, haunted roads, cursed archives, and dangerous discoveries that hint at the season's larger story.",
      "Players can expect a mix of eerie atmosphere, faction tension, and the first major choices that shape the months ahead.",
    ],
    focus: "Game tickets are sold separately. Prices vary by game.",
    ticketLabel: "EVENT BADGE",
    ticketPrice: "$9 USD",
    ticketPriceUsd: 9,
  },
  {
    id: "ggcon-2026-10",
    label: "October",
    subtitle: "Harvest of Heroes",
    date: "2026-10-17T18:00:00-06:00",
    displayDate: "October 17, 2026",
    theme: "Harvest of Heroes",
    themeDetails: [
      "Autumn festivals and frontier settlements become gathering points for brave parties and hidden threats.",
      "This event spotlights heroic rescues, harvest rites gone wrong, and community-centered adventures with supernatural twists.",
      "Expect a strong blend of seasonal flavor, celebratory set pieces, and rising danger beneath the surface.",
    ],
    focus: "Season story hooks deepen with spooky side quests and community challenges.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$18 USD",
    ticketPriceUsd: 18,
  },
  {
    id: "ggcon-2026-11",
    label: "November",
    subtitle: "Legends Rising",
    date: "2026-11-14T18:00:00-07:00",
    displayDate: "November 14, 2026",
    theme: "Legends Rising",
    themeDetails: [
      "Returning heroes begin to earn reputations, while new tables step into larger-than-life adventures.",
      "The weekend emphasizes bold decisions, memorable NPCs, and tables that feel like the opening chapters of legends.",
      "Players should expect bigger stakes, stronger rivalries, and moments that elevate characters into local heroes.",
    ],
    focus: "Spotlight adventures for returning parties and first-time Dungeon Masters.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$18 USD",
    ticketPriceUsd: 18,
  },
  {
    id: "ggcon-2027-01",
    label: "January",
    subtitle: "Winter Reckoning",
    date: "2027-01-16T18:00:00-07:00",
    displayDate: "January 16, 2027",
    theme: "Winter Reckoning",
    themeDetails: [
      "Frozen roads, desperate strongholds, and old grudges resurface as the new year begins.",
      "This event centers on survival, hard choices, and winter-forged adventures where every alliance matters.",
      "Expect harsher environments, grim confrontations, and momentum that pushes the season into its next chapter.",
    ],
    focus: "A new chapter begins with icy dungeons, rival factions, and boss encounters.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$20 USD",
    ticketPriceUsd: 20,
  },
  {
    id: "ggcon-2027-02",
    label: "February",
    subtitle: "Fireside Expeditions",
    date: "2027-02-20T18:00:00-07:00",
    displayDate: "February 20, 2027",
    theme: "Fireside Expeditions",
    themeDetails: [
      "Travelers regroup around hearths, war rooms, and hidden lodges before launching into fresh expeditions.",
      "The tone mixes camaraderie and danger, with roleplay-heavy scenes feeding directly into perilous missions.",
      "Players can look forward to character-driven tables, shared storytelling, and rewarding cross-table energy.",
    ],
    focus: "Roleplay-heavy tables, DM showcases, and cross-table rewards.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$20 USD",
    ticketPriceUsd: 20,
  },
  {
    id: "ggcon-2027-03",
    label: "March",
    subtitle: "Vaultbreak Weekend",
    date: "2027-03-20T18:00:00-06:00",
    displayDate: "March 20, 2027",
    theme: "Vaultbreak Weekend",
    themeDetails: [
      "Hidden troves, sealed sanctums, and dangerous hoards come to the forefront as factions make their move.",
      "This event highlights daring heists, puzzle-heavy delves, and high-stakes treasure runs with consequences.",
      "Expect clever play, fast momentum, and tables built around risk, reward, and dramatic reveals.",
    ],
    focus: "High-stakes treasure runs and escalating threats across the shared season.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$20 USD",
    ticketPriceUsd: 20,
  },
  {
    id: "ggcon-2027-04",
    label: "April",
    subtitle: "Storm Before the Finale",
    date: "2027-04-17T18:00:00-06:00",
    displayDate: "April 17, 2027",
    theme: "Storm Before the Finale",
    themeDetails: [
      "The season's biggest powers make their final preparations as tension builds toward the endgame.",
      "Adventures emphasize alliances, setup missions, betrayals, and the consequences of everything learned so far.",
      "Players should expect forward-driving tables with major story payoff and strong lead-in energy for the finale.",
    ],
    focus: "Final alliances, prep missions, and the lead-in to the season ender.",
    ticketLabel: "Weekend Pass",
    ticketPrice: "$22 USD",
    ticketPriceUsd: 22,
  },
  {
    id: "ggcon-2027-05",
    label: "May",
    subtitle: "Season Ender",
    date: "2027-05-08T18:00:00-06:00",
    displayDate: "May 8, 2027",
    theme: "Season Ender",
    themeDetails: [
      "Everything converges in a finale weekend built for climactic battles, shared consequences, and unforgettable moments.",
      "This event is designed to pay off the entire convention season through epic tables, major revelations, and community spectacle.",
      "Expect the biggest swings of the year, season-defining victories and losses, and a celebration of the whole campaign arc.",
    ],
    focus: "An epic early-May finale event with multi-table play and season-defining outcomes.",
    ticketLabel: "Finale Badge",
    ticketPrice: "$25 USD",
    ticketPriceUsd: 25,
    finale: true,
  },
];

export const grimoireGames: GrimoireGame[] = [
  {
    eventId: "ggcon-2026-09",
    slug: "emberwake-archive",
    game: "The Emberwake Archive",
    summary:
      "Recover a cache of forbidden records before a rival cabal turns the archive into a weapon.",
    details: [
      "An investigation-heavy dungeon crawl with magical traps and faction pressure.",
      "Best for players who enjoy unraveling clues, solving arcane hazards, and making quick tactical choices.",
      "Expect a mix of social scenes, tense exploration, and one climactic archive-room battle.",
    ],
    startAt: "2026-09-18T19:00:00-06:00",
    dm: "Trevor",
    tier: "TIER_1",
    ticketPrice: "$9 USD",
    ticketPriceUsd: 9,
    seatCapacity: 6,
    signedUp: [],
    waitlist: [],
  },
  {
    eventId: "ggcon-2026-09",
    slug: "moonlit-march-hollow-king",
    game: "Moonlit March of the Hollow King",
    summary:
      "Escort a haunted procession through moonlit ruins while bargaining with a restless monarch.",
    details: [
      "A roleplay-forward journey with eerie set pieces and opportunities to negotiate with the dead.",
      "Best for players who like dramatic choices, spooky atmosphere, and mythic travel scenes.",
      "Includes a final showdown where diplomacy and steel can both reshape the ending.",
    ],
    startAt: "2026-09-19T10:00:00-06:00",
    dm: "Jace",
    tier: "TIER_1",
    ticketPrice: "$10 USD",
    ticketPriceUsd: 10,
    seatCapacity: 6,
    signedUp: [],
    waitlist: [],
  },
  {
    eventId: "ggcon-2026-09",
    slug: "vault-verdant-flame",
    game: "Vault of the Verdant Flame",
    summary:
      "Race into a living treasury where every chamber grows more dangerous the longer you linger.",
    details: [
      "A treasure-hunt adventure with environmental pressure, timed decisions, and magical puzzles.",
      "Best for players who enjoy efficient play, bold risks, and high-reward problem solving.",
      "Features a changing map with multiple ways to secure loot and escape with the prize.",
    ],
    startAt: "2026-09-19T14:00:00-06:00",
    dm: "Kelsie",
    tier: "TIER_1",
    ticketPrice: "$11 USD",
    ticketPriceUsd: 11,
    seatCapacity: 6,
    signedUp: [],
    waitlist: [],
  },
  {
    eventId: "ggcon-2026-09",
    slug: "last-watch-lantern-spire",
    game: "The Last Watch at Lantern Spire",
    summary:
      "Defend a border tower during a siege night where every hour reveals a deeper threat.",
    details: [
      "A defensive scenario with escalating waves, survival choices, and NPC protection goals.",
      "Best for players who like tactical teamwork, pressure-cooker pacing, and dramatic last stands.",
      "Includes multiple objectives that can change the final battlefield and the fate of the tower.",
    ],
    startAt: "2026-09-19T19:30:00-06:00",
    dm: "Marcus",
    tier: "TIER_2",
    ticketPrice: "$12 USD",
    ticketPriceUsd: 12,
    seatCapacity: 6,
    signedUp: [],
    waitlist: [],
  },
  {
    eventId: "ggcon-2026-09",
    slug: "skybridge-heist",
    game: "The Skybridge Heist",
    summary:
      "Pull off a daylight robbery across suspended bridges while dodging sentries and a rival crew.",
    details: [
      "A caper-style adventure focused on infiltration, timing, and fast improvisation.",
      "Best for players who enjoy teamwork plans, mobility, and creative solutions under pressure.",
      "The finale pivots between a clean getaway and a rooftop chase depending on party choices.",
    ],
    startAt: "2026-09-20T11:00:00-06:00",
    dm: "Avery",
    tier: "TIER_1",
    ticketPrice: "$9 USD",
    ticketPriceUsd: 9,
    seatCapacity: 6,
    signedUp: [],
    waitlist: [],
  },
];

export const grimoireEventSlots: GrimoireEventSlot[] = [
  {
    eventId: "ggcon-2026-09",
    label: "Friday Evening",
    startAt: "2026-09-18T19:00:00-06:00",
  },
  {
    eventId: "ggcon-2026-09",
    label: "Saturday Morning",
    startAt: "2026-09-19T10:00:00-06:00",
  },
  {
    eventId: "ggcon-2026-09",
    label: "Saturday Afternoon",
    startAt: "2026-09-19T14:00:00-06:00",
  },
  {
    eventId: "ggcon-2026-09",
    label: "Saturday Evening",
    startAt: "2026-09-19T19:30:00-06:00",
  },
  {
    eventId: "ggcon-2026-09",
    label: "Sunday Morning",
    startAt: "2026-09-20T11:00:00-06:00",
  },
];

export const discordInviteUrl = "https://discord.gg/KR7rebwgJf";

export function getNextEvent(events: SeasonEvent[]) {
  const now = Date.now();
  return events.find((event) => new Date(event.date).getTime() >= now) ?? events[0];
}

export function getGamesForEvent(eventId: string) {
  return grimoireGames.filter((game) => game.eventId === eventId);
}

export function getSlotsForEvent(eventId: string) {
  return grimoireEventSlots.filter((slot) => slot.eventId === eventId);
}

export function getGrimoireGameBySlug(slug: string) {
  return grimoireGames.find((game) => game.slug === slug);
}

export function getSeasonEventById(eventId: string) {
  return seasonSchedule.find((event) => event.id === eventId);
}

export function formatGrimoireTier(tier: GrimoireTier) {
  return tier.replace("_", " ").replace("TIER", "Tier");
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
