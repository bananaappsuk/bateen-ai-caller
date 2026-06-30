import { motion } from "framer-motion";
import { Brain, Bell, Rocket } from "lucide-react";

const ThreeThingsSection = () => {
  const barData = [
    { day: "Mon", value: 180 },
    { day: "Tue", value: 240 },
    { day: "Wed", value: 310 },
    { day: "Thu", value: 270 },
    { day: "Fri", value: 247 },
  ];
  const max = Math.max(...barData.map((b) => b.value));

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-label">What you get</span>
          <h2 className="section-heading mt-3">
            Three things that <span className="text-brand-gradient">change everything</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            The full outbound stack, handled by AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 — AI Qualification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="surface-card p-7 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Brain className="w-6 h-6" style={{ color: "#00D4FF" }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">AI Qualification</h3>
            <p className="text-slate-600 mb-5">
              Every call scored, classified, summarised automatically.
            </p>
            <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-gradient mb-2">
                AI Decision
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Lead shows strong intent. Recommended: immediate callback.
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Score</span>
                <span className="text-lg font-bold text-brand-gradient">9/10</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "90%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-brand-gradient"
                />
              </div>
            </div>
          </motion.div>

          {/* Card 2 — Instant Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="surface-card p-7 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Bell className="w-6 h-6" style={{ color: "#FF6FD8" }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Alerts</h3>
            <p className="text-slate-600 mb-5">
              Real-time email alerts the second a lead shows interest.
            </p>
            <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  🔥 Hot Lead
                </span>
                <span className="text-xs text-slate-500">Just now</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">Sarah Mitchell</p>
              <p className="text-sm text-slate-600 italic mt-1">
                "I'm very interested, when can we talk?"
              </p>
            </div>
          </motion.div>

          {/* Card 3 — Scale Instantly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="surface-card p-7 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Rocket className="w-6 h-6" style={{ color: "#00D4FF" }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Scale Instantly</h3>
            <p className="text-slate-600 mb-5">
              Go from 50 to 1,000+ calls/day, no hiring.
            </p>
            <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-end justify-between gap-2 h-24">
                {barData.map((b, i) => (
                  <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(b.value / max) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                      className="w-full rounded-t-md bg-brand-gradient"
                    />
                    <span className="text-[10px] text-slate-500">{b.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-xs text-slate-500">Call volume this week</span>
                <span className="text-sm font-bold text-brand-gradient">1,247 total</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ThreeThingsSection;
