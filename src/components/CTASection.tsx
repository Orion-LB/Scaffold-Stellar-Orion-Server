import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import cloudImage from "@/assets/cloud.png";

const CTASection = () => {
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

  return (
    <section id="insights" ref={sectionRef} className="py-24 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Floating Card Component - Matching unlock.png design */}
        <div 
          className="bg-[#d8dfe5] rounded-[20px] p-12 md:p-16 card-shadow relative opacity-0 overflow-hidden"
          data-scroll-reveal
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animationDelay: '0.2s'
          }}
        >
          {/* Subtle cloud background */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <img 
              src={cloudImage} 
              alt=""
              className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/4 w-[600px] max-w-none mix-blend-soft-light"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-[#d8dfe5]">
                <div className="w-5 h-5 rounded-full bg-[#0e1c29] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M64.12,147.8a4,4,0,0,1-4,4.2H16a8,8,0,0,1-7.8-6.17,8.35,8.35,0,0,1,1.62-6.93A67.79,67.79,0,0,1,37,117.51a40,40,0,1,1,66.46-35.8,3.94,3.94,0,0,1-2.27,4.18A64.08,64.08,0,0,0,64,144C64,145.28,64,146.54,64.12,147.8Zm182-8.91A67.76,67.76,0,0,0,219,117.51a40,40,0,1,0-66.46-35.8,3.94,3.94,0,0,0,2.27,4.18A64.08,64.08,0,0,1,192,144c0,1.28,0,2.54-.12,3.8a4,4,0,0,0,4,4.2H240a8,8,0,0,0,7.8-6.17A8.33,8.33,0,0,0,246.17,138.89Zm-89,43.18a48,48,0,1,0-58.37,0A72.13,72.13,0,0,0,65.07,212A8,8,0,0,0,72,224H184a8,8,0,0,0,6.93-12A72.15,72.15,0,0,0,157.19,182.07Z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#0e1c29] opacity-80">Trusted by 10k+ businesses</span>
              </div>

              {/* Heading */}
              <h2 className="font-['Plus_Jakarta_Sans'] text-[#0e1c29] text-[44px] md:text-[52px] not-italic font-normal tracking-[-0.44px] leading-[1.1]">
                Unlock Your Self-Repaying Loan Now!
              </h2>

              {/* Description */}
              <p className="font-inter text-base md:text-lg text-[#0e1c29]/80 leading-relaxed max-w-lg">
                Automate loan repayment using real-world yields in a compliant and transparent on-chain setting.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="btn-gradient text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                  data-scroll-reveal
                  style={{ 
                    animationDelay: '0.4s',
                    background: 'linear-gradient(125deg, rgb(119, 75, 229) -4%, rgb(119, 75, 229) 100%)',
                    boxShadow: 'rgb(192, 176, 232) 0px 1px 2px 0px inset, rgba(99, 69, 173, 0.35) 0px 0.706592px 0.706592px -0.583333px, rgba(99, 69, 173, 0.34) 0px 1.80656px 1.80656px -1.16667px, rgba(99, 69, 173, 0.33) 0px 3.62176px 3.62176px -1.75px, rgba(99, 69, 173, 0.3) 0px 6.8656px 6.8656px -2.33333px, rgba(99, 69, 173, 0.26) 0px 13.6468px 13.6468px -2.91667px, rgba(99, 69, 173, 0.15) 0px 30px 30px -3.5px'
                  }}
                >
                  Get Started
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>
                  </svg>
                </Button>
                <Button 
                  size="lg"
                  className="text-white rounded-[10px] font-inter font-medium px-8 py-6 text-sm opacity-0 inline-flex items-center gap-2"
                  data-scroll-reveal
                  style={{ 
                    animationDelay: '0.5s',
                    background: 'linear-gradient(127deg, rgb(14, 28, 41) -68%, rgb(50, 61, 104) 100%)',
                    boxShadow: 'rgb(184, 193, 230) 0px 1px 2px 0px inset, rgba(46, 64, 128, 0.35) 0px 0.706592px 0.706592px -0.583333px, rgba(46, 64, 128, 0.34) 0px 1.80656px 1.80656px -1.16667px, rgba(46, 64, 128, 0.33) 0px 3.62176px 3.62176px -1.75px, rgba(46, 64, 128, 0.3) 0px 6.8656px 6.8656px -2.33333px, rgba(46, 64, 128, 0.26) 0px 13.6468px 13.6468px -2.91667px, rgba(46, 64, 128, 0.15) 0px 30px 30px -3.5px'
                  }}
                >
                  Learn More
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/>
                  </svg>
                </Button>
              </div>
            </div>

            {/* Right Widget */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md opacity-0" data-scroll-reveal style={{ animationDelay: '0.6s' }}>
                {/* Dashboard Widget */}
                <div className="bg-white rounded-[16px] p-6 shadow-lg border border-white/50">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Balance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">On track</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">$682.5</div>
                  </div>
                  
                  {/* Chart area */}
                  <div className="relative h-20 mb-4">
                    <div className="absolute bottom-0 left-0 w-full flex items-end gap-1">
                      {[0.3, 0.7, 0.4, 0.8, 0.6, 0.9, 1.0, 0.5, 0.7, 0.4, 0.6, 0.8].map((height, i) => (
                        <div 
                          key={`chart-bar-${i}`} 
                          className={`flex-1 rounded-t ${i === 6 ? 'bg-purple-500' : 'bg-gray-200'}`}
                          style={{ height: `${height * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">APY</div>
                      <div className="text-sm font-semibold text-gray-900">4.2%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Health</div>
                      <div className="text-sm font-semibold text-green-600">98%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;