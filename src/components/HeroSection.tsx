import { motion } from "framer-motion";
import { Phone, Zap, BarChart3 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import ContactDialog from "@/components/ContactDialog";

const stats = [
  { icon: Phone, value: "300+", label: "Businesses Served" },
  { icon: Zap, value: "1M+", label: "Calls Made" },
  { icon: BarChart3, value: "1 Year+", label: "Proven Track Record" },
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border-glow bg-muted/50 backdrop-blur-sm">
            <span className="text-sm font-medium text-muted-foreground">
              🚀 AI-Powered Outbound Calling Platform
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black leading-tight mb-6">
            <span className="text-gradient">Automate Your</span>
            <br />
            <span className="text-foreground">Phone Outreach</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 font-body leading-relaxed">
            Bateen AI Caller makes hundreds of simultaneous outbound calls with natural-sounding
            AI voice agents. Qualify leads, book meetings, and scale your outreach — automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <ContactDialog>
              <button className="bg-gradient-cta text-primary-foreground px-8 py-3.5 rounded-lg text-lg font-bold shadow-glow-lg hover:opacity-90 transition-all">
                Schedule a Demo
              </button>
            </ContactDialog>
            <a
              href="#how-it-works"
              className="glass-card px-8 py-3.5 rounded-lg text-lg font-semibold text-foreground hover:bg-muted/80 transition-all"
            >
              See How It Works
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div key={i} className="glass-card rounded-xl p-6 text-center">
              <stat.icon className="w-6 h-6 text-secondary mx-auto mb-2" />
              <div className="text-3xl font-display font-bold text-gradient mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
