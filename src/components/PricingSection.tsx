import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";

const perks = [
  "No monthly subscription",
  "Pay only for call time",
  "Real-time transcripts",
  "Call recordings included",
  "AI lead classification",
  "Voicemail detection",
  "Multi-country dialling",
  "CSV contact import",
  "Campaign analytics dashboard",
  "Dedicated support",
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">Simple Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No subscriptions. No commitments. Just results.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto glass-card rounded-3xl p-10 shadow-glow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-cta" />

          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-secondary" />
            <span className="font-display text-lg font-bold text-foreground">Pay As You Use</span>
          </div>

          <div className="mb-4">
            <span className="text-6xl font-display font-black text-gradient">20p</span>
            <span className="text-muted-foreground text-lg ml-2">/minute</span>
          </div>

          <div className="mb-8 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-sm text-muted-foreground">One-time setup fee: </span>
            <span className="font-display font-bold text-foreground">£500</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{perk}</span>
              </div>
            ))}
          </div>

          <a
            href="#demo"
            className="block w-full text-center bg-gradient-cta text-secondary-foreground py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
