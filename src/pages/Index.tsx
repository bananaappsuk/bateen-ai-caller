import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import DemoVideoSection from "@/components/DemoVideoSection";
import ThreeThingsSection from "@/components/ThreeThingsSection";
import PlatformSection from "@/components/PlatformSection";
import LeadReactivationSection from "@/components/LeadReactivationSection";
import WorkedExampleSection from "@/components/WorkedExampleSection";
import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import AIAgentsSection from "@/components/AIAgentsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import PricingSection from "@/components/PricingSection";
import CountriesSection from "@/components/CountriesSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="sticky top-20 w-full z-40 bg-brand-gradient text-white text-center text-sm font-medium py-2 px-4">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Live demo — our AI will call your phone in seconds
        </span>
      </div>
      <HeroSection />
      <ThreeThingsSection />
      <PlatformSection />
      <LeadReactivationSection />
      <WorkedExampleSection />
      <DemoVideoSection />
      <AboutSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AIAgentsSection />
      <TestimonialsSection />
      <CaseStudiesSection />
      <PricingSection />
      <CountriesSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
