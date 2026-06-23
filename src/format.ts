export function formatMinutes(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function sessionsUntilLong(
  completed: number,
  sessionsBeforeLong: number
): number {
  const n = Math.max(1, sessionsBeforeLong);
  const done = completed % n;
  return n - done;
}

export function phaseMessage(phase: string, isRunning: boolean): string {
  if (phase === "idle") return "A clean block is waiting.";
  if (phase === "work") return isRunning ? "Stay with the block." : "Ready to focus.";
  if (phase === "short_break") return "Take a short break.";
  if (phase === "long_break") return "Take a longer break.";
  return "";
}

export function subtitleForPhase(phase: string): string {
  if (phase === "idle") return "A clean block is waiting for you.";
  if (phase === "work") return "One block at a time.";
  if (phase === "short_break" || phase === "long_break") return "Rest, then return.";
  return "Simple sessions, clean breaks.";
}

export function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "narrow" });
}

export function dayLabelTwo(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last 7 days ending today (oldest first, today last). */
export function lastSevenDays(
  lastDays: { day: string; minutes: number }[]
): { day: string; minutes: number }[] {
  const byDay = new Map(lastDays.map((d) => [d.day, d.minutes]));
  const today = new Date();

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    const day = toIsoDate(d);
    return { day, minutes: byDay.get(day) ?? 0 };
  });
}

function parseLocalDateTime(iso: string): Date {
  const [date, time = "00:00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const parts = time.split(":").map(Number);
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;
  return new Date(y, m - 1, d, hh, mm, ss);
}

export function formatSessionDate(iso: string): string {
  const d = parseLocalDateTime(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatSessionTime(iso: string): string {
  return parseLocalDateTime(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSessionDuration(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
