import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import logo from "@/assets/bateen-logo.png";

const navLinks = [
  { label: "About", href: "/#about" },
  { label: "Features", href: "/#features" },
  { label: "Case Studies", href: "/#case-studies" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="backdrop-blur-xl border-b border-border/50 bg-background/70"
      >
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center"
          >
            <img
              src={logo}
              alt="AI Tele Caller"
              className="h-14 w-auto bg-transparent"
              width={1280}
              height={512}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://vocalmax.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-gradient hover:opacity-90 transition-opacity"
            >
              Contact Us
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-foreground"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 pb-4"
          >
            {navLinks.map((link) =>
              link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://vocalmax.io/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </a>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="block w-full mt-2 bg-brand-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold text-center hover:opacity-90 transition-opacity"
            >
              Contact Us
            </Link>
          </motion.div>
        )}
      </motion.nav>

      {/* Thin gradient demo bar */}
      <div className="bg-brand-gradient text-white text-center text-sm font-medium py-2 px-4">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Live demo — our AI will call your phone in seconds
        </span>
      </div>
    </header>
  );
};

export default Navbar;
