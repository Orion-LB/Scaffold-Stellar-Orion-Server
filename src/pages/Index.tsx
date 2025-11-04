import HeroSection from "@/components/HeroSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import InsightsSection from "@/components/InsightsSection";
import AutoRepayingSection from "@/components/AutoRepayingSection";
import FAQSection from "@/components/FAQSection";
import ReviewsSection from "@/components/ReviewsSection";
import Navbar from "@/components/Navbar";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <IntegrationsSection />
        <InsightsSection />
        <AutoRepayingSection />
        <FAQSection />
        <ReviewsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;