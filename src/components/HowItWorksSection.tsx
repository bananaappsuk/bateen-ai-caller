import { motion } from "framer-motion";
import { UserPlus, Bot, UploadCloud, Bell } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign up",
    desc: "Create your account, start a 7-day free trial, no sales call required.",
  },
  {
    number: "02",
    icon: Bot,
    title: "Pick your agent",
    desc: "Choose a ready-made specialist or customise one for your exact workflow.",
  },
  {
    number: "03",
    icon: UploadCloud,
    title: "Upload your leads",
    desc: "Drop a CSV. The platform handles scheduling, retries, and quiet-hours automatically.",
  },
  {
    number: "04",
    icon: Bell,
    title: "Get hot-lead alerts",
    desc: "Receive an email with the full transcript and the best time to call back.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">How it works</span>
          <h2 className="section-heading mt-3">
            Live in <span className="text-brand-gradient">minutes, not weeks</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            No onboarding calls. No setup fees.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical connecting line (desktop) */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#00D4FF] via-[#FF6FD8] to-[#00D4FF] opacity-30 hidden md:block" />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Text side */}
                  <div className={`flex-1 md:text-${isEven ? "right" : "left"} pl-20 md:pl-0`}>
                    <span className="text-xs font-bold text-brand-gradient uppercase tracking-wider">
                      Step {step.number}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 mt-2 max-w-sm md:max-w-xs">
                      {step.desc}
                    </p>
                  </div>

                  {/* Icon bubble */}
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-0 w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-soft flex items-center justify-center z-10">
                    <div className="w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center">
                      <step.icon className="w-6 h-6" style={{ color: isEven ? "#00D4FF" : "#FF6FD8" }} />
                    </div>
                  </div>

                  {/* Spacer side */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
