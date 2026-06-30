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
import CaseStudiesSection from "@/components/CaseStudiesSection";
import PricingSection from "@/components/PricingSection";
import CountriesSection from "@/components/CountriesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ThreeThingsSection />
      <PlatformSection />
      <LeadReactivationSection />
      <WorkedExampleSection />
      <DemoVideoSection />
      <AboutSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CaseStudiesSection />
      <PricingSection />
      <CountriesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
