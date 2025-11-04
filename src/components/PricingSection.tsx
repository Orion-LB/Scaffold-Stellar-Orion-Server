import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import cloudImage from "@/assets/cloud.png";

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
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

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 12,
      yearlyPrice: 115,
      description: "Perfect for individuals getting started",
      features: [
        "Everything in starter plan",
        "Unlimited AI usage here",
        "Premium support",
        "Customer care on point",
        "Collaboration tools"
      ]
    },
    {
      name: "Pro",
      monthlyPrice: 17,
      yearlyPrice: 163,
      description: "For professional users",
      features: [
        "Everything in Pro plan",
        "Integrations with 3rd-party",
        "Advanced analytics",
        "Team performance tracking",
        "Top grade security",
        "Customizable Solutions"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      monthlyPrice: 97,
      yearlyPrice: 931,
      description: "For large organizations",
      features: [
        "Dedicated account manager",
        "Custom reports & dashboards",
        "Most performance usage",
        "Enterprise-grade security",
        "Customizable Solutions",
        "Seamless Integration"
      ]
    }
  ];

  return (
    <section id="pricing" ref={sectionRef} className="py-24 bg-card/30 relative overflow-hidden">
      {/* Ambient cloud background */}
      <div className="absolute bottom-0 right-0 pointer-events-none opacity-15 transform translate-x-1/4 translate-y-1/4">
        <img 
          src={cloudImage} 
          alt=""
          className="w-[600px] mix-blend-soft-light"
        />
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="text-center mb-12 opacity-0" data-scroll-reveal>
          <p className="font-inter text-sm font-medium text-primary mb-3 uppercase tracking-wider">
            Transparent Pricing, No Surprises
          </p>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Flexible Plans for All
          </h2>
          <p className="font-inter text-base md:text-lg text-foreground/80 max-w-2xl mx-auto mb-8">
            Choose a plan that fits your goals and scale as you grow
          </p>

          {/* Pricing Toggle */}
          <div className="inline-flex items-center gap-4 bg-muted/50 rounded-[10px] p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-lg font-inter font-medium text-sm transition-all ${
                !isYearly ? 'bg-muted text-foreground' : 'bg-transparent text-foreground/65'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-lg font-inter font-medium text-sm transition-all ${
                isYearly ? 'bg-muted text-foreground' : 'bg-transparent text-foreground/65'
              }`}
            >
              Yearly
              <span className="ml-2 text-primary font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={`plan-${index}`}
              data-scroll-reveal
              className={`bg-card rounded-2xl p-8 card-shadow relative opacity-0 ${
                plan.popular ? 'ring-2 ring-primary' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="font-jakarta text-2xl font-italic text-foreground mb-2">
                {plan.name}
              </h3>
              <p className="font-inter text-sm text-foreground/70 mb-6">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="font-jakarta text-5xl font-italic text-foreground">
                  ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span className="font-inter text-foreground/70 ml-2">
                  /{isYearly ? 'year' : 'month'}
                </span>
              </div>

              <Button 
                className={`w-full mb-8 rounded-[10px] font-inter font-medium ${
                  plan.popular 
                    ? 'btn-gradient text-white' 
                    : 'btn-secondary-neomorph text-secondary-foreground'
                }`}
              >
                Get Started
              </Button>

              <div className="space-y-4">
                {plan.features.map((feature, i) => (
                  <div key={`feature-${index}-${i}`} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="font-inter text-sm text-foreground/80">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;