'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: "What is OmniHub?",
    answer: "OmniHub is an AI-powered creative platform that provides access to the best AI models for image generation, video creation, and AI chat in one unified interface. Access 70+ models including FLUX Pro, SDXL, Kling AI, GPT-4, Claude, and more."
  },
  {
    question: "How does the credit system work?",
    answer: "OmniHub uses a flexible credit system where 1 credit = $1 USD. You purchase credits and use them across any AI model. Different models have different credit costs based on their computational requirements and output quality. For example, FLUX Schnell costs ~0.003 credits per image, while Kling Pro video might cost 0.3 credits."
  },
  {
    question: "Which AI models are available?",
    answer: "OmniHub provides access to over 70+ AI models including: Image generation (FLUX Pro, SDXL, Stable Diffusion, DALL-E), Video generation (Kling AI, Luma Dream Machine, Runway), and Chat/LLM (GPT-4, Claude, Gemini, Mistral, and more)."
  },
  {
    question: "Can I use OmniHub for commercial projects?",
    answer: "Yes, outputs generated through OmniHub can be used for commercial projects in most cases. However, please check individual model licensing terms as some models may have specific usage restrictions. We recommend reviewing the model's documentation before commercial use."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! New users receive 10 free credits when they sign up. This allows you to explore different AI models and see which ones work best for your creative needs before purchasing additional credits."
  },
  {
    question: "How fast is generation?",
    answer: "Generation speed varies by model. Fast models like FLUX Schnell generate images in 1-3 seconds. High-quality models like FLUX Pro take 5-15 seconds. Video generation typically takes 1-5 minutes depending on length and model."
  },
  {
    question: "Do you offer team/workspace features?",
    answer: "Yes! OmniHub supports team workspaces where you can share credits, collaborate on projects, and manage team permissions. Perfect for agencies, studios, and teams."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, and UPI payments through our secure payment processor. Subscriptions are billed monthly or annually with significant savings on annual plans."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-4">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-400 font-medium">FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Everything you need to know about OmniHub
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="border border-[var(--border-color)] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] transition-colors"
              >
                <span className="font-medium text-[var(--text-primary)]">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-[var(--bg-primary)]">
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
