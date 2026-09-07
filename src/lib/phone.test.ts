import { describe, it, expect } from "vitest";
import { normalizePhone, normalizePhoneDetailed, normalizeUkPhone } from "./phone";

describe("normalizeUkPhone — the formats a UK caller actually types", () => {
  const expected = "+447700900123";
  it.each([
    "+447700900123",
    "+44 7700 900123",
    "+44 (0)7700 900123",
    "+44 (0) 7700 900123",
    "07700900123",
    "07700 900123",
    "07700-900123",
    "(07700) 900123",
    "07700 900 123",
    "7700900123",
    "447700900123",
    "44 7700 900123",
    "00447700900123",
    "0044 7700 900123",
    "  07700 900123  ",
  ])("accepts %s", (input) => {
    expect(normalizeUkPhone(input)).toBe(expected);
  });

  it("handles UK landlines", () => {
    expect(normalizeUkPhone("020 7946 0958")).toBe("+442079460958");
    expect(normalizeUkPhone("02079460958")).toBe("+442079460958");
    expect(normalizeUkPhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("still rejects genuine rubbish", () => {
    expect(normalizeUkPhone("")).toBeNull();
    expect(normalizeUkPhone("notaphone")).toBeNull();
    expect(normalizeUkPhone("12345")).toBeNull();
  });

  it("leaves an explicit international number alone", () => {
    expect(normalizeUkPhone("+14155550101")).toBe("+14155550101");
  });
});

// Guards the lead-upload path, which shares this normalizer — these mirror the
// pre-existing leadsCsv tests so a change here can't silently regress uploads.
describe("regression: existing lead-upload behaviour is unchanged", () => {
  it("E.164 passthrough and formatting strip", () => {
    expect(normalizePhone("+14155550101")).toBe("+14155550101");
    expect(normalizePhone("+1 (415) 555-0101")).toBe("+14155550101");
    expect(normalizePhone("00447700900123")).toBe("+447700900123");
  });
  it("rejects non-E.164 without a default country", () => {
    expect(normalizePhone("5550101")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("notaphone")).toBeNull();
  });
  it("applies the default country code", () => {
    expect(normalizePhone("07887654321", "+44")).toBe("+447887654321");
    expect(normalizePhone("7887654321", "+44")).toBe("+447887654321");
    expect(normalizePhone("447887654321", "+44")).toBe("+447887654321");
    expect(normalizePhone("14155550101", "+1")).toBe("+14155550101");
  });
  it("an explicit country code always wins over the default", () => {
    expect(normalizePhone("+14155550101", "+44")).toBe("+14155550101");
  });
  it("detects Excel scientific-notation damage", () => {
    const r = normalizePhoneDetailed("4.47887E+11");
    expect(r.phone).toBeNull();
    expect(r.reason).toMatch(/scientific notation/i);
  });
  it("unwraps the spreadsheet text escape", () => {
    expect(normalizePhone('="+447700900123"')).toBe("+447700900123");
  });
});
