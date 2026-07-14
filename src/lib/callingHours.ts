// Calling-hours gate for the campaign dialer — faithful port of VocalMax's
// schedule check. Reads the shape the Settings page stores under
// "ai_calling_hours": { timezone, days: { Monday: {enabled,start,end}, ... } }.
// Returns true (allow dialing) when no schedule is configured, matching VocalMax:
// a call is only placed when the current time in the configured timezone falls
// inside an enabled day's [start, end] window.

export type DaySchedule = { enabled: boolean; start: string; end: string };

export interface CallingHours {
  timezone?: string;
  days?: Record<string, DaySchedule>;
}

export function isWithinCallingHours(
  hours: CallingHours | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!hours || !hours.days) return true;
  const tz = hours.timezone || "Europe/London";

  let weekday: string;
  let hhmm: string;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(at);
    weekday = parts.find((p) => p.type === "weekday")?.value || "";
    const h = parts.find((p) => p.type === "hour")?.value ?? "00";
    const m = parts.find((p) => p.type === "minute")?.value ?? "00";
    // en-GB can render midnight as "24"; normalize to "00".
    hhmm = `${(h === "24" ? "00" : h).padStart(2, "0")}:${m.padStart(2, "0")}`;
  } catch {
    return true; // invalid timezone → don't block calling
  }

  const day = hours.days[weekday];
  if (!day || !day.enabled) return false;
  return hhmm >= day.start && hhmm <= day.end;
}
