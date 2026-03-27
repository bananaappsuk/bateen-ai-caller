import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    category: "Product",
    questions: [
      {
        q: "What is Bateen AI Caller?",
        a: "Bateen AI Caller is AI phone calling software that makes outbound calls, sounds completely human, qualifies leads automatically, and syncs everything to your CRM. It works 24/7 without breaks.",
      },
      {
        q: "How natural does it sound?",
        a: "Very human. Most people can't tell it's AI. It uses natural pauses, inflection, and conversational flow.",
      },
      {
        q: "Can it handle objections?",
        a: "Yes. We script responses for common objections. If it encounters something unexpected, it gracefully defers, schedules a callback, or transfers to a human.",
      },
      {
        q: "What if the AI doesn't know something?",
        a: "It won't guess. It's trained to say: \"That's a great question — let me have someone from the team get back to you on that.\"",
      },
      {
        q: "Can clients change the script after launch?",
        a: "Yes. Changes typically go live within 24 hours. No technical work needed from the client.",
      },
      {
        q: "How many calls can it make per day?",
        a: "Minimum: 10/day • Typical: 200–500/day • Maximum: 1,000+ per day. We've handled 5,000+ calls in a single day.",
      },
      {
        q: "Can it handle multiple languages?",
        a: "Yes: English (UK, US, Australian), Spanish, French, and German. Other languages available on request.",
      },
      {
        q: "Can it book meetings?",
        a: "Yes. It can check calendar availability and book directly into Calendly, Google Calendar, etc.",
      },
    ],
  },
  {
    category: "Pricing & Billing",
    questions: [
      {
        q: "How does billing work?",
        a: "You're charged 20p per whole minute, billed in full minutes, for connected calls only. No partial minutes — it rounds up to the next full minute. For example: 0–59 seconds = 20p, 60–119 seconds = 40p, 120–179 seconds = 60p, and so on.",
      },
      {
        q: "What am I charged for?",
        a: "You're charged when a person picks up and talks, or when a call goes to voicemail. You are NOT charged when the phone rings but no one answers, for busy signals, or disconnected numbers.",
      },
      {
        q: "How much does setup cost?",
        a: "Simple setup (CSV upload, basic script, no CRM): £500–£1,000. Standard (CRM integration, custom script, lead rules): £1,500–£3,000. Complex (multiple CRMs, advanced flows, voice cloning): £3,000–£5,000.",
      },
      {
        q: "Is there a contract?",
        a: "No minimum commitment or long-term contract required. It's entirely pay-as-you-go.",
      },
    ],
  },
  {
    category: "Integration & Setup",
    questions: [
      {
        q: "What CRMs does it integrate with?",
        a: "Major CRMs: HubSpot, Salesforce, Pipedrive, Zoho. Via Zapier: 5,000+ apps. We also support custom APIs, webhooks, and CSV upload if you don't use a CRM.",
      },
      {
        q: "How long does setup take?",
        a: "24 hours to 10 days, with most setups completed within 3–5 days.",
      },
      {
        q: "What's the setup process?",
        a: "1. You tell us what you want the AI to say. 2. We build and script the AI agent. 3. You review and approve sample calls. 4. We integrate with your CRM (if needed). 5. We import your leads. 6. Campaign goes live. 7. We monitor and improve based on results.",
      },
      {
        q: "Do I need technical knowledge?",
        a: "No. We handle 100% of the technical setup. You tell us what you want, approve the final agent, and provide your leads.",
      },
    ],
  },
  {
    category: "Compliance & Operations",
    questions: [
      {
        q: "Does it comply with GDPR/TCPA?",
        a: "Yes — AI disclosure at call start, do-not-call compliance, call recording consent, UK/EU servers, and DPA available.",
      },
      {
        q: "What happens if someone asks for a human?",
        a: "We can set up live transfer to your team, or the AI can schedule a callback.",
      },
      {
        q: "Do I get call recordings?",
        a: "Yes. Every call is recorded, transcribed, and stored in the dashboard — accessible anytime.",
      },
      {
        q: "Can I pause or stop campaigns?",
        a: "Yes. You have full control via the dashboard. Pause, stop, or modify campaigns anytime.",
      },
    ],
  },
  {
    category: "Comparison",
    questions: [
      {
        q: "How is this different from a call centre?",
        a: "It's 80% cheaper, faster to set up (days vs months), more consistent (same quality every call), and infinitely scalable — no hiring required.",
      },
      {
        q: "How is this different from autodialers?",
        a: "Autodialers just connect calls. AI Tele Caller has full conversations, answers questions, handles objections, and qualifies leads automatically.",
      },
    ],
  },
];

const FAQPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              <span className="text-gradient">Frequently Asked Questions</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to know about Bateen AI Caller.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-10">
            {faqs.map((section, si) => (
              <motion.div
                key={si}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.1 }}
              >
                <h2 className="font-display text-lg font-bold text-foreground mb-4">
                  {section.category}
                </h2>
                <div className="glass-card rounded-2xl overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((faq, qi) => (
                      <AccordionItem
                        key={qi}
                        value={`${si}-${qi}`}
                        className="border-b border-border/30 last:border-0 px-6"
                      >
                        <AccordionTrigger className="text-left text-foreground hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default FAQPage;
