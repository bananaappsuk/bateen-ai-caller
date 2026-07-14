// User-defined default dynamic variables (VocalMax's users/{uid}/settings/variables).
// These are merged into every outbound call's retell_llm_dynamic_variables as a
// base; per-lead CSV data overrides them. Usable as {{key}} placeholders in scripts.

const KEY = "ai_dynamic_variables";

export function loadDynamicVars(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDynamicVars(vars: Record<string, string>): void {
  localStorage.setItem(KEY, JSON.stringify(vars));
}
