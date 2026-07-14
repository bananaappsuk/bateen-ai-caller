// Lead-list CSV parsing for campaign uploads — uses papaparse (as VocalMax did)
// so quoted fields, commas-in-quotes and BOMs are handled correctly, unlike the
// naive split in the original CreateCampaignPage. Produces per-lead rows for the
// `leads` table: a validated E.164 phone, an optional display name, and every
// other column captured as Retell dynamic variables (custom_data).

import Papa from "papaparse";

export interface ParsedLead {
  name: string | null;
  phone: string;
  customData: Record<string, string>;
}

export interface ParsedLeadsResult {
  leads: ParsedLead[];
  invalidCount: number;
  totalRows: number;
  headers: string[];
  phoneColumn: string | null;
}

const PHONE_KEYS = [
  "phone", "to_number", "number", "mobile", "phone_number", "tel", "telephone",
];
const NAME_KEYS = [
  "name", "full_name", "fullname", "customer_name", "contact", "contact_name",
];
const E164 = /^\+[1-9]\d{6,14}$/;

// Normalize a raw phone string to E.164, or null if it can't be. Strips spaces,
// brackets, dashes and dots; converts a leading "00" international prefix to "+".
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.trim().replace(/[\s()\-.]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  return E164.test(p) ? p : null;
}

export function parseLeadsCsv(csvText: string): ParsedLeadsResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const phoneColumn = headers.find((h) => PHONE_KEYS.includes(h)) ?? null;
  const nameColumn = headers.find((h) => NAME_KEYS.includes(h)) ?? null;
  const rows = parsed.data ?? [];

  const leads: ParsedLead[] = [];
  let invalidCount = 0;

  for (const row of rows) {
    const phone = phoneColumn ? normalizePhone(row[phoneColumn] ?? "") : null;
    if (!phone) {
      invalidCount++;
      continue;
    }
    const customData: Record<string, string> = {};
    for (const h of headers) {
      if (h === phoneColumn) continue;
      const v = (row[h] ?? "").trim();
      if (v) customData[h] = v;
    }
    const name = nameColumn ? (row[nameColumn] ?? "").trim() || null : null;
    leads.push({ name, phone, customData });
  }

  return { leads, invalidCount, totalRows: rows.length, headers, phoneColumn };
}
