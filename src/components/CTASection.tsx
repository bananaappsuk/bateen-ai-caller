import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

const CTASection = () => {
  return (
    <section id="demo" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass-card rounded-3xl p-12 md:p-16 text-center shadow-glow-lg relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/5" />
          <div className="relative z-10">
            <CalendarDays className="w-12 h-12 text-secondary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Automate Your Outreach?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Schedule a personalised demo and see how AI Tele Caller can transform
              your lead generation process.
            </p>
            <a
              href="https://meetings-eu1.hubspot.com/admin-bateen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-cta text-primary-foreground px-10 py-4 rounded-xl font-bold text-lg shadow-glow hover:opacity-90 transition-all"
            >
              Book a Demo
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              Or email us at admin@bateen.ai
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
