import { describe, it, expect } from "vitest";
import { isWithinCallingHours, type CallingHours } from "./callingHours";

const allDays = (start: string, end: string) =>
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].reduce(
    (acc, d) => ({ ...acc, [d]: { enabled: true, start, end } }),
    {} as CallingHours["days"],
  );

// weekday (long, UTC) for a given instant — used to target "the current day"
// deterministically without hand-computing the calendar.
const weekdayOf = (at: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" }).format(at);

describe("isWithinCallingHours", () => {
  it("allows dialing when no schedule is configured", () => {
    expect(isWithinCallingHours(null)).toBe(true);
    expect(isWithinCallingHours({})).toBe(true);
    expect(isWithinCallingHours({ timezone: "UTC" })).toBe(true);
  });

  it("allows a time inside an enabled day's window", () => {
    const at = new Date("2026-07-13T10:00:00Z");
    expect(isWithinCallingHours({ timezone: "UTC", days: allDays("09:00", "18:00") }, at)).toBe(true);
  });

  it("blocks a time outside the window", () => {
    const at = new Date("2026-07-13T20:00:00Z");
    expect(isWithinCallingHours({ timezone: "UTC", days: allDays("09:00", "18:00") }, at)).toBe(false);
  });

  it("blocks a disabled day even inside the window", () => {
    const at = new Date("2026-07-13T10:00:00Z");
    const days = allDays("09:00", "18:00")!;
    days[weekdayOf(at)] = { enabled: false, start: "09:00", end: "18:00" };
    expect(isWithinCallingHours({ timezone: "UTC", days }, at)).toBe(false);
  });

  it("respects the configured timezone", () => {
    // 08:00 UTC is 09:00 in Europe/London (BST, +1) in July → inside 09:00–18:00.
    const at = new Date("2026-07-13T08:00:00Z");
    expect(isWithinCallingHours({ timezone: "Europe/London", days: allDays("09:00", "18:00") }, at)).toBe(true);
    // ...but 07:30 UTC = 08:30 London → before the window.
    const early = new Date("2026-07-13T07:30:00Z");
    expect(isWithinCallingHours({ timezone: "Europe/London", days: allDays("09:00", "18:00") }, early)).toBe(false);
  });
});
