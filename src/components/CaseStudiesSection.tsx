import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const caseStudies = [
  {
    client: "IT Talent Hub",
    site: "https://ittalenthub.co.uk/",
    problem:
      "IT Talent Hub struggled with reaching a high volume of potential candidates and clients through manual outbound calling. Their recruitment consultants spent hours dialling prospects with low connection rates, resulting in wasted time and inconsistent lead qualification.",
    solution:
      "AI Tele Caller automated their outbound campaigns, enabling hundreds of simultaneous calls to candidate and client lists. The AI voice agent qualified leads in real time, classified responses, and delivered call transcripts — freeing consultants to focus on closing placements.",
  },
  {
    client: "Farani Taylor",
    site: "https://faranitaylor.com/",
    problem:
      "As a leading immigration law firm, Farani Taylor needed to follow up with a large pipeline of prospective clients efficiently. Manual calling was slow, expensive, and couldn't scale to meet demand during peak enquiry periods.",
    solution:
      "Bateen AI Caller launched targeted outbound campaigns to their enquiry lists, automatically qualifying leads based on case type and urgency. Real-time transcripts and lead classification allowed the intake team to prioritise high-value consultations instantly.",
  },
  {
    client: "Wingrove Cafe",
    site: "https://wingrovecafe.co.uk/",
    problem:
      "Wingrove Cafe wanted to promote new catering services and event bookings to local businesses but lacked the staff and budget for a dedicated outbound sales team. Manual outreach was sporadic and hard to track.",
    solution:
      "Bateen AI Caller ran targeted campaigns to local business contacts, presenting catering packages via natural AI voice conversations. Interested leads were automatically flagged for callback, and the café saw a measurable increase in catering enquiries without hiring additional staff.",
  },
];

const CaseStudiesSection = () => {
  return (
    <section id="case-studies" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 neon-line" />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            <span className="text-gradient">Case Studies</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how businesses are transforming their outreach with Bateen AI Caller
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {caseStudies.map((cs, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="glass-card rounded-2xl overflow-hidden group hover:shadow-glow transition-all duration-300"
            >
              <div className="h-1.5 bg-gradient-cta" />
              <div className="p-8">
                <h3 className="font-display text-lg font-bold text-foreground mb-1">
                  {cs.client}
                </h3>
                <a
                  href={cs.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-6"
                >
                  Visit Website <ExternalLink className="w-3 h-3" />
                </a>

                <div className="mb-5">
                  <span className="inline-block text-xs font-display font-bold uppercase tracking-wider text-destructive mb-2">
                    Problem
                  </span>
                  <p className="text-muted-foreground text-sm leading-relaxed">{cs.problem}</p>
                </div>

                <div>
                  <span className="inline-block text-xs font-display font-bold uppercase tracking-wider text-secondary mb-2">
                    Solution
                  </span>
                  <p className="text-muted-foreground text-sm leading-relaxed">{cs.solution}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;
