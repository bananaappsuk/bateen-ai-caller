import { motion } from "framer-motion";
import { UserPlus, FileUp, Rocket, PhoneCall, BarChart2, HandshakeIcon } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Create Your AI Agent", desc: "Design a custom voice agent with your script and tone." },
  { icon: FileUp, title: "Upload Contacts", desc: "Import your contact list via CSV in seconds." },
  { icon: Rocket, title: "Launch Campaign", desc: "Set your parameters and hit launch." },
  { icon: PhoneCall, title: "AI Makes Calls", desc: "Hundreds of simultaneous calls with natural conversation." },
  { icon: BarChart2, title: "Review Leads", desc: "See qualified leads, transcripts, and recordings." },
  { icon: HandshakeIcon, title: "Close Deals", desc: "Follow up with interested prospects and convert." },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">How It Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From setup to closed deals in 6 simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative glass-card rounded-2xl p-8 text-center"
            >
              <div className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-gradient-cta flex items-center justify-center text-sm font-bold text-secondary-foreground font-display">
                {i + 1}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
