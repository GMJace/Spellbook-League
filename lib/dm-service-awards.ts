export const dmServiceActivities = [
  {
    value: "AL_CAMPAIGN",
    label: "Dungeon Mastering any AL campaign",
    detail: "Run an Adventurers League campaign session.",
    award: "1 service hour per session hour",
    fixedHours: 0,
    category: "Core service",
  },
  {
    value: "PREP_TIME",
    label: "Prep time",
    detail: "Prepare for a DM session.",
    award: "May be included as DM service",
    fixedHours: 0,
    category: "Core service",
  },
  {
    value: "SESSION_ZERO_SERVICE",
    label: "Running Session Zeroes",
    detail: "Run a session zero for players.",
    award: "May be included as DM service",
    fixedHours: 0,
    category: "Core service",
  },
  {
    value: "MENTORING_SERVICE",
    label: "Mentoring new DMs during their sessions",
    detail: "Mentor a new DM while they run.",
    award: "May be included as DM service",
    fixedHours: 0,
    category: "Core service",
  },
  {
    value: "NEW_SKILLS",
    label: "DMs' New Skills",
    detail: "Practice a new DM skill at two or more sessions.",
    award: "5 service hours or reward option",
    fixedHours: 5,
    category: "5-hour achievements",
  },
  {
    value: "MENTORING_ACHIEVEMENT",
    label: "Mentoring New DMs",
    detail: "Mentor a new DM during their session.",
    award: "5 service hours or reward option",
    fixedHours: 5,
    category: "5-hour achievements",
  },
  {
    value: "LEARN_TO_PLAY",
    label: "Running Learn-to-Plays",
    detail: "DM a learn-to-play adventure.",
    award: "5 service hours or reward option",
    fixedHours: 5,
    category: "5-hour achievements",
  },
  {
    value: "SESSION_ZERO_ACHIEVEMENT",
    label: "Session Zeroes",
    detail: "Run a session zero for players.",
    award: "5 service hours or reward option",
    fixedHours: 5,
    category: "5-hour achievements",
  },
  {
    value: "ONLINE_DMS",
    label: "Online DMs",
    detail: "DM a publicly announced online session, or online/hybrid session meeting accessibility needs.",
    award: "10 service hours or reward option",
    fixedHours: 10,
    category: "10-hour achievements",
  },
  {
    value: "ENTIRE_BOOKS",
    label: "Entire Books",
    detail: "Run one entire multi-session official D&D adventure.",
    award: "10 service hours or reward option",
    fixedHours: 10,
    category: "10-hour achievements",
  },
  {
    value: "SLOT_ZERO_DMS",
    label: "Slot Zero DMs",
    detail: "DM a slot zero for DMs-as-players before an event.",
    award: "10 service hours or reward option",
    fixedHours: 10,
    category: "10-hour achievements",
  },
  {
    value: "KIDS_TABLES",
    label: "Kids' Tables",
    detail: "DM a full table of players under age 15, plus adult chaperones.",
    award: "10 service hours or reward option",
    fixedHours: 10,
    category: "10-hour achievements",
  },
  {
    value: "EVENT_DMS",
    label: "Event DMs",
    detail: "At an AL event, DM 5 hours or less and manage good self-care.",
    award: "20 service hours or reward option",
    fixedHours: 20,
    category: "20-hour achievements",
  },
  {
    value: "LAST_MINUTE_DMS",
    label: "Last Minute DMs",
    detail: "DM with less than 4 hours' notice.",
    award: "20 service hours or reward option",
    fixedHours: 20,
    category: "20-hour achievements",
  },
  {
    value: "ENTIRE_NEW_RELEASE_BOOKS",
    label: "Entire New Release Books",
    detail: "Finish running the most recent official multi-session D&D adventure in full.",
    award: "20 service hours or reward option",
    fixedHours: 20,
    category: "20-hour achievements",
  },
  {
    value: "DM_PLAYTESTERS",
    label: "DM Playtesters",
    detail: "Run two or more playtests of someone else's Dungeoncraft adventure with feedback.",
    award: "20 service hours or reward option",
    fixedHours: 20,
    category: "20-hour achievements",
  },
  {
    value: "DMSGUILD_LEVIATHANS",
    label: "DMsGuild Leviathans",
    detail: "DM 10 DMsGuild AL one-shot adventures of the same campaign.",
    award: "40 service hours or reward option",
    fixedHours: 40,
    category: "40-hour achievements",
  },
  {
    value: "SIX_HOUR_EVENT_DMS",
    label: "6-Hour Event DMs",
    detail: "At an AL event, DM 6 hours or more and manage good self-care.",
    award: "40 service hours or reward option",
    fixedHours: 40,
    category: "40-hour achievements",
  },
  {
    value: "FIRST_TIME_DMS",
    label: "1st Time DMs",
    detail: "DM for the first time.",
    award: "40 service hours or reward option",
    fixedHours: 40,
    category: "40-hour achievements",
  },
  {
    value: "OUTLANDER",
    label: "Outlander",
    detail: "Start DMing in a local area that had no in-person AL games within 2+ miles.",
    award: "40 service hours or reward option",
    fixedHours: 40,
    category: "40-hour achievements",
  },
  {
    value: "MORE_INCLUSIVE_TABLES",
    label: "More Inclusive Tables",
    detail: "Identify an unaddressed need and implement accessibility solutions at your table.",
    award: "40 service hours or reward option",
    fixedHours: 40,
    category: "40-hour achievements",
  },
] as const;

export type DmServiceActivityValue = (typeof dmServiceActivities)[number]["value"];

export const dmServiceActivityValues = dmServiceActivities.map((activity) => activity.value) as [
  DmServiceActivityValue,
  ...DmServiceActivityValue[],
];

export const dmServiceActivityMap = Object.fromEntries(
  dmServiceActivities.map((activity) => [activity.value, activity]),
) as Record<DmServiceActivityValue, (typeof dmServiceActivities)[number]>;

export const dmServiceAwardCategories = [
  "Core service",
  "5-hour achievements",
  "10-hour achievements",
  "20-hour achievements",
  "40-hour achievements",
] as const;

export const dmServiceRewardOptionRules = [
  {
    rule: "Same campaign and tier",
    meaning:
      "Your assigned character must match the campaign and be the same tier or higher than the player's character.",
  },
  {
    rule: "Character cannot have played it before",
    meaning: "The character receiving the reward must not have already played that adventure.",
  },
  {
    rule: "Once per adventure per character",
    meaning: "You can assign rewards from one adventure to a character only once.",
  },
  {
    rule: "Some rewards excluded",
    meaning: "Unpublished author-only adventures and Official Support Kit epics are excluded.",
  },
] as const;

export const dmServiceCheatSheet = [
  "Running AL games: 1 hour per session hour.",
  "Prep, Session Zeroes, and mentoring new DMs: may count as DM service.",
  "Using safety tools: +1 service hour per session.",
  "New AL players: +1 service hour per new AL player.",
  "Online DMing: achievement can award 10 service hours.",
  "Learn-to-play games: achievement can award 5 service hours.",
  "Slot zero sessions: achievement can award 10 service hours.",
  "Kids' tables: achievement can award 10 service hours.",
  "Last-minute DMing: achievement can award 20 service hours.",
  "Event DMing 5 hours or less: achievement can award 20 service hours.",
  "Event DMing 6+ hours: achievement can award 40 service hours.",
  "First time DMing: achievement can award 40 service hours.",
  "Running 10 DMsGuild AL one-shots from the same campaign: achievement can award 40 service hours.",
  "Improving accessibility/inclusion at your table: achievement can award 40 service hours.",
] as const;
