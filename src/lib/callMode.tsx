import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Outbound (we ring leads from campaigns) and inbound (people ring us and an
// agent answers) are separate products sharing one platform: different agents,
// different flows, different data. The dashboard switches wholesale between
// them rather than mixing the two on every screen.
export type CallMode = "outbound" | "inbound";

const STORAGE_KEY = "ai_telecaller_call_mode";

interface CallModeValue {
  mode: CallMode;
  setMode: (mode: CallMode) => void;
  isInbound: boolean;
}

const CallModeContext = createContext<CallModeValue | undefined>(undefined);

function readStoredMode(): CallMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "inbound" ? "inbound" : "outbound";
  } catch {
    // Private browsing / blocked storage — outbound is the safe default since
    // it's what every existing account already uses.
    return "outbound";
  }
}

export const CallModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<CallMode>(readStoredMode);

  const setMode = useCallback((next: CallMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the switch still works for this session.
    }
  }, []);

  // Keep tabs in step, so switching mode in one doesn't leave another showing
  // the opposite product's data.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setModeState(e.newValue === "inbound" ? "inbound" : "outbound");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ mode, setMode, isInbound: mode === "inbound" }), [mode, setMode]);
  return <CallModeContext.Provider value={value}>{children}</CallModeContext.Provider>;
};

export function useCallMode(): CallModeValue {
  const ctx = useContext(CallModeContext);
  if (!ctx) throw new Error("useCallMode must be used inside a CallModeProvider");
  return ctx;
}
