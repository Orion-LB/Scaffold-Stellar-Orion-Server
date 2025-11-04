import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import cloudImage from "@/assets/cloud.png";

const InsightsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('animate-fade-in-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('[data-scroll-reveal]');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const insights = [
    "Customer Retention",
    "Seamless Integrations", 
    "Real-Time Reports",
    "Personalized Engagement"
  ];

  const benefits = [
    "Cost-Effective",
    "Smart Spending",
    "Data-Driven Decisions", 
    "Increased Efficiency"
  ];

  return (
    <section id="insights" ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Ambient cloud background */}
      <div className="absolute top-1/2 left-0 pointer-events-none opacity-20 transform -translate-y-1/2 -translate-x-1/3">
        <img 
          src={cloudImage} 
          alt=""
          className="w-[500px] mix-blend-soft-light"
        />
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Comprehensive Insights
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Track every campaign and customer interaction to refine engagement strategies
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Real-Time Insights */}
          <div className="opacity-0" data-scroll-reveal>
            <div className="bg-card rounded-2xl p-8 card-shadow hover-lift">
              <h3 className="font-inter text-2xl font-semibold text-foreground mb-4">
                Real-Time Insights
              </h3>
              <p className="font-inter text-base text-foreground/80 mb-6 leading-relaxed">
                Monitor your campaigns in real time to ensure maximum effectiveness and identify areas for improvement
              </p>
              <div className="space-y-3">
                {insights.map((item, i) => (
                  <div key={`insight-${i}`} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-inter text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Analytics */}
          <div className="opacity-0" data-scroll-reveal>
            <div className="bg-card rounded-2xl p-8 card-shadow hover-lift">
              <h3 className="font-inter text-2xl font-semibold text-foreground mb-4">
                Actionable Analytics
              </h3>
              <p className="font-inter text-base text-foreground/80 mb-6 leading-relaxed">
                Leverage real-time LTV analytics to manage your loan, protect your collateral, and make informed risk decisions.
              </p>
              <div className="space-y-3">
                {benefits.map((item, i) => (
                  <div key={`benefit-${i}`} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-inter text-sm text-foreground/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsightsSection;
