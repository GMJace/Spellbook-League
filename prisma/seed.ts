// @ts-nocheck
// @ts-nocheck
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import bcrypt from "bcryptjs";
import { GameStatus, PrismaClient, Tier } from "@prisma/client";

import { achievementBadgePathBySlug } from "./achievement-badge-map";

const prisma = new PrismaClient();
const dataDirectory = path.join(process.cwd(), "data");
const proDmRosterPath = path.join(dataDirectory, "pro-dm-roster.json");
const proDmReviewsPath = path.join(dataDirectory, "pro-dm-reviews.json");

function atTime(date: Date, hours: number, minutes = 0) {
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(date);
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayDateRange(startDate: Date, endDate: Date) {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(startDate);

    return `${monthLabel} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
  }

  if (sameYear) {
    const startLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
    }).format(startDate);
    const endLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
    }).format(endDate);

    return `${startLabel} - ${endLabel}, ${startDate.getFullYear()}`;
  }

  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const achievementCatalog: Array<{
  slug: string;
  category: string;
  name: string;
  description: string;
  badgeImagePath?: string;
}> = [
  {
    slug: "five-in-one",
    category: "Combat Achievements",
    name: "Five in One",
    description: "Defeat 5 creatures with more than 10 hit points each during a single turn.",
  },
  {
    slug: "longshot-legend",
    category: "Combat Achievements",
    name: "Longshot Legend",
    description: "Defeat a creature from more than 300 feet away.",
  },
  {
    slug: "dragonbreaker",
    category: "Combat Achievements",
    name: "Dragonbreaker",
    description: "Land the killing blow on a dragon.",
  },
  {
    slug: "monster-hunter",
    category: "Combat Achievements",
    name: "Monster Hunter",
    description: "Defeat a creature with a Challenge Rating higher than your character level.",
  },
  {
    slug: "last-one-standing",
    category: "Combat Achievements",
    name: "Last One Standing",
    description: "Win an encounter while you are the only conscious party member.",
  },
  {
    slug: "one-hit-wonder",
    category: "Combat Achievements",
    name: "One Hit Wonder",
    description: "Defeat a creature at full hit points with a single attack or spell.",
  },
  {
    slug: "overkill",
    category: "Combat Achievements",
    name: "Overkill",
    description: "Deal at least 50 damage beyond the target's remaining hit points.",
  },
  {
    slug: "the-bigger-they-are",
    category: "Combat Achievements",
    name: "The Bigger They Are",
    description: "Knock a Huge or larger creature prone.",
  },
  {
    slug: "executioners-timing",
    category: "Combat Achievements",
    name: "Executioner's Timing",
    description: "Defeat a creature with an opportunity attack.",
  },
  {
    slug: "return-to-sender",
    category: "Combat Achievements",
    name: "Return to Sender",
    description: "Defeat a creature using damage it caused, reflected, redirected, or triggered.",
  },
  {
    slug: "no-mercy-round",
    category: "Combat Achievements",
    name: "No Mercy Round",
    description: "Help the party defeat three or more enemies before any of them take a turn.",
  },
  {
    slug: "untouchable",
    category: "Combat Achievements",
    name: "Untouchable",
    description: "Complete a combat encounter without taking damage.",
  },
  {
    slug: "bloodied-but-unbroken",
    category: "Combat Achievements",
    name: "Bloodied but Unbroken",
    description: "Survive a combat encounter after being reduced to 1 hit point.",
  },
  {
    slug: "deaths-door-duelist",
    category: "Combat Achievements",
    name: "Death's Door Duelist",
    description: "Defeat a creature while you have 5 or fewer hit points.",
  },
  {
    slug: "clean-sweep",
    category: "Combat Achievements",
    name: "Clean Sweep",
    description: "Defeat every hostile creature in an encounter without any party member dropping to 0 hit points.",
  },
  {
    slug: "boss-breaker",
    category: "Combat Achievements",
    name: "Boss Breaker",
    description: "Deal the most damage to a major villain or boss monster during an encounter.",
  },
  {
    slug: "counterspell-clutch",
    category: "Spellcasting Achievements",
    name: "Counterspell Clutch",
    description: "Counter a spell that would have dropped, killed, or disabled an ally.",
  },
  {
    slug: "big-boom-theory",
    category: "Spellcasting Achievements",
    name: "Big Boom Theory",
    description: "Hit 5 or more creatures with a single area spell.",
  },
  {
    slug: "arcane-sniper",
    category: "Spellcasting Achievements",
    name: "Arcane Sniper",
    description: "Defeat a creature with a spell from more than 120 feet away.",
  },
  {
    slug: "perfect-placement",
    category: "Spellcasting Achievements",
    name: "Perfect Placement",
    description: "Cast an area spell that hits 3 or more enemies and no allies.",
  },
  {
    slug: "spell-saver",
    category: "Spellcasting Achievements",
    name: "Spell Saver",
    description: "Use a spell to prevent an ally from dropping to 0 hit points.",
  },
  {
    slug: "magic-missile-massacre",
    category: "Spellcasting Achievements",
    name: "Magic Missile Massacre",
    description: "Defeat 3 creatures with a single casting of Magic Missile or similar multi-target spell.",
  },
  {
    slug: "the-floor-is-lava",
    category: "Spellcasting Achievements",
    name: "The Floor Is Lava",
    description: "Defeat a creature using ongoing terrain or environmental magic.",
  },
  {
    slug: "no-slot-wasted",
    category: "Spellcasting Achievements",
    name: "No Slot Wasted",
    description: "Cast a spell that directly causes 3 or more enemies to fail saving throws.",
  },
  {
    slug: "dispel-the-disaster",
    category: "Spellcasting Achievements",
    name: "Dispel the Disaster",
    description: "End a magical effect that would have seriously harmed the party.",
  },
  {
    slug: "concentration-champion",
    category: "Spellcasting Achievements",
    name: "Concentration Champion",
    description: "Maintain concentration on a spell for an entire combat encounter.",
  },
  {
    slug: "not-today",
    category: "Healing and Support Achievements",
    name: "Not Today",
    description: "Restore an ally from 0 hit points.",
  },
  {
    slug: "combat-medic",
    category: "Healing and Support Achievements",
    name: "Combat Medic",
    description: "Restore hit points to 3 different allies during one combat encounter.",
  },
  {
    slug: "guardian-angel",
    category: "Healing and Support Achievements",
    name: "Guardian Angel",
    description: "Prevent an ally from taking fatal damage.",
  },
  {
    slug: "second-wind-savior",
    category: "Healing and Support Achievements",
    name: "Second Wind Savior",
    description: "Bring an ally back into the fight, and that ally defeats a creature before the encounter ends.",
  },
  {
    slug: "the-party-lives",
    category: "Healing and Support Achievements",
    name: "The Party Lives",
    description: "Complete an adventure where every party member survives because of your healing or protection.",
  },
  {
    slug: "shield-wall",
    category: "Healing and Support Achievements",
    name: "Shield Wall",
    description: "Cause 3 or more attacks against allies to miss through your abilities, spells, or reactions.",
  },
  {
    slug: "blessed-timing",
    category: "Healing and Support Achievements",
    name: "Blessed Timing",
    description: "Your support spell or ability causes an ally to succeed on a crucial attack roll or saving throw.",
  },
  {
    slug: "the-real-mvp",
    category: "Healing and Support Achievements",
    name: "The Real MVP",
    description: "Complete an encounter where you defeat no enemies but are essential to the party's victory.",
  },
  {
    slug: "silver-tongue",
    category: "Skill and Roleplay Achievements",
    name: "Silver Tongue",
    description: "Resolve a dangerous encounter without combat.",
  },
  {
    slug: "master-negotiator",
    category: "Skill and Roleplay Achievements",
    name: "Master Negotiator",
    description: "Convince an enemy to surrender, retreat, or switch sides.",
  },
  {
    slug: "i-know-a-guy",
    category: "Skill and Roleplay Achievements",
    name: "I Know a Guy",
    description: "Use a backstory connection to solve a major problem.",
  },
  {
    slug: "the-face-of-the-party",
    category: "Skill and Roleplay Achievements",
    name: "The Face of the Party",
    description: "Succeed on 3 Charisma-based checks in a single social scene.",
  },
  {
    slug: "truth-seeker",
    category: "Skill and Roleplay Achievements",
    name: "Truth Seeker",
    description: "Uncover a major secret through investigation or questioning.",
  },
  {
    slug: "master-detective",
    category: "Skill and Roleplay Achievements",
    name: "Master Detective",
    description: "Solve a mystery before the final reveal.",
  },
  {
    slug: "expert-witness",
    category: "Skill and Roleplay Achievements",
    name: "Expert Witness",
    description: "Prove someone's guilt or innocence through evidence.",
  },
  {
    slug: "the-perfect-lie",
    category: "Skill and Roleplay Achievements",
    name: "The Perfect Lie",
    description: "Convince an important NPC of a falsehood with serious consequences.",
  },
  {
    slug: "oathkeeper",
    category: "Skill and Roleplay Achievements",
    name: "Oathkeeper",
    description: "Make a promise in character and meaningfully fulfill it later.",
  },
  {
    slug: "dramatic-entrance",
    category: "Skill and Roleplay Achievements",
    name: "Dramatic Entrance",
    description: "Enter a scene in a way that changes the direction of the encounter.",
  },
  {
    slug: "dungeon-delver",
    category: "Exploration Achievements",
    name: "Dungeon Delver",
    description: "Discover a hidden room, secret door, or concealed passage.",
  },
  {
    slug: "cartographer",
    category: "Exploration Achievements",
    name: "Cartographer",
    description: "Map a dungeon, region, or dangerous area accurately enough to help the party.",
  },
  {
    slug: "trap-spotter",
    category: "Exploration Achievements",
    name: "Trap Spotter",
    description: "Detect 3 traps before they are triggered.",
  },
  {
    slug: "trapbreaker",
    category: "Exploration Achievements",
    name: "Trapbreaker",
    description: "Disarm a dangerous trap under pressure.",
  },
  {
    slug: "pathfinder",
    category: "Exploration Achievements",
    name: "Pathfinder",
    description: "Guide the party through hazardous terrain without anyone becoming lost.",
  },
  {
    slug: "first-one-in",
    category: "Exploration Achievements",
    name: "First One In",
    description: "Be the first character to enter a dangerous unknown location.",
  },
  {
    slug: "ancient-scholar",
    category: "Exploration Achievements",
    name: "Ancient Scholar",
    description: "Correctly identify the purpose of an ancient ruin, relic, or inscription.",
  },
  {
    slug: "environmental-execution",
    category: "Exploration Achievements",
    name: "Environmental Execution",
    description: "Defeat or disable an enemy using the battlefield, terrain, or surroundings.",
  },
  {
    slug: "still-breathing",
    category: "Survival Achievements",
    name: "Still Breathing",
    description: "Survive after failing 2 death saving throws.",
  },
  {
    slug: "hard-to-kill",
    category: "Survival Achievements",
    name: "Hard to Kill",
    description: "Drop to 0 hit points more than once in a single adventure and survive.",
  },
  {
    slug: "against-all-odds",
    category: "Survival Achievements",
    name: "Against All Odds",
    description: "Survive an encounter rated Deadly or worse.",
  },
  {
    slug: "no-rest-for-the-wicked",
    category: "Survival Achievements",
    name: "No Rest for the Wicked",
    description: "Complete 3 combat encounters without taking a long rest.",
  },
  {
    slug: "poison-what-poison",
    category: "Survival Achievements",
    name: "Poison? What Poison?",
    description: "Survive being poisoned, diseased, cursed, or magically afflicted.",
  },
  {
    slug: "barely-made-it",
    category: "Survival Achievements",
    name: "Barely Made It",
    description: "Finish an adventure with half the party or more at 10 hit points or fewer.",
  },
  {
    slug: "resourceful-survivor",
    category: "Survival Achievements",
    name: "Resourceful Survivor",
    description: "Win an encounter after running out of spell slots, class resources, or ammunition.",
  },
  {
    slug: "set-them-up",
    category: "Teamwork Achievements",
    name: "Set Them Up",
    description: "Cause an enemy to be defeated by an ally because of your setup, shove, spell, Help action, or condition.",
  },
  {
    slug: "combo-attack",
    category: "Teamwork Achievements",
    name: "Combo Attack",
    description: "Two or more characters combine abilities to defeat a major enemy in the same round.",
  },
  {
    slug: "nobody-gets-left-behind",
    category: "Teamwork Achievements",
    name: "Nobody Gets Left Behind",
    description: "Rescue an unconscious or trapped ally from danger.",
  },
  {
    slug: "perfect-plan",
    category: "Teamwork Achievements",
    name: "Perfect Plan",
    description: "The party wins an encounter using a plan made before initiative was rolled.",
  },
  {
    slug: "formation-fighters",
    category: "Teamwork Achievements",
    name: "Formation Fighters",
    description: "Complete an encounter where every party member contributes to defeating at least one enemy.",
  },
  {
    slug: "chain-reaction",
    category: "Teamwork Achievements",
    name: "Chain Reaction",
    description: "One character's action causes another character's action to defeat two or more enemies.",
  },
  {
    slug: "the-assist-king",
    category: "Teamwork Achievements",
    name: "The Assist King",
    description: "Use the Help action or a support feature 3 times in one session.",
  },
  {
    slug: "door-problem-solver",
    category: "Funny and Weird Achievements",
    name: "Door Problem Solver",
    description: "Open a locked door without using the key.",
  },
  {
    slug: "barrelmancer",
    category: "Funny and Weird Achievements",
    name: "Barrelmancer",
    description: "Defeat or seriously injure a creature using a barrel, crate, chair, chandelier, or other object.",
  },
  {
    slug: "friendly-fireball",
    category: "Funny and Weird Achievements",
    name: "Friendly Fireball",
    description: "Hit at least one ally and at least three enemies with the same area effect.",
  },
  {
    slug: "i-meant-to-do-that",
    category: "Funny and Weird Achievements",
    name: "I Meant to Do That",
    description: "Roll a natural 1 and still somehow improve the situation.",
  },
  {
    slug: "critical-clown",
    category: "Funny and Weird Achievements",
    name: "Critical Clown",
    description: "Roll a natural 20 on something completely ridiculous.",
  },
  {
    slug: "the-shopping-episode",
    category: "Funny and Weird Achievements",
    name: "The Shopping Episode",
    description: "Spend more than 30 minutes of real time buying, selling, haggling, or arguing over mundane items.",
  },
  {
    slug: "goblin-mode",
    category: "Funny and Weird Achievements",
    name: "Goblin Mode",
    description: "Solve a problem in the least elegant but most effective way possible.",
  },
  {
    slug: "that-was-the-plan",
    category: "Funny and Weird Achievements",
    name: "That Was the Plan?",
    description: "Complete an encounter using a plan that made no sense when explained.",
  },
  {
    slug: "improvised-weapon-enthusiast",
    category: "Funny and Weird Achievements",
    name: "Improvised Weapon Enthusiast",
    description: "Defeat a creature with an object not designed to be a weapon.",
  },
  {
    slug: "chicken-chaser",
    category: "Funny and Weird Achievements",
    name: "Chicken Chaser",
    description: "Win or seriously affect an encounter using an animal, familiar, mount, or summoned creature in a ridiculous way.",
  },
  {
    slug: "campaign-veteran",
    category: "Epic Table Achievements",
    name: "Campaign Veteran",
    description: "Play the same character for 10 sessions.",
  },
  {
    slug: "legend-in-the-making",
    category: "Epic Table Achievements",
    name: "Legend in the Making",
    description: "Play the same character for 25 sessions.",
  },
  {
    slug: "mythic-name",
    category: "Epic Table Achievements",
    name: "Mythic Name",
    description: "Earn an in-world title from an NPC, faction, or community.",
  },
  {
    slug: "faction-favorite",
    category: "Epic Table Achievements",
    name: "Faction Favorite",
    description: "Gain the trust or favor of a major organization.",
  },
  {
    slug: "nemesis-maker",
    category: "Epic Table Achievements",
    name: "Nemesis Maker",
    description: "Create a recurring enemy through your choices.",
  },
  {
    slug: "hero-of-the-people",
    category: "Epic Table Achievements",
    name: "Hero of the People",
    description: "Save a town, village, district, or community.",
  },
  {
    slug: "world-shaker",
    category: "Epic Table Achievements",
    name: "World Shaker",
    description: "Make a choice that changes the campaign world.",
  },
  {
    slug: "final-blow",
    category: "Epic Table Achievements",
    name: "Final Blow",
    description: "Land the killing blow against a campaign arc villain.",
  },
  {
    slug: "full-circle",
    category: "Epic Table Achievements",
    name: "Full Circle",
    description: "Resolve a personal character arc that began earlier in the campaign.",
  },
  {
    slug: "the-legend-retires",
    category: "Epic Table Achievements",
    name: "The Legend Retires",
    description: "Retire a character alive after completing a major story arc.",
  },
];

for (const achievement of achievementCatalog) {
  const badgeImagePath = achievementBadgePathBySlug[achievement.slug];

  if (badgeImagePath) {
    achievement.badgeImagePath = badgeImagePath;
  }
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.characterAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.gameParticipant.deleteMany();
  await prisma.game.deleteMany();
  await prisma.character.deleteMany();
  await prisma.grimoireDmSubmission.deleteMany();
  await prisma.grimoireCuratedGame.deleteMany();
  await prisma.grimoireEventSlot.deleteMany();
  await prisma.grimoireEvent.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.handbook.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const now = new Date();
  const userCreatedAt = {
    admin: addDays(now, -90),
    player: addDays(now, -72),
    dm: addDays(now, -68),
    dual: addDays(now, -63),
    rosterDm: addDays(now, -52),
    waitlistDm: addDays(now, -46),
    scout: addDays(now, -39),
    healer: addDays(now, -31),
  };

  const [
    adminUser,
    playerUser,
    dmUser,
    dualUser,
    rosterDmUser,
    waitlistDmUser,
    scoutUser,
    healerUser,
  ] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Cornerstone Admin",
        discordHandle: "@cornerstone.admin",
        email: "cornerstonednd@gmail.com",
        passwordHash,
        createdAt: userCreatedAt.admin,
        roles: {
          create: [{ role: "DM" }, { role: "PLAYER" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Mira Vale",
        discordHandle: "@mira.vale",
        email: "player@example.com",
        passwordHash,
        createdAt: userCreatedAt.player,
        roles: {
          create: [{ role: "PLAYER" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Garrick Stone",
        discordHandle: "@garrick.stone",
        email: "dm@example.com",
        passwordHash,
        createdAt: userCreatedAt.dm,
        roles: {
          create: [{ role: "DM" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Selene Hart",
        discordHandle: "@selene.hart",
        email: "dual@example.com",
        passwordHash,
        createdAt: userCreatedAt.dual,
        roles: {
          create: [{ role: "PLAYER" }, { role: "DM" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Rowan Ashcroft",
        discordHandle: "@rowan.ashcroft",
        email: "rowan@example.com",
        passwordHash,
        createdAt: userCreatedAt.rosterDm,
        roles: {
          create: [{ role: "DM" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Tamsin Vale",
        discordHandle: "@tamsinvale",
        email: "tamsin@example.com",
        passwordHash,
        createdAt: userCreatedAt.waitlistDm,
        roles: {
          create: [{ role: "DM" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Orin Pike",
        discordHandle: "@orin.pike",
        email: "scout@example.com",
        passwordHash,
        createdAt: userCreatedAt.scout,
        roles: {
          create: [{ role: "PLAYER" }],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Nyra Dawn",
        discordHandle: "@nyra.dawn",
        email: "healer@example.com",
        passwordHash,
        createdAt: userCreatedAt.healer,
        roles: {
          create: [{ role: "PLAYER" }],
        },
      },
    }),
  ]);

  const [ilyra, bram, ashara, torvin, kestrel, seraphine] = await Promise.all([
    prisma.character.create({
      data: {
        name: "Ilyra",
        userId: playerUser.id,
        class1Name: "Wizard",
        class1Level: 5,
        totalGold: 820,
        magicItems: JSON.stringify(["Wand of the War Mage +1", "Cloak of Protection"]),
      },
    }),
    prisma.character.create({
      data: {
        name: "Bram Forge",
        userId: playerUser.id,
        class1Name: "Paladin",
        class1Level: 4,
        class2Name: "Fighter",
        class2Level: 2,
        totalGold: 560,
        magicItems: JSON.stringify(["Sentinel Shield", "Gauntlets of Ogre Power"]),
      },
    }),
    prisma.character.create({
      data: {
        name: "Ashara Quill",
        userId: dualUser.id,
        class1Name: "Bard",
        class1Level: 8,
        totalGold: 1430,
        magicItems: JSON.stringify(["Instrument of the Bards", "Boots of Elvenkind", "Pearl of Power"]),
      },
    }),
    prisma.character.create({
      data: {
        name: "Torvin Reed",
        userId: dualUser.id,
        class1Name: "Rogue",
        class1Level: 3,
        class2Name: "Ranger",
        class2Level: 2,
        totalGold: 390,
        magicItems: JSON.stringify(["Bag of Holding"]),
      },
    }),
    prisma.character.create({
      data: {
        name: "Kestrel Vane",
        userId: scoutUser.id,
        class1Name: "Ranger",
        class1Level: 6,
        class2Name: "Rogue",
        class2Level: 1,
        totalGold: 710,
        magicItems: JSON.stringify(["Boots of Striding and Springing", "Quiver of Ehlonna"]),
      },
    }),
    prisma.character.create({
      data: {
        name: "Seraphine Moss",
        userId: healerUser.id,
        class1Name: "Cleric",
        class1Level: 7,
        totalGold: 910,
        magicItems: JSON.stringify(["Amulet of the Devout +1", "Staff of Healing"]),
      },
    }),
  ]);

  const [
    game1,
    game2,
    game3,
    game4,
    game5,
    game6,
  ] = await Promise.all([
    prisma.game.create({
      data: {
        dmId: dmUser.id,
        loggedByUserId: adminUser.id,
        title: "The Haunted Chapel",
        adventureCode: "AL-CC-101",
        datePlayed: addDays(now, -24),
        tier: Tier.TIER_1,
        serviceHours: 4,
        rewardsSummary: "Gold, downtime, and league favor.",
        consequencesSummary: "The chapel remains unstable.",
        sessionNotes: "Strong roleplay and a close final fight.",
        status: GameStatus.COMPLETED,
      },
    }),
    prisma.game.create({
      data: {
        dmId: dualUser.id,
        loggedByUserId: dualUser.id,
        title: "Pilgrimage of Ash",
        adventureCode: "AL-EPIC-7",
        datePlayed: addDays(now, -16),
        tier: Tier.TIER_2,
        serviceHours: 6.5,
        rewardsSummary: "Rare maps and salvage rights.",
        consequencesSummary: "Refugee tensions increased.",
        sessionNotes: "Fast-paced wilderness session.",
        status: GameStatus.COMPLETED,
      },
    }),
    prisma.game.create({
      data: {
        dmId: rosterDmUser.id,
        loggedByUserId: adminUser.id,
        title: "Siege of Ashenport",
        adventureCode: "AL-BG-412",
        datePlayed: addDays(now, -6),
        tier: Tier.TIER_3,
        serviceHours: 5.5,
        rewardsSummary: "Shipwright favors, ruby dust, and renown.",
        consequencesSummary: "The harbor chain was shattered.",
        sessionNotes: "A tactical war-room session with a brutal final round.",
        status: GameStatus.COMPLETED,
      },
    }),
    prisma.game.create({
      data: {
        dmId: dmUser.id,
        title: "Lanterns in the Mist",
        adventureCode: "AL-DC-204",
        datePlayed: addDays(now, 4),
        tier: Tier.TIER_1,
        serviceHours: 0,
        rewardsSummary: "Standard rewards package.",
        consequencesSummary: "A rival faction was alerted.",
        sessionNotes: "Scheduled for community night.",
        status: GameStatus.SCHEDULED,
      },
    }),
    prisma.game.create({
      data: {
        dmId: waitlistDmUser.id,
        loggedByUserId: adminUser.id,
        title: "Cinders at Dawn",
        adventureCode: "AL-FR-301",
        datePlayed: addDays(now, -33),
        tier: Tier.TIER_2,
        serviceHours: 4.5,
        rewardsSummary: "Spell reagents, favors, and a rescued courier.",
        consequencesSummary: "An infernal broker marked the party.",
        sessionNotes: "Steady pacing with a great final negotiation scene.",
        status: GameStatus.COMPLETED,
      },
    }),
    prisma.game.create({
      data: {
        dmId: rosterDmUser.id,
        title: "Whispers Beneath Glass",
        adventureCode: "AL-MH-509",
        datePlayed: addDays(now, 12),
        tier: Tier.TIER_2,
        serviceHours: 0,
        rewardsSummary: "Convention rewards pending.",
        consequencesSummary: "The glass archive has not been secured yet.",
        sessionNotes: "Open signups for the next convention weekend.",
        status: GameStatus.SCHEDULED,
      },
    }),
  ]);

  await prisma.gameParticipant.createMany({
    data: [
      { gameId: game1.id, characterId: ilyra.id, userId: playerUser.id },
      { gameId: game1.id, characterId: ashara.id, userId: dualUser.id },
      { gameId: game1.id, characterId: kestrel.id, userId: scoutUser.id },
      { gameId: game2.id, characterId: ilyra.id, userId: playerUser.id },
      { gameId: game2.id, characterId: bram.id, userId: playerUser.id },
      { gameId: game2.id, characterId: torvin.id, userId: dualUser.id },
      { gameId: game2.id, characterId: seraphine.id, userId: healerUser.id },
      { gameId: game3.id, characterId: ashara.id, userId: dualUser.id },
      { gameId: game3.id, characterId: kestrel.id, userId: scoutUser.id },
      { gameId: game3.id, characterId: seraphine.id, userId: healerUser.id },
      { gameId: game3.id, characterId: bram.id, userId: playerUser.id },
      { gameId: game4.id, characterId: bram.id, userId: playerUser.id },
      { gameId: game4.id, characterId: seraphine.id, userId: healerUser.id },
      { gameId: game5.id, characterId: ilyra.id, userId: playerUser.id },
      { gameId: game5.id, characterId: torvin.id, userId: dualUser.id },
      { gameId: game5.id, characterId: kestrel.id, userId: scoutUser.id },
      {
        gameId: game6.id,
        characterId: ashara.id,
        userId: dualUser.id,
        logStatus: "PENDING",
      },
      {
        gameId: game6.id,
        characterId: kestrel.id,
        userId: scoutUser.id,
        logStatus: "PENDING",
      },
    ],
  });

  await prisma.handbook.createMany({
    data: [
      {
        slug: "players-guide",
        title: "Player's Guide",
        sortOrder: 1,
        content:
          "Welcome to the league. Create characters, join registered games, and use your character log to review every session you have played.",
      },
      {
        slug: "dms-guide",
        title: "DM's Guide",
        sortOrder: 2,
        content:
          "Dungeon Masters can register games, select league players and characters, and record rewards, consequences, and session notes for each event.",
      },
      {
        slug: "publishers-guide",
        title: "Publisher's Guide",
        sortOrder: 3,
        content:
          "Publishers and organizers can use handbook content to define league structure, event expectations, and approved content for community play.",
      },
    ],
  });

  if (achievementCatalog.length) {
    await prisma.achievement.createMany({
      data: achievementCatalog,
    });
  }

  const grimoireEventDate = atTime(addDays(now, 79), 18);

  const grimoireEventSlots = [
    {
      label: "Friday Prelude",
      startAt: atTime(grimoireEventDate, 18),
    },
    {
      label: "Saturday Main Event",
      startAt: atTime(addDays(grimoireEventDate, 1), 12),
    },
    {
      label: "Saturday Finale",
      startAt: atTime(addDays(grimoireEventDate, 1), 20),
    },
  ];

  await prisma.grimoireEvent.create({
    data: {
      id: "ggcon-echoes-of-the-end",
      label: formatMonthLabel(grimoireEventDate),
      subtitle: "Echoes of the End",
      date: grimoireEventDate,
      displayDate: formatDisplayDateRange(grimoireEventDate, addDays(grimoireEventDate, 1)),
      theme: "Season finale and campaign payoffs",
      themeDetails: JSON.stringify([
        "Signature boss fights, payoffs, and returning NPCs.",
        "A finale event card sized for epics, endgames, and legendary tables.",
        "Designed to spotlight DMs with big emotional and tactical swings.",
      ]),
      focus:
        "A high-stakes closing convention built for finales, rival callbacks, and spectacular last stands.",
      ticketLabel: "Finale Pass",
      ticketPrice: "$30 USD",
      ticketPriceUsd: 30,
      finale: true,
      slots: {
        create: grimoireEventSlots,
      },
    },
  });

  await prisma.grimoireCuratedGame.createMany({
    data: [
      {
        eventId: "ggcon-echoes-of-the-end",
        slug: "crown-of-the-falling-star",
        title: "Crown of the Falling Star",
        summary:
          "Race rival champions to a star-forged relic before the sky itself tears open over the battlefield.",
        details: JSON.stringify([
          "Finale-tier play with cinematic pacing and heavy consequences.",
          "Designed for players who want a convention capstone.",
          "Expect legendary foes, collapsing terrain, and a big ending.",
        ]),
        startAt: grimoireEventSlots[1].startAt,
        dm: "Tamsin Vale",
        tier: Tier.TIER_4,
        ticketPrice: "$18 USD",
        ticketPriceUsd: 18,
        seatCapacity: 7,
        gameCode: "GG-FINALE-401",
      },
    ],
  });

  await prisma.grimoireDmSubmission.createMany({
    data: [
      {
        name: "Perrin Wold",
        email: "perrin.wold@example.com",
        discord: "@perrinwold",
        title: "The Bone Choir Rehearsal",
        gameCode: "COMM-FIN-02",
        eventId: "ggcon-echoes-of-the-end",
        slotStartAt: grimoireEventSlots[0].startAt,
        tier: Tier.TIER_3,
        seats: 5,
        summary:
          "Stop an undead orchestra from finishing the song that keeps a dead city standing.",
        notes:
          "Rejected for this round because the slot overlaps too closely with an existing finale horror table.",
        status: "REJECTED",
        createdAt: addDays(now, -6),
        reviewedAt: addDays(now, -5),
      },
      {
        name: "Cass Ember",
        email: "cass.ember@example.com",
        discord: "@cassember",
        title: "Last Light on the Obsidian Stairs",
        gameCode: "COMM-FIN-08",
        eventId: "ggcon-echoes-of-the-end",
        slotStartAt: finaleEventSlots[2].startAt,
        tier: Tier.TIER_4,
        seats: 6,
        summary:
          "A top-tier finale run where the party climbs a collapsing god-machine toward one final impossible choice.",
        notes:
          "Pending review. This looks promising but needs a clearer safety note and estimated encounter pacing.",
        status: "PENDING",
        createdAt: addDays(now, -1),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        createdByUserId: null,
        type: "SYSTEM",
        title: "Admin tools ready",
        body: "Fresh demo data has been loaded for user management, Hire a DM, and Grimoire moderation.",
        detailsJson: JSON.stringify([
          { label: "Users", value: "8 seeded accounts" },
          { label: "Grimoire", value: "3 events with curated games and submissions" },
        ]),
        actionLabel: "Open admin users",
        actionHref: "/admin/users",
        isRead: false,
        createdAt: addDays(now, -1),
      },
      {
        userId: dmUser.id,
        createdByUserId: adminUser.id,
        type: "PRO_DM_ROSTER",
        title: "Added to the Professional DM roster",
        body: "Your public Hire a DM profile is live and accepting bookings.",
        detailsJson: JSON.stringify([
          { label: "Rating", value: "5 stars" },
          { label: "Public page", value: "/hire-a-dm" },
        ]),
        actionLabel: "View profile",
        actionHref: `/hire-a-dm/${dmUser.id}`,
        isRead: false,
        createdAt: addDays(now, -4),
      },
      {
        userId: dualUser.id,
        createdByUserId: adminUser.id,
        type: "GAME_UPDATED",
        title: "Pilgrimage of Ash adventure log approved",
        body: "Your latest logged session is now reflected on your character pages.",
        detailsJson: JSON.stringify([
          { label: "Adventure", value: "Pilgrimage of Ash" },
          { label: "Tier", value: "Tier 2" },
        ]),
        actionLabel: "View player dashboard",
        actionHref: "/player",
        isRead: true,
        readAt: addDays(now, -10),
        createdAt: addDays(now, -11),
      },
      {
        userId: playerUser.id,
        createdByUserId: adminUser.id,
        type: "ADMIN",
        title: "League packet refreshed",
        body: "The latest adventure packet and event schedule have been posted to the handbook.",
        detailsJson: JSON.stringify([
          { label: "Includes", value: "Updated game schedule and Grimoire weekend links" },
        ]),
        actionLabel: "Read handbook",
        actionHref: "/handbooks",
        isRead: false,
        createdAt: addDays(now, -2),
      },
      {
        userId: rosterDmUser.id,
        createdByUserId: adminUser.id,
        type: "ADMIN",
        title: "Convention spotlight request",
        body: "Your Siege of Ashenport table is featured in this week's public DM promotion.",
        detailsJson: JSON.stringify([
          { label: "Feature", value: "Hire a DM spotlight" },
        ]),
        actionLabel: "Open public profile",
        actionHref: `/hire-a-dm/${rosterDmUser.id}`,
        isRead: false,
        createdAt: addDays(now, -1),
      },
    ],
  });

  await writeJsonFile(proDmRosterPath, [
    {
      userId: dmUser.id,
      isListed: true,
      rating: 5,
      headline: "High-trust tactical storyteller with convention polish",
      specialties: "Organized play, cinematic combat, gothic mystery",
      bio:
        "Garrick runs sharp, high-energy tables that keep combat moving and still leave room for dramatic character moments. He excels at convention pacing, clear rulings, and making every player feel like the scene belongs to them for a minute.",
      updatedAt: addDays(now, -4).toISOString(),
    },
    {
      userId: dualUser.id,
      isListed: true,
      rating: 5,
      headline: "Roleplay-forward adventures with strong player spotlights",
      specialties: "Social intrigue, mystery arcs, newcomer-friendly tables",
      bio:
        "Selene specializes in tables where choices matter, clues connect cleanly, and quieter players still get big story moments. Her sessions balance warmth, clarity, and just enough danger to keep every scene humming.",
      updatedAt: addDays(now, -3).toISOString(),
    },
    {
      userId: rosterDmUser.id,
      isListed: true,
      rating: 4,
      headline: "War stories, hard choices, and tactical set pieces",
      specialties: "Battlefield strategy, grim heroics, multi-objective encounters",
      bio:
        "Rowan builds tense military fantasy scenarios with layered goals, shifting fronts, and meaningful consequences. Expect strong table command, memorable villains, and battles that reward teamwork instead of brute force alone.",
      updatedAt: addDays(now, -1).toISOString(),
    },
    {
      userId: waitlistDmUser.id,
      isListed: false,
      rating: 5,
      headline: "Emotion-first finales with dangerous pacing",
      specialties: "Boss fights, endgame arcs, mythic fantasy",
      bio:
        "Tamsin's tables are built for big endings, dramatic callbacks, and hard-earned victories. The public profile copy is ready, but this DM is intentionally left off the roster so the new admin controls have someone meaningful to promote.",
      updatedAt: now.toISOString(),
    },
  ]);

  await writeJsonFile(proDmReviewsPath, [
    {
      id: "review-garrick-1",
      userId: dmUser.id,
      game: "The Haunted Chapel",
      date: formatDateInput(addDays(now, -24)),
      rating: 5,
      notes: "Great pacing, great tension, and every player got a spotlight scene.",
      createdAt: addDays(now, -3).toISOString(),
    },
    {
      id: "review-garrick-2",
      userId: dmUser.id,
      game: "Lanterns in the Mist prep session",
      date: formatDateInput(addDays(now, -8)),
      rating: 4,
      notes: "Very organized and welcoming. I'd happily book another table.",
      createdAt: addDays(now, -2).toISOString(),
    },
    {
      id: "review-selene-1",
      userId: dualUser.id,
      game: "Pilgrimage of Ash",
      date: formatDateInput(addDays(now, -16)),
      rating: 5,
      notes: "Fantastic roleplay hooks and smooth scene transitions all night.",
      createdAt: addDays(now, -5).toISOString(),
    },
    {
      id: "review-rowan-1",
      userId: rosterDmUser.id,
      game: "Siege of Ashenport",
      date: formatDateInput(addDays(now, -6)),
      rating: 4,
      notes: "Excellent tactical table with clear stakes and very cool battlefield twists.",
      createdAt: addDays(now, -1).toISOString(),
    },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
