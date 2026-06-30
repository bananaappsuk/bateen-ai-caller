import { motion } from "framer-motion";
import { Upload } from "lucide-react";

const industries = [
  "Estate agents",
  "Solar installers",
  "Insurance brokers",
  "Recruiters",
  "Marketing agencies",
];

const LeadReactivationSection = () => {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <span className="section-label">Lead reactivation</span>
          <h2 className="section-heading mt-3">
            You already paid for these leads.{" "}
            <span className="text-brand-gradient">Get your money's worth.</span>
          </h2>
          <p className="mt-5 text-slate-600 text-lg leading-relaxed">
            Dormant leads aren't dead, they're unworked — the AI calls them all and hands back
            booked conversations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
            {industries.map((i) => (
              <span
                key={i}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-700 bg-white border border-slate-200 shadow-soft"
              >
                {i}
              </span>
            ))}
          </div>

          <div className="mt-10">
            <a
              href="https://vocalmax.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <Upload className="w-5 h-5" />
              Upload your old leads — start free trial
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LeadReactivationSection;
