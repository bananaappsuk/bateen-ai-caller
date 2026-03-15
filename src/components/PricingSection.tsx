import { motion } from "framer-motion";
import { Check, Zap, Clock, PhoneOff } from "lucide-react";

const coreFeatures = [
  "Unlimited call volume capacity",
  "Natural-sounding AI voices",
  "Call recordings + transcripts",
  "Lead qualification & scoring",
  "CRM integration (HubSpot, Salesforce, etc.)",
  "Campaign management dashboard",
  "Real-time call monitoring",
  "Automatic retry logic",
  "Multi-language support",
  "No long-term contract",
];

const setupTiers = [
  {
    type: "Simple",
    price: "£500 – £1,000",
    details: "CSV upload, basic script, no CRM",
  },
  {
    type: "Standard",
    price: "£1,500 – £3,000",
    details: "CRM integration, custom script, lead rules",
  },
  {
    type: "Complex",
    price: "£3,000 – £5,000",
    details: "Multiple CRMs, advanced flows, voice cloning",
  },
];

const costExamples = [
  { scenario: "Voicemail", duration: "Up to 1 min", cost: "20p" },
  { scenario: "Short conversation", duration: "2 mins", cost: "40p" },
  { scenario: "Avg conversation", duration: "3 mins", cost: "60p" },
  { scenario: "100 calls (3 min avg)", duration: "300 mins", cost: "£60" },
  { scenario: "500 calls (3 min avg)", duration: "1,500 mins", cost: "£300" },
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
            No subscriptions. No commitments. Pay only for connected calls.
          </p>
        </motion.div>

        {/* Main pricing card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto glass-card rounded-3xl p-10 shadow-glow-lg relative overflow-hidden mb-12"
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

          <p className="text-sm text-muted-foreground mb-6">
            Billed in whole minutes, connected calls only. Rounds up to the next full minute.
          </p>

          {/* Charged / Not Charged */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-secondary" />
                <span className="text-sm font-semibold text-foreground">Charged For</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Person picks up and talks</li>
                <li>• Call goes to voicemail</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <PhoneOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Not Charged</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• No answer / busy signal</li>
                <li>• Disconnected numbers</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {coreFeatures.map((perk, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{perk}</span>
              </div>
            ))}
          </div>

          <a
            href="https://meetings-eu1.hubspot.com/admin-bateen"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gradient-cta text-primary-foreground py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Book a Demo
          </a>
        </motion.div>

        {/* Typical Costs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-12"
        >
          <h3 className="font-display text-xl font-bold text-foreground text-center mb-6">
            Typical Call Costs
          </h3>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Scenario</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Duration</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {costExamples.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="p-4 text-foreground">{row.scenario}</td>
                    <td className="p-4 text-muted-foreground">{row.duration}</td>
                    <td className="p-4 text-right font-semibold text-foreground">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Setup Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h3 className="font-display text-xl font-bold text-foreground text-center mb-6">
            Integration Setup Payment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {setupTiers.map((tier, i) => (
              <a
                key={i}
                href="https://buy.stripe.com/7sY8wP2Ao0gn4vC9X7a3u03"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-2xl p-6 text-center hover:shadow-glow transition-all duration-300 block"
              >
                <h4 className="font-display text-base font-bold text-foreground mb-2">{tier.type}</h4>
                <p className="text-2xl font-display font-black text-gradient mb-3">{tier.price}</p>
                <p className="text-sm text-muted-foreground">{tier.details}</p>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Cost Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-12"
        >
          <h3 className="font-display text-xl font-bold text-foreground text-center mb-6">
            Cost Comparison <span className="text-muted-foreground font-normal text-base">— 500 calls/month (3 min avg)</span>
          </h3>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Item</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Human Rep</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Bateen AI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="p-4 text-foreground">Monthly cost</td>
                  <td className="p-4 text-center text-muted-foreground">£1,500–£2,000</td>
                  <td className="p-4 text-center font-semibold text-secondary">£300</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-4 text-foreground">Benefits / overhead</td>
                  <td className="p-4 text-center text-muted-foreground">£200–£300</td>
                  <td className="p-4 text-center font-semibold text-secondary">£0</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-4 text-foreground">Training / management</td>
                  <td className="p-4 text-center text-muted-foreground">£100–£200</td>
                  <td className="p-4 text-center font-semibold text-secondary">£0</td>
                </tr>
                <tr>
                  <td className="p-4 text-foreground font-semibold">Annual savings</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center font-bold text-gradient">~£15,000+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
