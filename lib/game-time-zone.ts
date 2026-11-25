function wallTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function formatGameDateInZone(instant: string, timeZone: string) {
  return wallTime(new Date(instant), timeZone);
}

export function gameDateToUtc(local: string, timeZone: string, originalInstant?: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error("Choose a valid game date and time.");
  const target = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== local) {
    throw new Error("Choose a valid game date and time.");
  }
  if (originalInstant && Number.isFinite(Date.parse(originalInstant)) && wallTime(new Date(originalInstant), timeZone) === local) {
    return new Date(originalInstant).toISOString();
  }
  // Check the offsets on both sides of a daylight-saving transition. During a
  // repeated hour, use the first occurrence; a skipped local time is invalid.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = target + hours * 3_600_000;
    offsets.add(Date.parse(`${wallTime(new Date(sample), timeZone)}:00Z`) - sample);
  }
  const matches = [...offsets].map((offset) => target - offset)
    .filter((candidate) => wallTime(new Date(candidate), timeZone) === local).sort((a, b) => a - b);
  if (!matches.length) throw new Error("That time does not exist in this timezone because the clocks change. Choose another time.");
  return new Date(matches[0]).toISOString();
}
