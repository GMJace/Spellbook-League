const GRIMOIRE_EVENT_TIME_ZONE = "America/Edmonton";
const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;

export const STANDARD_GRIMOIRE_TIME_SLOTS = [
  {
    key: "friday_5pm",
    label: "Friday 5pm",
    dayOffset: 0,
    hour: 17,
    minute: 0,
  },
  {
    key: "saturday_7am",
    label: "Saturday 7am",
    dayOffset: 1,
    hour: 7,
    minute: 0,
  },
  {
    key: "saturday_noon",
    label: "Saturday Noon",
    dayOffset: 1,
    hour: 12,
    minute: 0,
  },
  {
    key: "saturday_5pm",
    label: "Saturday 5pm",
    dayOffset: 1,
    hour: 17,
    minute: 0,
  },
  {
    key: "sunday_7am",
    label: "Sunday 7am",
    dayOffset: 2,
    hour: 7,
    minute: 0,
  },
  {
    key: "sunday_noon",
    label: "Sunday Noon",
    dayOffset: 2,
    hour: 12,
    minute: 0,
  },
] as const;

export type GrimoireTimeSlotKey = (typeof STANDARD_GRIMOIRE_TIME_SLOTS)[number]["key"];

function getTimeZoneDateParts(date: Date, timeZone = GRIMOIRE_EVENT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function createDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = GRIMOIRE_EVENT_TIME_ZONE,
) {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getTimeZoneDateParts(candidate, timeZone);
    const desiredTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualTimestamp = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const delta = desiredTimestamp - actualTimestamp;

    if (delta === 0) {
      return candidate;
    }

    candidate = new Date(candidate.getTime() + delta);
  }

  return candidate;
}

function addDaysToDateParts(
  year: number,
  month: number,
  day: number,
  dayOffset: number,
) {
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function parseEventDateInput(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function getGrimoireEventDateFieldName(slotKey: GrimoireTimeSlotKey) {
  return `slotCount_${slotKey}`;
}

export function formatGrimoireEventDateInput(date: Date) {
  const parts = getTimeZoneDateParts(date);

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function readStandardGrimoireSlotCountsFromFormData(formData: FormData) {
  const counts = {} as Record<GrimoireTimeSlotKey, number>;

  for (const slot of STANDARD_GRIMOIRE_TIME_SLOTS) {
    const rawValue = String(formData.get(getGrimoireEventDateFieldName(slot.key)) ?? "0").trim();
    const parsed = Number(rawValue);
    counts[slot.key] = Number.isFinite(parsed) ? parsed : NaN;
  }

  return counts;
}

export function buildStandardGrimoireEventSlots(
  eventDateInput: string,
  slotCounts: Record<GrimoireTimeSlotKey, number>,
) {
  const eventDate = parseEventDateInput(eventDateInput);

  if (!eventDate) {
    return null;
  }

  return STANDARD_GRIMOIRE_TIME_SLOTS.map((slot) => {
    const dateParts = addDaysToDateParts(
      eventDate.year,
      eventDate.month,
      eventDate.day,
      slot.dayOffset,
    );
    const startAt = createDateInTimeZone(
      dateParts.year,
      dateParts.month,
      dateParts.day,
      slot.hour,
      slot.minute,
    );

    return {
      slotKey: slot.key,
      label: slot.label,
      startAt,
      endAt: new Date(startAt.getTime() + FOUR_HOURS_IN_MS),
      gameSlotCount: slotCounts[slot.key] ?? 0,
    };
  });
}

export function getStandardGrimoireSlotLabel(slotKey: string) {
  return (
    STANDARD_GRIMOIRE_TIME_SLOTS.find((slot) => slot.key === slotKey)?.label ??
    "Scheduled slot"
  );
}

export function getGrimoireSlotCapacityValidationErrors(
  slotCounts: Record<GrimoireTimeSlotKey, number>,
) {
  const errors: string[] = [];

  for (const slot of STANDARD_GRIMOIRE_TIME_SLOTS) {
    const value = slotCounts[slot.key];

    if (!Number.isInteger(value) || value < 0 || value > 99) {
      errors.push(`${slot.label}: Enter a whole number between 0 and 99.`);
    }
  }

  return errors;
}

