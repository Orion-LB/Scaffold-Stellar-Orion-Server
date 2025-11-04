import { useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
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

  const faqs = [
    {
      question: "What is Orion?",
      answer: "Orion is a regulated DeFi protocol designed to help you access instant, self-repaying loans against your tokenized T-Bills compliantly and efficiently."
    },
    {
      question: "Is Orion secure and compliant?",
      answer: "Yes, Orion is built with on-chain compliance and security first, including full KYC verification to meet regulatory standards."
    },
    {
      question: "Do I need to be a DeFi expert to use Orion?",
      answer: "No! Orion is built for investors, not just crypto-natives. Our intuitive dashboard allows you to manage your loan and collateral without writing a single line of code."
    },
    {
      question: "Can I customize my loan to fit my strategy?",
      answer: "Absolutely. Orion offers flexible loan-to-value (LTV) options, letting you manage your collateral and borrowing to match your specific risk profile."
    },
    {
      question: "Is my loan's health monitored in real time?",
      answer: "Yes! Orion is fully responsive to market changes, ensuring seamless monitoring of your loan-to-value (LTV) and Health Factor across web and mobile."
    }
  ];

  return (
    <section id="faqs" ref={sectionRef} className="py-24 relative">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Floating Card Component - Matching Integration Section Style */}
        <div 
          className="bg-[#d8dfe5] rounded-[20px] p-12 md:p-16 card-shadow relative opacity-0"
          data-scroll-reveal
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animationDelay: '0.2s'
          }}
        >
          <div className="text-center mb-16">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-gray-700 mb-6">
              FAQ
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] mb-2 text-[#0e1c29] text-[44px] not-italic font-normal h-[52.8px] tracking-[-0.44px] leading-[52.8px]">
              Questions? Answers!
            </h2>
            <p className="font-inter text-base md:text-lg text-[#0e1c29]/80 max-w-2xl mx-auto mt-4">
              Find quick answers to the most common questions about our platform
            </p>
          </div>

          <div className="max-w-3xl mx-auto opacity-0" data-scroll-reveal style={{ animationDelay: '0.4s' }}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={`faq-${index}`} 
                  value={`item-${index}`}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 border-0"
                  style={{
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <AccordionTrigger className="font-jakarta text-lg font-semibold text-[#0e1c29] hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-inter text-base text-[#0e1c29]/80 leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;