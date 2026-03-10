import { motion } from "framer-motion";

const countries = [
  "🇬🇧 United Kingdom",
  "🇦🇪 UAE",
  "🇺🇸 United States",
  "🇨🇦 Canada",
  "🇦🇺 Australia",
  "🇩🇪 Germany",
  "🇫🇷 France",
  "🇪🇸 Spain",
  "🇮🇹 Italy",
  "🇳🇱 Netherlands",
  "🇮🇳 India",
  "🇸🇬 Singapore",
  "🇭🇰 Hong Kong",
  "🇮🇪 Ireland",
  "🇸🇦 Saudi Arabia",
  "🇶🇦 Qatar",
  "🇧🇭 Bahrain",
  "🇰🇼 Kuwait",
  "🇴🇲 Oman",
  "🇿🇦 South Africa",
  "🇳🇿 New Zealand",
  "🇸🇪 Sweden",
  "🇳🇴 Norway",
  "🇩🇰 Denmark",
];

const CountriesSection = () => {
  return (
    <section id="countries" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">Global Reach</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Dial into 50+ countries worldwide
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto"
        >
          {countries.map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="glass-card px-4 py-2 rounded-full text-sm text-foreground"
            >
              {c}
            </motion.span>
          ))}
          <span className="glass-card px-4 py-2 rounded-full text-sm text-secondary font-semibold">
            + 26 more
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default CountriesSection;
