import { Link } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import logo from "@/assets/ai-tele-caller-logo.png";

const demoUrl =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qcRUglD8qicU4kzrD-rFtlyP94h0JaZnv_-41rtPM-BkStaGx-mBvWG0nOP8EzQzaaMgYk8Qm";

const Footer = () => {
  return (
    <footer className="py-20 bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4">
        {/* CTA Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group surface-card p-8 flex flex-col justify-between min-h-[180px] hover:shadow-soft-lg transition-all"
          >
            <div>
              <span className="section-label">Live demo</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-3">
                Get a live demo call
              </h3>
              <p className="text-slate-600 mt-2">
                Our AI rings you in seconds. No signup needed.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan mt-4 group-hover:text-brand-pink transition-colors">
              Book now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          <a
            href="mailto:sriram@nextgentechs.io"
            className="group surface-card p-8 flex flex-col justify-between min-h-[180px] hover:shadow-soft-lg transition-all"
          >
            <div>
              <span className="section-label">Email us</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-3">
                sriram@nextgentechs.io
              </h3>
              <p className="text-slate-600 mt-2">
                Questions? We usually reply within a few hours.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan mt-4 group-hover:text-brand-pink transition-colors">
              Send an email
              <Mail className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>

        {/* Brand bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 pb-12 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={logo} alt="AI Tele Caller" className="h-8 w-auto" />
            <span className="font-display text-lg font-bold text-white">AI Tele Caller</span>
          </div>
          <p className="text-sm text-slate-400 max-w-md md:text-right">
            AI-powered voice calling for businesses. Scale your outbound without scaling your headcount.
          </p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Product */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Product</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a href="/#features" className="hover:text-white transition-colors">Features</a>
              <a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Legal</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Company</h4>
            <div className="flex flex-col gap-2 text-sm">
              <p>NextGen Techs</p>
              <p>20 Wenlock Road, London, England, N1 7GU</p>
              <a href="mailto:sriram@nextgentechs.io" className="hover:text-white transition-colors">sriram@nextgentechs.io</a>
            </div>
          </div>

          {/* CTA */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Get started</h4>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              Book a Demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              GDPR COMPLIANT
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 NextGen Techs — All rights reserved.</p>
          <p className="flex items-center gap-2">
            Built for businesses worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
