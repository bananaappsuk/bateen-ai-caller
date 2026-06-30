import { motion } from "framer-motion";
import { Phone, ArrowRight, Sparkles } from "lucide-react";

const BOOK_DEMO_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qcRUglD8qicU4kzrD-rFtlyP94h0JaZnv_-41rtPM-BkStaGx-mBvWG0nOP8EzQzaaMgYk8Qm";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-white">
      {/* Animated soft gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <motion.div
          aria-hidden
          className="absolute -top-32 -left-32 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle at center, #00D4FF 0%, transparent 60%)",
          }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -right-32 w-[44rem] h-[44rem] rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle at center, #FF6FD8 0%, transparent 60%)",
          }}
          animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Converging dashed lines (perspective effect) */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full opacity-[0.35]"
          preserveAspectRatio="none"
          viewBox="0 0 1000 800"
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" x2="0" y1="1" y2="0">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0" />
              <stop offset="40%" stopColor="#00D4FF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FF6FD8" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {Array.from({ length: 14 }).map((_, i) => {
            const startX = (i / 13) * 1000;
            return (
              <motion.line
                key={i}
                x1={startX}
                y1={800}
                x2={500}
                y2={300}
                stroke="url(#lineGrad)"
                strokeWidth={1}
                strokeDasharray="6 10"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 2.2,
                  delay: i * 0.06,
                  ease: "easeOut",
                }}
              />
            );
          })}
          {/* moving dashes for subtle motion */}
          <motion.circle
            cx="500"
            cy="300"
            r="3"
            fill="#FF6FD8"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </svg>

        {/* horizon glow */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[37%] h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), rgba(255,111,216,0.6), transparent)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Thin top CTA bar */}
        <motion.a
          href={BOOK_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="group inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white shadow-soft border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:shadow-soft-lg transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
          </span>
          <span>
            <span className="text-brand-gradient font-semibold">Live demo</span>
            {" — our AI will call your phone in seconds"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black leading-[1.05] tracking-tight mb-6 text-slate-900 max-w-5xl mx-auto">
            Find the buyers hiding in your{" "}
            <span className="text-brand-gradient">dead leads</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 font-body leading-relaxed">
            AI calls every lead, re-qualifies them in natural conversation, and
            alerts you the moment someone's ready.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base md:text-lg"
            >
              <Phone className="w-5 h-5" />
              Get a live demo call
            </a>
            <a
              href="https://vocalmax.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-base md:text-lg"
            >
              <Sparkles className="w-5 h-5 text-brand-pink" />
              Start free trial
            </a>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Our AI rings you in seconds, no signup needed · 7-day free trial on
            paid plans, cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
