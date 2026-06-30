import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Stat = {
  value: number;
  suffix?: string;
  prefix?: string;
  display?: string; // overrides numeric display (e.g. "<1")
  label: string;
};

const stats: Stat[] = [
  { value: 500, suffix: "+", label: "Calls per day, per campaign" },
  { value: 100, suffix: "%", label: "Of your list worked — every lead, every time" },
  { value: 1, display: "<1 min", label: 'From "interested" to an alert in your inbox' },
  { value: 24, suffix: "/7", label: "Calling within the hours you set" },
];

const Counter = ({ to, suffix = "", prefix = "", display, start }: {
  to: number; suffix?: string; prefix?: string; display?: string; start: boolean;
}) => {
  const [text, setText] = useState(display ?? `${prefix}0${suffix}`);

  useEffect(() => {
    if (!start || display) {
      if (display) setText(display);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setText(`${prefix}${Math.round(v)}${suffix}`),
    });
    return () => controls.stop();
  }, [start, to, suffix, prefix, display]);

  return <span>{text}</span>;
};

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section className="relative bg-white py-14 md:py-20">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className="surface-card-lg px-6 py-10 md:px-10 md:py-12 bg-brand-gradient-soft"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="stat-number tabular-nums">
                  <Counter
                    to={s.value}
                    suffix={s.suffix}
                    prefix={s.prefix}
                    display={s.display}
                    start={inView}
                  />
                </div>
                <p className="mt-2 text-sm md:text-base text-slate-600 max-w-[14rem]">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
