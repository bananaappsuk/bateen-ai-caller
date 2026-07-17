import { describe, it, expect } from "vitest";
import { parseLeadsCsv, normalizePhone, normalizePhoneDetailed } from "./leadsCsv";

describe("normalizePhone", () => {
  it("accepts E.164 and strips formatting", () => {
    expect(normalizePhone("+14155550101")).toBe("+14155550101");
    expect(normalizePhone("+1 (415) 555-0101")).toBe("+14155550101");
  });
  it("converts a 00 international prefix to +", () => {
    expect(normalizePhone("00447700900123")).toBe("+447700900123");
  });
  it("rejects non-E.164 input", () => {
    expect(normalizePhone("5550101")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("notaphone")).toBeNull();
  });
  it("fixes a local number using the default country code", () => {
    expect(normalizePhone("07887654321", "+44")).toBe("+447887654321");
    expect(normalizePhone("7887654321", "+44")).toBe("+447887654321");
  });
  it("fixes a number that already has the country code but no +", () => {
    expect(normalizePhone("447887654321", "+44")).toBe("+447887654321");
    expect(normalizePhone("14155550101", "+1")).toBe("+14155550101");
  });
  it("does not touch a number that's already valid", () => {
    expect(normalizePhone("+14155550101", "+44")).toBe("+14155550101");
  });
  it("flags Excel scientific-notation corruption with a specific reason instead of a generic one", () => {
    const r = normalizePhoneDetailed("4.47887E+11");
    expect(r.phone).toBeNull();
    expect(r.reason).toMatch(/scientific notation/i);
  });
  it("unwraps the Excel formula-escape trick", () => {
    expect(normalizePhone('="+447700900123"')).toBe("+447700900123");
  });
});

describe("parseLeadsCsv", () => {
  it("parses valid rows and captures extra columns as custom data", () => {
    const csv =
      "name,phone,email,company\n" +
      "Jane Doe,+14155550101,jane@example.com,Acme Inc\n" +
      "John Smith,+14155550102,john@example.com,Globex\n";
    const r = parseLeadsCsv(csv);
    expect(r.leads).toHaveLength(2);
    expect(r.invalidCount).toBe(0);
    expect(r.phoneColumn).toBe("phone");
    expect(r.leads[0]).toEqual({
      name: "Jane Doe",
      phone: "+14155550101",
      customData: { name: "Jane Doe", email: "jane@example.com", company: "Acme Inc" },
    });
  });

  it("skips rows with invalid phone numbers and counts them", () => {
    const csv = "name,phone\nGood,+14155550101\nBad,555\nEmpty,\n";
    const r = parseLeadsCsv(csv);
    expect(r.leads).toHaveLength(1);
    expect(r.invalidCount).toBe(2);
  });

  it("reports a row number and reason for every skipped row", () => {
    const csv = "name,phone\nGood,+14155550101\nCorrupted,4.47887E+11\nBad,notanumber\n";
    const r = parseLeadsCsv(csv);
    expect(r.leads).toHaveLength(1);
    expect(r.skipped).toEqual([
      { row: 3, value: "4.47887E+11", reason: expect.stringMatching(/scientific notation/i) },
      { row: 4, value: "notanumber", reason: expect.stringMatching(/isn't a valid phone number/) },
    ]);
  });

  it("uses the default country code to recover leads with local-format numbers", () => {
    const csv = "name,phone\nAlice,07887654321\nBob,7887654321\n";
    const r = parseLeadsCsv(csv, "+44");
    expect(r.leads).toHaveLength(2);
    expect(r.leads.map((l) => l.phone)).toEqual(["+447887654321", "+447887654321"]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,phone,company\n"Doe, Jane",+14155550101,"Acme, Inc"\n';
    const r = parseLeadsCsv(csv);
    expect(r.leads).toHaveLength(1);
    expect(r.leads[0].name).toBe("Doe, Jane");
    expect(r.leads[0].customData.company).toBe("Acme, Inc");
  });

  it("detects alternate phone column names", () => {
    const csv = "customer_name,to_number\nAlice,+447700900123\n";
    const r = parseLeadsCsv(csv);
    expect(r.phoneColumn).toBe("to_number");
    expect(r.leads[0]).toEqual({
      name: "Alice",
      phone: "+447700900123",
      customData: { customer_name: "Alice" },
    });
  });
});
