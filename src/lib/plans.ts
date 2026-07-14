// Plan + credit configuration — values from VocalMax. Stripe price IDs are
// per-account, so they come from env (set VITE_STRIPE_PRICE_* after creating the
// products in your Stripe account); the plan metadata below is fixed.
export type PlanTier = "lite" | "starter" | "growth" | "scale";

export interface Plan {
  tier: PlanTier;
  name: string;
  monthly: number; // USD / month
  annual: number; // USD / year (≈ 10× monthly — "two months free")
  credits: number; // included credits / month (1 credit ≈ 1 minute)
  concurrency: number;
  maxAgents: number; // Infinity = unlimited
  maxLeadsPerUpload: number;
  tagline: string;
  hasTrial: boolean;
  priceMonth?: string;
  priceYear?: string;
}

export const CREDIT_PRICE_CENTS = 28; // $0.28 / credit top-up
export const TOPUP_PRESETS = [100, 500, 1000, 2500, 5000];
export const INF = Number.MAX_SAFE_INTEGER;

const env = import.meta.env;

export const PLANS: Plan[] = [
  {
    tier: "lite",
    name: "Lite",
    monthly: 29,
    annual: 290,
    credits: 50,
    concurrency: 2,
    maxAgents: 1,
    maxLeadsPerUpload: 50,
    tagline: "Dip a toe in — pay monthly, no trial",
    hasTrial: false,
    priceMonth: env.VITE_STRIPE_PRICE_LITE_MONTH,
    priceYear: env.VITE_STRIPE_PRICE_LITE_YEAR,
  },
  {
    tier: "starter",
    name: "Starter",
    monthly: 249,
    annual: 2490,
    credits: 700,
    concurrency: 5,
    maxAgents: 2,
    maxLeadsPerUpload: 250,
    tagline: "Your first reactivation campaigns",
    hasTrial: true,
    priceMonth: env.VITE_STRIPE_PRICE_STARTER_MONTH,
    priceYear: env.VITE_STRIPE_PRICE_STARTER_YEAR,
  },
  {
    tier: "growth",
    name: "Growth",
    monthly: 699,
    annual: 6990,
    credits: 2250,
    concurrency: 10,
    maxAgents: 5,
    maxLeadsPerUpload: 1000,
    tagline: "Most popular — for teams working real volume",
    hasTrial: true,
    priceMonth: env.VITE_STRIPE_PRICE_GROWTH_MONTH,
    priceYear: env.VITE_STRIPE_PRICE_GROWTH_YEAR,
  },
  {
    tier: "scale",
    name: "Scale",
    monthly: 1999,
    annual: 19990,
    credits: 7000,
    concurrency: 20,
    maxAgents: INF,
    maxLeadsPerUpload: INF,
    tagline: "High volume, every feature",
    hasTrial: true,
    priceMonth: env.VITE_STRIPE_PRICE_SCALE_MONTH,
    priceYear: env.VITE_STRIPE_PRICE_SCALE_YEAR,
  },
];

export const planByTier = (tier: string | null | undefined): Plan | undefined =>
  PLANS.find((p) => p.tier === tier);

export const annualDiscountPct = (p: Plan): number =>
  Math.round((1 - p.annual / (p.monthly * 12)) * 100);

export interface PlanLimits {
  concurrency: number;
  maxAgents: number;
  maxLeadsPerUpload: number;
}

// VocalMax: a user with no active plan gets unlimited limits (they are gated on
// credits instead); a subscribed user gets their tier's caps.
export function limitsFor(tier: string | null | undefined): PlanLimits {
  const p = planByTier(tier);
  if (!p) return { concurrency: INF, maxAgents: INF, maxLeadsPerUpload: INF };
  return { concurrency: p.concurrency, maxAgents: p.maxAgents, maxLeadsPerUpload: p.maxLeadsPerUpload };
}

export const isUnlimited = (n: number) => n >= INF;
