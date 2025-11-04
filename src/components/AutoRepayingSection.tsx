import { useEffect, useRef } from "react";
import cloudImage from "@/assets/cloud.png";

const AutoRepayingSection = () => {
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

  const features = [
    {
      title: "Self-Repaying Loans",
      description: "Access instant liquidity with ease as T-Bill yields automatically repay your loan for maximum capital efficiency."
    },
    {
      title: "Productive Collateral",
      description: "Your tokenized assets don't just sit there—they earn yield that actively repays your loans."
    },
    {
      title: "DeFi Composability",
      description: "Integrate your staked T-Bills with other DeFi protocols to enhance your capital's productivity."
    },
    {
      title: "Health Factor Monitoring",
      description: "Monitor your loan's health with real-time analytics to fine-tune your position and avoid liquidation."
    },
    {
      title: "Real-Time Insights",
      description: "Monitor your loan's health and adapt your position in real time to prevent liquidation."
    },
    {
      title: "Compliant-First",
      description: "Stay ahead with on-chain KYC, and built-in security for evolving DeFi regulations."
    }
  ];

  return (
    <section id="auto-repaying" ref={sectionRef} className="py-24 bg-card/30 relative overflow-hidden">
      {/* Ambient cloud */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-40">
        <img 
          src={cloudImage} 
          alt=""
          className="w-[400px] mix-blend-screen"
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <p className="font-inter text-sm font-medium text-primary mb-3 uppercase tracking-wider">
            Effortless Deployment
          </p>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Auto-Repaying Loans
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            Simplify deployment for unmatched scalability and impact
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={`auto-feature-${index}`}
              data-scroll-reveal
              className="rounded-2xl p-8 card-shadow opacity-0 hover-lift"
              style={{ 
                background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
                animationDelay: `${index * 0.1}s`
              }}
            >
              <h3 className="font-inter text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="font-inter text-sm text-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-6 opacity-0" data-scroll-reveal>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Expert Collaboration</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Seamless Integration</div>
          </div>
          <div className="text-center px-8 py-4">
            <div className="font-inter text-sm font-medium text-muted-foreground mb-1">Scalable Solutions</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AutoRepayingSection;
