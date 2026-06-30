import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, Calendar } from "lucide-react";

const plans = [
  {
    name: "Lite",
    monthlyPrice: 29,
    annualPrice: 24,
    credits: 50,
    agents: 1,
    simultaneousCalls: 2,
    leadsUpload: 50,
    support: "Email support",
    cta: "Start with Lite",
    popular: false,
    trial: false,
    href: "/signup",
  },
  {
    name: "Starter",
    monthlyPrice: 249,
    annualPrice: 207,
    credits: 700,
    agents: 2,
    simultaneousCalls: 5,
    leadsUpload: 250,
    support: "Ready-made agents + email support",
    cta: "Start 7-day free trial",
    popular: false,
    trial: true,
    href: "/signup",
  },
  {
    name: "Growth",
    monthlyPrice: 699,
    annualPrice: 583,
    credits: 2250,
    agents: 5,
    simultaneousCalls: 10,
    leadsUpload: 1000,
    support: "Priority support",
    cta: "Start 7-day free trial",
    popular: true,
    trial: true,
    href: "/signup",
  },
  {
    name: "Scale",
    monthlyPrice: 1999,
    annualPrice: 1666,
    credits: 7000,
    agents: "Unlimited",
    simultaneousCalls: 20,
    leadsUpload: "Unlimited",
    support: "White-label + priority support",
    cta: "Start 7-day free trial",
    popular: false,
    trial: true,
    href: "/signup",
  },
];

const subtextBullets = [
  "1 credit ≈ 1 min calling",
  "top up at $0.28/credit",
  "dedicated numbers $3/mo",
  "pay annually get 2 months free",
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-6">
          <span className="section-label">Pricing</span>
          <h2 className="section-heading mt-3">
            Simple pricing.{" "}
            <span className="text-brand-gradient">One credit ≈ one minute.</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-12 text-sm text-slate-600">
          {subtextBullets.map((bullet) => (
            <span
              key={bullet}
              className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-soft"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gradient" />
              {bullet}
            </span>
          ))}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <span className={`text-sm font-medium ${!annual ? "text-slate-900" : "text-slate-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-14 h-7 rounded-full bg-slate-200 transition-colors duration-200"
            aria-label="Toggle annual billing"
            style={{ backgroundColor: annual ? "#FF6FD8" : "#e2e8f0" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{ transform: annual ? "translateX(28px)" : "translateX(0)" }}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-slate-900" : "text-slate-500"}`}>
            Annual
          </span>
          {annual && (
            <span className="text-xs font-semibold text-brand-pink bg-white px-2 py-1 rounded-full border border-slate-100 shadow-soft">
              Save 2 months
            </span>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-200 ${
                plan.popular
                  ? "bg-white border-brand-pink/30 shadow-soft-lg scale-[1.02]"
                  : "bg-white border-slate-100 shadow-soft hover:shadow-soft-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-3 py-1 rounded-full bg-brand-gradient shadow-soft">
                    <Sparkles className="w-3 h-3" />
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    ${annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                {annual && (
                  <p className="text-xs text-slate-500 mt-1">
                    Billed annually (${plan.annualPrice * 12}/year)
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-3 mb-6">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">{plan.credits}</strong> credits/month
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">{plan.agents}</strong> agent{plan.agents !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">{plan.simultaneousCalls}</strong> simultaneous calls
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">{plan.leadsUpload}</strong> leads/upload
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <span>{plan.support}</span>
                </div>
              </div>

              <Link
                to={plan.href}
                className={`w-full text-center ${
                  plan.popular ? "btn-primary" : "btn-secondary"
                }`}
              >
                {plan.cta}
                {plan.trial && <Sparkles className="w-4 h-4" />}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Notes */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <p className="text-sm text-slate-500">
            7-day free trial on Starter, Growth and Scale · Card required, no charge until day 8 · Cancel anytime.
          </p>
          <p className="text-sm text-slate-500">
            Need other countries or higher volume?{" "}
            <a
              href="https://www.nextgentechs.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-cyan hover:text-brand-pink font-medium transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>

        {/* Done For You */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="surface-card-lg p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-pink mb-3">
                <Calendar className="w-4 h-4" />
                Done For You
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                We build, script, clean and run your first campaign with you.
              </h3>
              <p className="text-slate-600">
                Our team will build your agent, write the script, clean your list and run your first campaign with you.
              </p>
            </div>
            <a
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qcRUglD8qicU4kzrD-rFtlyP94h0JaZnv_-41rtPM-BkStaGx-mBvWG0nOP8EzQzaaMgYk8Qm"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary whitespace-nowrap"
            >
              Book a demo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
