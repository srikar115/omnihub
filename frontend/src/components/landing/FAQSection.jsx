import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Sparkles, CreditCard, Shield, Zap, Users, MessageSquare } from 'lucide-react';

const categories = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'models', label: 'AI Models', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'support', label: 'Support', icon: MessageSquare },
];

const faqs = [
  {
    question: 'What AI models are included?',
    answer: 'Tingu.ai gives you access to 50+ AI models including GPT-5, Claude 4, Gemini 3, DALL-E 3, Midjourney, Stable Diffusion, FLUX, Sora, Runway, Kling, Veo, and many more. New models are added regularly.',
    category: 'models',
    icon: Zap,
  },
  {
    question: 'How does the credit system work?',
    answer: 'Credits are used to generate content. Different models consume different amounts of credits based on their computational cost. For example, a simple image might cost 2-4 credits, while a video could cost 20-50 credits. You can see the exact cost before each generation.',
    category: 'billing',
    icon: CreditCard,
  },
  {
    question: 'Can I use the generated content commercially?',
    answer: 'Yes! All content you generate with Tingu.ai is yours to use commercially. We do not claim any ownership over your creations. Please note that some AI providers may have their own terms, which we display during generation.',
    category: 'models',
    icon: Sparkles,
  },
  {
    question: 'Is there a free plan?',
    answer: 'Yes, we offer a free Starter plan with 100 credits per month. This lets you try all available AI models before committing to a paid plan. No credit card required to start.',
    category: 'billing',
    icon: CreditCard,
  },
  {
    question: 'Can I switch between plans?',
    answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you will get access to the new features immediately. When downgrading, the change takes effect at the start of your next billing cycle.',
    category: 'billing',
    icon: CreditCard,
  },
  {
    question: 'Do unused credits roll over?',
    answer: 'Credits do not roll over to the next month on our standard plans. However, Enterprise customers can negotiate custom terms including credit rollover.',
    category: 'billing',
    icon: CreditCard,
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we take security seriously. We are SOC 2 Type II certified, use end-to-end encryption, and never train AI models on your data. Enterprise customers can also use private endpoints for additional security.',
    category: 'security',
    icon: Shield,
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 7-day money-back guarantee for first-time subscribers. If you are not satisfied with the service, contact our support team within 7 days of your first payment for a full refund.',
    category: 'support',
    icon: MessageSquare,
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-sm mb-6"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-[var(--text-secondary)]">Got questions?</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6"
          >
            Frequently asked <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">questions</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[var(--text-secondary)]"
          >
            Everything you need to know about Tingu.ai
          </motion.p>
        </div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setOpenIndex(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <CategoryIcon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {filteredFaqs.map((faq, idx) => {
              const FaqIcon = faq.icon;
              const isOpen = openIndex === idx;
              
              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isOpen 
                      ? 'bg-[var(--bg-primary)] border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <button
                    onClick={() => toggleFAQ(idx)}
                    className="w-full flex items-center gap-4 p-5 sm:p-6 text-left transition-colors"
                  >
                    {/* Question icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isOpen 
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500' 
                        : 'bg-[var(--bg-primary)]'
                    }`}>
                      <FaqIcon className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-cyan-400'}`} />
                    </div>
                    
                    <span className={`font-semibold flex-1 pr-4 transition-colors ${
                      isOpen ? 'text-cyan-400' : 'text-[var(--text-primary)]'
                    }`}>
                      {faq.question}
                    </span>
                    
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isOpen ? 'bg-cyan-500/20' : 'bg-[var(--bg-primary)]'
                      }`}
                    >
                      <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}`} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pl-[76px] sm:pl-[88px]">
                          <p className="text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14 p-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Still have questions?</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            Our support team is here to help you 24/7
          </p>
          <a
            href="mailto:support@tingu.ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
          </a>
        </motion.div>
      </div>
    </section>
  );
}
