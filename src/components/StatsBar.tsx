import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

type Stat = {
  target: number;
  suffix?: string;
  prefix?: string;
  display?: string; // overrides numeric format (e.g. "<1 min", "24/7")
  label: string;
};

const stats: Stat[] = [
  { target: 500, suffix: "+", label: "Calls per day, per campaign" },
  { target: 100, suffix: "%", label: "Of your list worked — every lead, every time" },
  { target: 1, display: "<1 min", label: 'From "interested" to an alert in your inbox' },
  { target: 24, display: "24/7", label: "Calling within the hours you set" },
];

const CountUp = ({ to, suffix = "", duration = 1600 }: { to: number; suffix?: string; duration?: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
};

const StatsBar = () => {
  return (
    <section className="relative py-16 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="surface-card p-6 text-center"
            >
              <div className="stat-number">
                {s.display ? s.display : <CountUp to={s.target} suffix={s.suffix} />}
              </div>
              <div className="mt-2 text-sm text-slate-600 leading-snug">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
