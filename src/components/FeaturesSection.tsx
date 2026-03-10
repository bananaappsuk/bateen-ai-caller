import { motion } from "framer-motion";
import { Bot, UploadCloud, Brain, LineChart, CreditCard, Globe } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Voice Agents",
    desc: "Create custom AI agents with your own scripts and voices. Natural conversations that feel human.",
  },
  {
    icon: UploadCloud,
    title: "Campaign Management",
    desc: "Upload contact lists via CSV and launch bulk calling campaigns in minutes.",
  },
  {
    icon: Brain,
    title: "Intelligent Lead Qualification",
    desc: "AI classifies leads as Interested, Not Interested, Requested Callback, or Voicemail automatically.",
  },
  {
    icon: LineChart,
    title: "Real-Time Analytics",
    desc: "Track call performance, lead status, and conversion metrics with live dashboards.",
  },
  {
    icon: CreditCard,
    title: "Pay-As-You-Use",
    desc: "Credit-based system — only 20p per minute. No monthly subscriptions, no hidden fees.",
  },
  {
    icon: Globe,
    title: "Multi-Country Support",
    desc: "Make calls to UK, UAE, US, Canada, Australia, and 50+ countries worldwide.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">Powerful Features</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to automate outbound calling at scale
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={item}
              className="glass-card rounded-2xl p-8 group hover:shadow-glow transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/30 transition-colors">
                <f.icon className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
