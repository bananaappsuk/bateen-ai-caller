// Single shared source of truth for the user's credit balance. Every page
// that shows a "N Credits" pill reads from this context instead of running
// its own getBillingAccount()/getCredits() fetch — that duplication was the
// root cause of pages disagreeing with each other (Academy/Support never
// fetched at all and simply hardcoded "0 Credits"; other pages each held
// their own copy that could drift out of sync).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getBillingAccount } from "@/services/creditsService";
import { useAuth } from "@/lib/auth";

interface CreditsContextValue {
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: 0,
  loading: true,
  refreshCredits: async () => {},
});

export const useCredits = () => useContext(CreditsContext);

// Keep the balance reasonably live without a full realtime subscription —
// matches the polling cadence already used elsewhere in this app (the dialer
// engine ticks every 10s), so a campaign spending credits in the background
// still shows up on other open pages/tabs within a few seconds.
const POLL_INTERVAL_MS = 20_000;

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    try {
      const account = await getBillingAccount();
      if (id !== requestId.current) return; // a newer refresh already landed
      setCredits(account?.credits ?? 0);
    } catch {
      // Keep the last known value on a transient fetch error.
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshCredits, POLL_INTERVAL_MS);
    const onFocus = () => refreshCredits();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, refreshCredits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refreshCredits }}>{children}</CreditsContext.Provider>
  );
}
