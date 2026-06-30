import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import DemoVideoSection from "@/components/DemoVideoSection";
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
      <StatsBar />
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
