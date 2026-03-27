import { motion } from "framer-motion";
import { Lightbulb, Target, TrendingUp } from "lucide-react";

const highlights = [
  {
    icon: Lightbulb,
    title: "AI Transformation",
    desc: "We help companies transition from AI consumers to AI builders through practical, hands-on execution.",
  },
  {
    icon: Target,
    title: "Workflow Integration",
    desc: "Our AI solutions integrate directly into your daily workflows, automating smarter and faster.",
  },
  {
    icon: TrendingUp,
    title: "Measurable Impact",
    desc: "Every engagement is designed to create measurable business outcomes and lasting competitive advantage.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">About Us</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            AI Tele Caller helps companies move from AI consumers to AI builders. Through hands-on,
            execution-focused workshops, we enable teams to apply AI directly to their daily
            workflows, automate smarter, and create measurable business impact.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {highlights.map((h, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-8 text-center group hover:shadow-glow transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/30 transition-colors">
                <h.icon className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-2">{h.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
