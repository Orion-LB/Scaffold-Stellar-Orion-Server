import { useEffect, useRef } from "react";
import { Brain, Zap, Shield, BarChart, Users, Cloud } from "lucide-react";

const FeaturesSection = () => {
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
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Leverage advanced machine learning to uncover hidden patterns and make data-driven decisions."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process millions of data points in seconds with our optimized cloud infrastructure."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and compliance with SOC 2, GDPR, and HIPAA standards."
    },
    {
      icon: BarChart,
      title: "Real-time Analytics",
      description: "Monitor your business metrics in real-time with beautiful, customizable dashboards."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work seamlessly with your team with role-based access and shared workspaces."
    },
    {
      icon: Cloud,
      title: "Cloud Native",
      description: "Built for the cloud from day one. Scale effortlessly as your business grows."
    }
  ];

  return (
    <section id="features" ref={sectionRef} className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16 opacity-0" data-scroll-reveal>
          <h2 className="font-jakarta text-5xl md:text-[56px] font-italic text-foreground mb-4">
            Everything you need to succeed
          </h2>
          <p className="font-inter text-lg text-foreground/80 max-w-2xl mx-auto">
            Powerful features designed to help your business thrive in the digital age
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={`feature-${index}`}
              data-scroll-reveal
              className="bg-card rounded-2xl p-8 card-shadow hover:shadow-lg transition-shadow opacity-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-jakarta text-2xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="font-inter text-base text-foreground/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;