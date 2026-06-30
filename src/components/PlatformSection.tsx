import { motion } from "framer-motion";

const leads = [
  {
    name: "Sarah Mitchell",
    status: "Hot Lead",
    statusClass: "bg-green-50 text-green-700 border-green-200",
    detail: "Asked for a callback today",
  },
  {
    name: "James Robertson",
    status: "Calling...",
    statusClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    pulsing: true,
    detail: "Outbound in progress",
  },
  {
    name: "Lisa Patel",
    status: "Voicemail",
    statusClass: "bg-slate-100 text-slate-600 border-slate-200",
    detail: "Will retry tomorrow 10:00",
  },
];

const PlatformSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-label">The platform</span>
          <h2 className="section-heading mt-3">
            Your entire outbound operation{" "}
            <span className="text-brand-gradient">in one place</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Upload leads, launch campaigns, and watch calls happen in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {[
            "📊 Live campaign dashboard",
            "🔔 Instant hot lead alerts",
            "📄 Full call transcripts",
          ].map((b) => (
            <span
              key={b}
              className="surface-card px-4 py-2 text-sm font-medium text-slate-700"
            >
              {b}
            </span>
          ))}
        </div>

        {/* Mock dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto surface-card-lg overflow-hidden"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-4 flex-1 max-w-md mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-500 text-center">
              app.aitelecaller.io/campaigns
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Campaign header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-xs text-slate-500">Campaign</div>
                <h3 className="text-xl font-bold text-slate-900">Summer Outreach</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </span>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>Leads called</span>
                <span className="font-semibold text-slate-900">247 / 500</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "49.4%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-brand-gradient"
                />
              </div>
            </div>

            {/* Stat boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Called", value: "247" },
                { label: "Interested", value: "38" },
                { label: "Callbacks", value: "21" },
                { label: "Connect", value: "62%" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="text-2xl font-bold text-brand-gradient mt-1">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Lead rows */}
            <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {leads.map((l) => (
                <div
                  key={l.name}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-gradient-soft flex items-center justify-center text-sm font-semibold text-slate-700 shrink-0">
                      {l.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {l.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{l.detail}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${l.statusClass}`}
                  >
                    {l.pulsing && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                      </span>
                    )}
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformSection;
