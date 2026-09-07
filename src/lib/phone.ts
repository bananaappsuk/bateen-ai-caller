// Phone-number normalisation, shared by the lead-list parser, the landing-page
// demo-call form and the DNC list.
//
// Deliberately dependency-free: the landing page imports this, and pulling it
// from services/leadsCsv.ts would drag papaparse + SheetJS into the public
// marketing bundle.
//
// This is a UK product, so UK_COUNTRY_CODE is the default for any number typed
// without a country code — "07700 900123", "7700 900123" and "(07700) 900123"
// all normalise to +447700900123. A number that already carries an explicit
// "+" country code is left as-is.

export const UK_COUNTRY_CODE = "+44";

export const E164 = /^\+[1-9]\d{6,14}$/;

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

  // "+44 (0)7700 900123" — the bracketed trunk prefix is a UK/European writing
  // convention; once the brackets are stripped that 0 would sit between the
  // country code and the national number and make it undiallable.
  if (defaultCountryCode) {
    const cc = defaultCountryCode.replace(/^\+/, "");
    p = p.replace(new RegExp(`^\\+${cc}0+`), `+${cc}`);
  }

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

// A UK number in E.164 is +44 followed by 9 or 10 national digits (mobiles and
// London are 10, a few area codes are 9). Without this a short entry like
// "12345" would normalise to the well-formed but undiallable "+4412345".
const UK_E164 = /^\+44\d{9,10}$/;

// UK-default convenience wrapper for the places that only ever take UK input.
// Anything typed without a country code is treated as UK and length-checked; a
// number given with an explicit "+" country code is passed through as-is.
export function normalizeUkPhone(raw: string): string | null {
  const phone = normalizePhoneDetailed(raw, UK_COUNTRY_CODE).phone;
  if (!phone) return null;
  if (phone.startsWith(UK_COUNTRY_CODE)) return UK_E164.test(phone) ? phone : null;
  return phone;
}
