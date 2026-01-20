'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  creditsPerMonth: number;
  features: string[];
  isPopular?: boolean;
}

const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    creditsPerMonth: 10,
    features: [
      '10 free credits to start',
      'Access to all models',
      'Standard generation speed',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29,
    creditsPerMonth: 500,
    features: [
      '500 credits per month',
      'Priority generation queue',
      'Advanced model options',
      'Email support',
      'API access',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 99,
    creditsPerMonth: 2000,
    features: [
      '2000 credits per month',
      'Fastest generation speed',
      'Custom model training',
      'Dedicated support',
      'SLA guarantee',
      'Team workspaces',
    ],
  },
];

interface PricingSectionProps {
  plans?: Plan[];
  onGetStarted: () => void;
}

export function PricingSection({ plans = defaultPlans, onGetStarted }: PricingSectionProps) {
  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  const getIcon = (planId: string) => {
    switch (planId) {
      case 'free': return Sparkles;
      case 'pro': return Zap;
      default: return Crown;
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">Simple Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Pay Only for What You Use
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Start free, scale as you grow. 1 credit = $1 with transparent pricing across all models.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {displayPlans.slice(0, 3).map((plan, idx) => {
            const Icon = getIcon(plan.id);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-6 rounded-2xl border ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/50'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full text-xs text-white font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${
                    plan.isPopular ? 'bg-purple-500/20' : 'bg-[var(--bg-tertiary)]'
                  }`}>
                    <Icon className={`w-6 h-6 ${plan.isPopular ? 'text-purple-400' : 'text-[var(--text-secondary)]'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-[var(--text-primary)]">
                      ${plan.priceMonthly}
                    </span>
                    <span className="text-[var(--text-secondary)]">/month</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    {plan.creditsPerMonth} credits included
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {(plan.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.isPopular
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-color)]'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Pay-as-you-go note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-[var(--text-muted)] text-sm mt-10"
        >
          Need more credits? Purchase additional credits anytime at $1 per credit.
        </motion.p>
      </div>
    </section>
  );
}
