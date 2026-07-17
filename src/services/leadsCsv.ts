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

export interface SkippedRow {
  row: number; // 1-based, matching the row number a user sees in Excel (header = row 1)
  value: string;
  reason: string;
}

export interface ParsedLeadsResult {
  leads: ParsedLead[];
  invalidCount: number;
  skipped: SkippedRow[];
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
// Excel's "General" number format renders/saves any long digit string (like a
// phone number) as lossy scientific notation, e.g. 4.47887E+11 — the original
// digits are gone for good; this can only be detected, never recovered.
const SCIENTIFIC_NOTATION = /^\d(\.\d+)?e\+?\d+$/i;

export interface PhoneNormalizeResult {
  phone: string | null;
  reason?: string;
}

// Normalize a raw phone string to E.164, with a human-readable reason when it
// can't be. `defaultCountryCode` (e.g. "+44") is used as a fallback to fix
// numbers that are missing their country code (a local "07700 900123" style
// entry, or one with the country code but no leading "+").
export function normalizePhoneDetailed(raw: string, defaultCountryCode?: string): PhoneNormalizeResult {
  const original = (raw ?? "").trim();
  if (!original) return { phone: null, reason: "Phone number is empty." };

  // Unwrap the `="…"` text-escape some spreadsheets (and our own template)
  // use to stop Excel from touching a numeric-looking value.
  const formulaMatch = /^="(.*)"$/.exec(original);
  let p = formulaMatch ? formulaMatch[1] : original;

  if (SCIENTIFIC_NOTATION.test(p.replace(/\s/g, ""))) {
    return {
      phone: null,
      reason:
        `"${original}" looks like Excel converted this number to scientific notation — the original digits ` +
        "are lost and can't be recovered. Format the phone column as Text in Excel (or open with a leading " +
        "apostrophe, e.g. '+447700900123) before entering numbers, then re-upload.",
    };
  }

  p = p.replace(/[\s()\-.']/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (E164.test(p)) return { phone: p };

  if (defaultCountryCode) {
    const ccDigits = defaultCountryCode.replace(/^\+/, "");
    const digits = p.replace(/\D/g, "");
    if (digits) {
      const candidate = digits.startsWith(ccDigits)
        ? `+${digits}`
        : `+${ccDigits}${digits.replace(/^0/, "")}`;
      if (E164.test(candidate)) return { phone: candidate };
    }
  }

  return {
    phone: null,
    reason: `"${original}" isn't a valid phone number. Use international format, e.g. +447700900123.`,
  };
}

export function normalizePhone(raw: string, defaultCountryCode?: string): string | null {
  return normalizePhoneDetailed(raw, defaultCountryCode).phone;
}

export function parseLeadsCsv(csvText: string, defaultCountryCode?: string): ParsedLeadsResult {
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
  const skipped: SkippedRow[] = [];

  rows.forEach((row, i) => {
    const rawPhone = phoneColumn ? row[phoneColumn] ?? "" : "";
    const { phone, reason } = phoneColumn
      ? normalizePhoneDetailed(rawPhone, defaultCountryCode)
      : { phone: null, reason: "No phone column found in this file." };
    if (!phone) {
      skipped.push({ row: i + 2, value: rawPhone.trim(), reason: reason ?? "Invalid phone number." });
      return;
    }
    const customData: Record<string, string> = {};
    for (const h of headers) {
      if (h === phoneColumn) continue;
      const v = (row[h] ?? "").trim();
      if (v) customData[h] = v;
    }
    const name = nameColumn ? (row[nameColumn] ?? "").trim() || null : null;
    leads.push({ name, phone, customData });
  });

  return { leads, invalidCount: skipped.length, skipped, totalRows: rows.length, headers, phoneColumn };
}
