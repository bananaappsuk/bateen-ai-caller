import { motion } from "framer-motion";
import { Phone, Zap, BarChart3 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import StatsBar from "@/components/StatsBar";

const stats = [
  { icon: Phone, value: "300+", label: "Businesses Served" },
  { icon: Zap, value: "1M+", label: "Calls Made" },
  { icon: BarChart3, value: "1 Year+", label: "Proven Track Record" },
];

const DEMO_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qcRUglD8qicU4kzrD-rFtlyP94h0JaZnv_-41rtPM-BkStaGx-mBvWG0nOP8EzQzaaMgYk8Qm";

const HeroSection = () => {
  return (
    <>
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden pt-16 md:pt-20">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-white/70" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Animated soft gradient blobs */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #00D4FF 0%, transparent 70%)" }}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #FF6FD8 0%, transparent 70%)" }}
          animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Converging dashed perspective lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden"
          style={{ perspective: "800px" }}
        >
          <div
            className="relative w-full h-[70%]"
            style={{ transform: "rotateX(60deg)", transformOrigin: "center bottom" }}
          >
            {Array.from({ length: 11 }).map((_, i) => {
              const offset = (i - 5) * 10;
              return (
                <motion.div
                  key={`v-${i}`}
                  className="absolute top-0 bottom-0 border-l border-dashed"
                  style={{
                    left: `${50 + offset}%`,
                    borderColor: "rgba(0,212,255,0.25)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.15 }}
                />
              );
            })}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`h-${i}`}
                className="absolute left-0 right-0 border-t border-dashed"
                style={{
                  top: `${(i + 1) * 12}%`,
                  borderColor: "rgba(255,111,216,0.22)",
                }}
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm shadow-soft">
              <span className="text-sm font-medium text-slate-700">
                🚀 AI-Powered Outbound Calling Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black leading-tight mb-6">
              <span className="text-brand-gradient">Automate Your</span>
              <br />
              <span className="text-slate-900">Phone Outreach</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 font-body leading-relaxed">
              AI telecaller makes hundreds of simultaneous outbound calls with natural-sounding
              AI voice agents. Qualify leads, books meetings, and scale your outreach automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Get a live demo call
              </a>
              <a
                href="https://vocalmax.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Start free trial
              </a>
            </div>
            <p className="text-sm text-slate-500 mb-12">
              Our AI rings you in seconds, no signup needed · 7-day free trial on paid plans, cancel anytime
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div key={i} className="surface-card p-6 text-center">
                <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: "#00D4FF" }} />
                <div className="text-3xl font-display font-bold text-brand-gradient mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <StatsBar />
    </>
  );
};

export default HeroSection;
