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
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
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

        <div className="relative max-w-5xl mx-auto">
          {/* Center timeline line (desktop only) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#00D4FF] via-[#FF6FD8] to-[#00D4FF] opacity-30 hidden md:block" />

          <div className="relative space-y-12 md:space-y-0">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative md:flex md:items-center md:min-h-[11rem]"
                >
                  {/* Left side card */}
                  <div
                    className={`md:w-[calc(50%-3rem)] ${
                      isEven ? "block md:order-1" : "hidden md:block md:order-1"
                    }`}
                  >
                    {isEven && (
                      <div className="surface-card p-6 md:p-8 text-left md:text-right">
                        <span className="text-xs font-bold text-brand-gradient uppercase tracking-[0.18em] block mb-3">
                          Step {step.number}
                        </span>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Center icon badge */}
                  <div className="hidden md:flex md:order-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-soft items-center justify-center z-10">
                    <div className="w-11 h-11 rounded-xl bg-brand-gradient-soft flex items-center justify-center">
                      <step.icon
                        className="w-5 h-5"
                        style={{ color: isEven ? "#00D4FF" : "#FF6FD8" }}
                      />
                    </div>
                  </div>

                  {/* Right side card */}
                  <div
                    className={`md:w-[calc(50%-3rem)] ${
                      isEven ? "hidden md:block md:order-3" : "block md:order-3"
                    }`}
                  >
                    {!isEven && (
                      <div className="surface-card p-6 md:p-8 text-left">
                        {/* Mobile icon badge */}
                        <div className="md:hidden w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
                          <step.icon
                            className="w-6 h-6"
                            style={{ color: "#FF6FD8" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-brand-gradient uppercase tracking-[0.18em] block mb-3">
                          Step {step.number}
                        </span>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mobile icon badge for even steps (when card is on the left conceptually) */}
                  {isEven && (
                    <div className="md:hidden absolute left-0 top-0 w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center">
                      <step.icon
                        className="w-6 h-6"
                        style={{ color: "#00D4FF" }}
                      />
                    </div>
                  )}
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
