import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    initials: "SC",
    name: "Sarah Chen",
    role: "Growth Lead, Proptech UK",
    quote: "10× scale, 340% more bookings, and a never-sleeping call centre. Our team now focuses on closing, not dialling.",
  },
  {
    initials: "MR",
    name: "Marcus Reid",
    role: "CEO, SolarScale",
    quote: "Replaced our outsourced call centre. Cost dropped 94%, and we qualified 500 leads in the first week.",
  },
  {
    initials: "JT",
    name: "Jessica Torres",
    role: "Head of Marketing, RevoAI",
    quote: "We A/B tested scripts live and saw a 45% lift in conversions in 24 hours. The speed is unreal.",
  },
];

const getInitialsGradient = (index: number) => {
  const gradients = [
    "linear-gradient(135deg, #00D4FF, #00a8cc)",
    "linear-gradient(135deg, #FF6FD8, #d64ba8)",
    "linear-gradient(135deg, #00D4FF, #FF6FD8)",
  ];
  return gradients[index % gradients.length];
};

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-label">Real results</span>
          <h2 className="section-heading mt-3">
            What our <span className="text-brand-gradient">clients say</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="surface-card p-7 flex flex-col relative"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-slate-100" />

              <p className="text-slate-700 text-lg leading-relaxed flex-1 mb-6">
                “{t.quote}”
              </p>

              <div className="flex items-center gap-4 pt-5 border-t border-slate-100">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundImage: getInitialsGradient(i) }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
