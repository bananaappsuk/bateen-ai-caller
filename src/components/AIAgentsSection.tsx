import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const agents = [
  {
    emoji: "💞",
    role: "Reactivation Specialist",
    name: "Mia",
    desc: "Warms up cold or stale leads with a soft, consultative tone and books a fresh chat.",
    accent: "#FF6FD8",
  },
  {
    emoji: "🚀",
    role: "Cold Calling",
    name: "Salma",
    desc: "Handles net-new cold outbound with a direct, professional style and books a meeting.",
    accent: "#00D4FF",
  },
  {
    emoji: "👋",
    role: "New Enquiries",
    name: "Sarah",
    desc: "Greets fresh inbound enquiries with a friendly tone, confirms intent, and books a scoping call.",
    accent: "#FF6FD8",
  },
];

const AIAgentsSection = () => {
  return (
    <section id="ai-agents" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-label">Ready-made agents</span>
          <h2 className="section-heading mt-3">
            Pick a <span className="text-brand-gradient">specialist</span>. Make it yours.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="surface-card p-7 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-soft"
                  style={{ backgroundColor: `${agent.accent}15` }}
                >
                  {agent.emoji}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{agent.name}</h3>
                  <span
                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5"
                    style={{ backgroundColor: `${agent.accent}15`, color: agent.accent }}
                  >
                    {agent.role}
                  </span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed flex-1">
                {agent.desc}
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                      style={{ backgroundColor: agent.accent }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: agent.accent }}
                    />
                  </span>
                  Available now
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            to="/signup"
            className="btn-primary"
          >
            Start your free trial and meet them properly
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default AIAgentsSection;
