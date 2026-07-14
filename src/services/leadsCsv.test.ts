import { describe, it, expect } from "vitest";
import { parseLeadsCsv, normalizePhone } from "./leadsCsv";

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
