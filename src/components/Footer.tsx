import { Link } from "react-router-dom";
import { MapPin, Mail, Phone, User } from "lucide-react";
import logo from "@/assets/bateen-logo.png";

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Bateen AI" className="h-8 w-auto" />
              <span className="font-display text-sm font-bold text-gradient">AI Caller</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered outbound calling platform that automates your phone outreach at scale.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm font-bold text-foreground mb-4">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm font-bold text-foreground mb-4">Company</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">BATEEN AI LTD</p>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-secondary flex-shrink-0" />
                <p>20 Wenlock Road, London, England, N1 7GU</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                <a href="mailto:admin@bateen.ai" className="hover:text-foreground transition-colors">admin@bateen.ai</a>
              </div>
            </div>
          </div>

          {/* Get In Touch */}
          <div>
            <h4 className="font-display text-sm font-bold text-foreground mb-4">Get In Touch</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 text-secondary flex-shrink-0" />
                <div>
                  <p className="text-foreground font-medium">Sriram Angajala</p>
                  <p>CEO</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                <a href="mailto:Sriram@bateen.ai" className="hover:text-foreground transition-colors">Sriram@bateen.ai</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary flex-shrink-0" />
                <a href="tel:+447453289655" className="hover:text-foreground transition-colors">+44 7453 289655</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 BATEEN AI LTD — All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
