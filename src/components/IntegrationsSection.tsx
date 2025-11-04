import { useEffect, useRef } from "react";
import IntegrationDiagram from "./IntegrationDiagram";
import cloudImage from "@/assets/cloud.png";

const IntegrationsSection = () => {
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
    "Seamless Automation",
    "Real-Time Data Sync", 
    "Customizable Solutions"
  ];

  return (
    <section id="integrations" ref={sectionRef} className="py-24 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Floating Card Component */}
        <div 
          className="bg-[#d8dfe5] rounded-[20px] p-12 md:p-16 card-shadow relative opacity-0"
          data-scroll-reveal
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animationDelay: '0.2s'
          }}
        >
          {/* Subtle cloud background */}
          <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden rounded-[20px]">
            <img 
              src={cloudImage} 
              alt=""
              className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/4 w-[600px] max-w-none mix-blend-soft-light"
            />
          </div>
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-gray-700 mb-6">
              Integrations
            </div>
           <h2 className="font-['Plus_Jakarta_Sans'] mb-2  text-[#0e1c29] text-[44px] not-italic font-normal h-[52.8px] tracking-[-0.44px] leading-[52.8px]">
  Integrates with
</h2>
          </div>

          {/* Integration Diagram with Orthogonal Connections */}
          <div className="mb-16" data-scroll-reveal style={{ animationDelay: '0.4s' }}>
            <IntegrationDiagram />
          </div>

          {/* Footer Features */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12 text-center">
            {features.map((feature, index) => (
              <div key={feature} className="flex items-center">
                <span className="font-medium text-gray-700 text-lg">{feature}</span>
                {index < features.length - 1 && (
                  <div className="hidden md:block w-px h-8 bg-gray-400 mx-8 opacity-50"
                    style={{
                      background: 'repeating-linear-gradient(to bottom, #9ca3af 0px, #9ca3af 3px, transparent 3px, transparent 6px)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
