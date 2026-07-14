import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/ai-tele-caller-logo.png";

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="bg-white rounded-2xl shadow-soft p-8 sm:p-10">
          <img src={logo} alt="AI Tele Caller" className="h-10 w-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-6">Last updated 2026</p>
          <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
            <p>
              By using AI Tele Caller you agree to place outbound calls only to contacts for whom you
              have a lawful basis to call, in compliance with applicable regulations (including UK
              GDPR and Ofcom rules). Consent is recorded and Do-Not-Call requests are honoured.
            </p>
            <p>
              Credits are consumed for connected calls (any call lasting more than zero seconds) and
              for AI classification. Credits are non-refundable once consumed. Subscriptions renew
              automatically until cancelled; you can manage or cancel your plan from the billing
              portal at any time.
            </p>
            <p>
              AI agents disclose that they are AI when asked. You are responsible for the content of
              your call scripts and for the accuracy of the lead data you upload.
            </p>
            <p>
              The service is provided as-is. We are not liable for outcomes arising from calls placed
              through the platform. These terms may be updated; continued use constitutes acceptance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
