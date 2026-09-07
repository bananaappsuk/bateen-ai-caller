// Lead-list CSV parsing for campaign uploads — uses papaparse (as VocalMax did)
// so quoted fields, commas-in-quotes and BOMs are handled correctly, unlike the
// naive split in the original CreateCampaignPage. Produces per-lead rows for the
// `leads` table: a validated E.164 phone, an optional display name, and every
// other column captured as Retell dynamic variables (custom_data).

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizePhoneDetailed } from "@/lib/phone";

// Phone normalisation lives in lib/phone.ts (dependency-free so the landing
// page can use it too); re-exported here for existing callers and tests.
export { normalizePhone, normalizePhoneDetailed, type PhoneNormalizeResult } from "@/lib/phone";

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

// Header matching is done on a normalized form (lowercase, alphanumerics only) so
// "Phone Number", "phone-number", "Mobile No." and "phone_number" all match.
const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const PHONE_KEYS = [
  "phone", "tonumber", "number", "mobile", "phonenumber", "mobilenumber", "tel",
  "telephone", "contactnumber", "contactno", "phoneno", "mobileno", "cell",
  "cellphone", "msisdn", "whatsapp",
].map(normHeader);
const NAME_KEYS = [
  "name", "fullname", "customername", "contact", "contactname", "firstname",
  "leadname", "clientname",
].map(normHeader);


// ---------- Lead-list templates ----------
// Single source of truth for the downloadable template, so what we hand out is
// guaranteed to parse back in (covered by a round-trip test).
export const TEMPLATE_HEADERS = ["name", "phone", "email", "company"] as const;
export const TEMPLATE_ROWS: string[][] = [
  ["Jane Doe", "+14155550101", "jane@example.com", "Acme Inc"],
  ["John Smith", "+14155550102", "john@example.com", "Globex"],
];

// CSV template. Phone values use Excel's `="…"` text escape so that opening the
// file in Excel doesn't treat a leading "+" as a formula or reformat the number;
// our parser unwraps it on the way back in. A BOM keeps Excel in UTF-8.
export function buildTemplateCsv(): string {
  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...TEMPLATE_ROWS.map(([name, phone, email, company]) =>
      [name, `="${phone}"`, email, company].join(","),
    ),
  ];
  return "﻿" + lines.join("\n") + "\n";
}

// Excel template. Phone cells are written as text cells, so Excel shows
// +447700900123 exactly and never rewrites it as scientific notation.
export function buildTemplateXlsx(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...TEMPLATE_ROWS]);
  // Force the phone column (B) to text so Excel preserves the leading "+".
  TEMPLATE_ROWS.forEach((_, i) => {
    const ref = `B${i + 2}`;
    if (sheet[ref]) {
      sheet[ref].t = "s";
      sheet[ref].z = "@";
    }
  });
  sheet["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Leads");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const SPREADSHEET_RE = /\.(xlsx|xlsm|xlsb|xls|ods)$/i;

// Read an uploaded lead list into CSV text. Excel/ODS workbooks are binary (a
// zip), so reading them as text yields garbage and no headers are found — parse
// them with SheetJS and convert the first sheet to CSV instead. Cell *display*
// text is used so a phone kept as text survives intact.
// Read a File's bytes. Uses arrayBuffer() where available and falls back to
// FileReader, so this works across browsers and test environments alike.
async function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsArrayBuffer(file);
  });
}

export async function fileToCsvText(file: File): Promise<string> {
  const isSpreadsheet =
    SPREADSHEET_RE.test(file.name) ||
    file.type.includes("spreadsheetml") ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.oasis.opendocument.spreadsheet";

  const buffer = await readArrayBuffer(file);

  // Plain CSV/TSV: decode as UTF-8 and drop a leading BOM (Excel adds one).
  if (!isSpreadsheet) {
    return new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
  }

  const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return "";
  return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false });
}

export function parseLeadsCsv(csvText: string, defaultCountryCode?: string): ParsedLeadsResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = (parsed.meta.fields ?? []).filter((h) => h !== "");
  const phoneColumn = headers.find((h) => PHONE_KEYS.includes(normHeader(h))) ?? null;
  const nameColumn = headers.find((h) => NAME_KEYS.includes(normHeader(h))) ?? null;
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
