import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "How human does the AI sound?",
    answer:
      "Very human. Our voices use advanced speech synthesis with natural pacing, tone, and filler words. Most callers don't realise they're speaking to AI until you tell them.",
  },
  {
    question: "Is it legal to use AI callers?",
    answer:
      "Yes, when used responsibly. We help you stay compliant with local calling rules, quiet hours, and opt-out handling. You are responsible for the data and consent practices in your territory.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most campaigns are live in under an hour. Pick an agent, upload a CSV, review the script, and start calling. Our Done For You service can handle the full build for you.",
  },
  {
    question: "Do I need any technical knowledge?",
    answer:
      "No. The platform is built for operators and sales teams. If you can use a spreadsheet, you can launch a campaign. Engineers are only needed for deeper CRM integrations.",
  },
  {
    question: "What happens when the AI doesn't know the answer?",
    answer:
      "The agent is trained to gracefully redirect, take a message, or schedule a callback. Hot-lead alerts are sent instantly so your team can step in at the right moment.",
  },
  {
    question: "Can I change the script after launch?",
    answer:
      "Absolutely. You can edit scripts, prompts, and flows at any time. Changes take effect on the next call, so you can test and iterate quickly.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading mt-3">
            Quick <span className="text-brand-gradient">answers</span>.
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="surface-card px-6 border-none"
              >
                <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-slate-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
