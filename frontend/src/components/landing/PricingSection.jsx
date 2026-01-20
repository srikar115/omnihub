import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Building2, Sparkles, Image, Video, MessageSquare, Shield, Users, Headphones } from 'lucide-react';

const defaultPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals getting started',
    priceMonthly: 0,
    priceYearly: 0,
    creditsPerMonth: 100,
    icon: Zap,
    iconColor: 'from-gray-400 to-gray-500',
    features: [
      { text: '100 credits/month', icon: Zap },
      { text: 'All image models', icon: Image },
      { text: 'Basic video models', icon: Video },
      { text: 'Standard chat models', icon: MessageSquare },
      { text: 'Community support', icon: Users },
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For creators and professionals',
    priceMonthly: 2190,
    priceYearly: 21900,
    creditsPerMonth: 2500,
    icon: Star,
    iconColor: 'from-cyan-400 to-blue-500',
    features: [
      { text: '2,500 credits/month', icon: Zap },
      { text: 'All AI models', icon: Sparkles },
      { text: 'Priority generation', icon: Zap },
      { text: 'Advanced video (Sora, Veo)', icon: Video },
      { text: 'API access', icon: Shield },
      { text: 'Email support', icon: Headphones },
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    id: 'production',
    name: 'Production',
    description: 'For teams and businesses',
    priceMonthly: 7200,
    priceYearly: 72000,
    creditsPerMonth: 10000,
    icon: Building2,
    iconColor: 'from-purple-400 to-pink-500',
    features: [
      { text: '10,000 credits/month', icon: Zap },
      { text: 'All AI models', icon: Sparkles },
      { text: 'Fastest generation', icon: Zap },
      { text: 'Team workspaces (5 seats)', icon: Users },
      { text: 'Priority API access', icon: Shield },
      { text: 'Dedicated support', icon: Headphones },
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    priceMonthly: null,
    priceYearly: null,
    creditsPerMonth: null,
    icon: Shield,
    iconColor: 'from-amber-400 to-orange-500',
    features: [
      { text: 'Unlimited credits', icon: Zap },
      { text: 'Custom model fine-tuning', icon: Sparkles },
      { text: 'Unlimited team seats', icon: Users },
      { text: 'SSO & advanced security', icon: Shield },
      { text: 'SLA guarantee', icon: Check },
      { text: 'Dedicated account manager', icon: Headphones },
    ],
    cta: "Let's Talk",
    popular: false,
  },
];

export function PricingSection({ plans = defaultPlans, onSelectPlan, onGetStarted }) {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const formatPrice = (price) => {
    if (price === null) return 'Custom';
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 bg-[var(--bg-secondary)]/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-[var(--text-secondary)]">Simple pricing, powerful features</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6"
          >
            Unleash your <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">potential</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10"
          >
            Choose the plan that fits your needs. All plans include access to our full suite of AI models.
          </motion.p>

          {/* Billing Toggle - Enhanced */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-1 p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl"
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Yearly
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">-17%</span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            // Fallback to Zap if icon is not defined (e.g., from API data)
            const PlanIcon = plan.icon || Zap;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative rounded-2xl p-6 transition-all w-full sm:w-[calc(50%-12px)] lg:w-[280px] ${
                  plan.popular
                    ? 'bg-gradient-to-b from-cyan-500/10 via-[var(--bg-primary)] to-[var(--bg-primary)] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 lg:scale-105 lg:-my-2 z-10'
                    : 'bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xl shadow-black/5 hover:shadow-2xl hover:border-cyan-500/30'
                }`}
              >
                {/* Popular Badge - Animated */}
                {plan.popular && (
                  <motion.div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-cyan-500/30">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      MOST POPULAR
                    </div>
                  </motion.div>
                )}

                {/* Plan Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.iconColor || 'from-cyan-400 to-blue-500'} flex items-center justify-center mb-4 shadow-lg`}>
                  <PlanIcon className="w-6 h-6 text-white" />
                </div>

                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{plan.description}</p>
                </div>

                {/* Price - Enhanced with gradient */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent' 
                        : 'text-[var(--text-primary)]'
                    }`}>
                      {formatPrice(billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly)}
                    </span>
                    {plan.priceMonthly !== null && plan.priceMonthly !== 0 && (
                      <span className="text-sm text-[var(--text-muted)]">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && plan.priceYearly && (
                    <p className="text-xs text-green-400 mt-1">
                      Save ₹{((plan.priceMonthly * 12) - plan.priceYearly).toLocaleString()}/year
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={() => (plan.id === 'enterprise' ? onSelectPlan?.(plan) : onGetStarted?.())}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all mb-6 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)]'
                  }`}
                >
                  {plan.cta}
                </motion.button>

                {/* Credits Badge */}
                {plan.creditsPerMonth && (
                  <div className="flex items-center gap-2 mb-5 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {plan.creditsPerMonth.toLocaleString()} credits/month
                    </span>
                  </div>
                )}

                {/* Features with icons */}
                <ul className="space-y-3">
                  {(plan.features || []).map((feature, fidx) => {
                    // feature might be a string or an object with text property
                    const featureText = typeof feature === 'string' ? feature : feature?.text || feature;
                    return (
                      <motion.li 
                        key={fidx} 
                        className="flex items-start gap-3 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 + fidx * 0.05 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <span className="text-[var(--text-secondary)]">{featureText}</span>
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-[var(--text-secondary)]">
            Need help choosing? <a href="#" className="text-cyan-400 hover:underline font-medium">Compare all features</a> or <a href="#" className="text-cyan-400 hover:underline font-medium">contact sales</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
