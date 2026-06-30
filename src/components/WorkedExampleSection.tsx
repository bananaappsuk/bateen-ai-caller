import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const fmt = (n: number) => n.toLocaleString("en-US");

const WorkedExampleSection = () => {
  const [leads, setLeads] = useState(1000);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [animatedLeads, setAnimatedLeads] = useState(0);

  // Count up the displayed dormant-leads number on first view, then keep in sync with slider.
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!inView || hasAnimated) return;
    const start = performance.now();
    const duration = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedLeads(Math.round(leads * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setHasAnimated(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    if (hasAnimated) setAnimatedLeads(leads);
  }, [leads, hasAnimated]);

  const revived = Math.round(leads * 0.03);

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-label">A worked example</span>
          <h2 className="section-heading mt-3">
            See the math <span className="text-brand-gradient">for yourself</span>
          </h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto surface-card-lg p-6 md:p-10"
        >
          {/* Row 1 — Dormant leads (input) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 md:p-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <label htmlFor="dormant" className="text-sm font-medium text-slate-600">
                Dormant leads in your CRM
              </label>
              <div className="text-3xl md:text-4xl font-bold text-brand-gradient tabular-nums">
                {fmt(animatedLeads)}
              </div>
            </div>
            <input
              id="dormant"
              type="range"
              min={100}
              max={10000}
              step={100}
              value={leads}
              onChange={(e) => setLeads(Number(e.target.value))}
              className="w-full accent-[#FF6FD8] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>100</span>
              <span>10,000</span>
            </div>
          </div>

          {/* Row 2 — Multiplier */}
          <div className="flex items-center justify-center my-4">
            <div className="text-2xl font-bold text-slate-400">×</div>
          </div>
          <div className="rounded-xl border border-slate-100 p-5 md:p-6 text-center">
            <div className="text-sm text-slate-600">revived in real conversation</div>
            <div className="text-3xl md:text-4xl font-bold text-brand-gradient mt-1">3%</div>
          </div>

          {/* Row 3 — Result */}
          <div className="flex items-center justify-center my-4">
            <div className="text-2xl font-bold text-slate-400">=</div>
          </div>
          <motion.div
            key={revived}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="rounded-xl bg-brand-gradient p-[1.5px]"
          >
            <div className="rounded-[10px] bg-white p-5 md:p-6 text-center">
              <div className="text-sm text-slate-600">qualified conversations, booked for you</div>
              <div className="text-4xl md:text-5xl font-bold text-brand-gradient mt-1 tabular-nums">
                {fmt(revived)}
              </div>
            </div>
          </motion.div>

          <p className="mt-7 text-center text-sm text-slate-500 leading-relaxed">
            Close just two of them and the campaign has paid for itself. Working 1,000 leads
            typically uses 1,000–2,000 credits.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WorkedExampleSection;
