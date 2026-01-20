import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DollarSign, Layers, Zap, Check, ArrowRight, TrendingDown, Sparkles } from 'lucide-react';

const benefits = [
  'One subscription for all AI models',
  'Pay only for what you use',
  'No per-model subscriptions',
  'Switch models instantly',
  'Unified billing & analytics',
  'Save 70% vs. separate tools',
];

const comparisonData = [
  { tool: 'Midjourney', price: '$30/mo', included: true },
  { tool: 'ChatGPT Plus', price: '$20/mo', included: true },
  { tool: 'Claude Pro', price: '$20/mo', included: true },
  { tool: 'Runway', price: '$15/mo', included: true },
  { tool: 'DALL-E Credits', price: '$15/mo', included: true },
  { tool: 'Total Separate', price: '$100+/mo', included: false },
];

// Animated counter component
function AnimatedCounter({ target, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime;
    const startValue = 0;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (target - startValue) * easeOut);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function ValuePropSection({ onGetStarted }) {
  return (
    <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Savings badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-sm mb-6"
            >
              <TrendingDown className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">Save up to 70% on AI tools</span>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              <span className="text-[var(--text-primary)]">Stop burning cash on</span>
              <br />
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                fragmented tools
              </span>
            </h2>

            <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
              Why pay for multiple AI subscriptions when you can get them all in one place? 
              Tingu.ai gives you access to 50+ AI models for a fraction of the cost.
            </p>

            {/* Benefits List with animated checkmarks */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 group"
                >
                  <motion.div 
                    className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </motion.div>
                  <span className="text-sm text-[var(--text-primary)]">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={onGetStarted}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-semibold text-white transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              Start Saving Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Right - Price Comparison Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-8 shadow-2xl shadow-black/10">
              {/* Header with animated savings percentage */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Price Comparison</h3>
                <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-lg font-bold rounded-full flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  Save <AnimatedCounter target={70} suffix="%" />
                </div>
              </div>

              {/* Comparison List */}
              <div className="space-y-3 mb-8">
                {comparisonData.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      item.included 
                        ? 'bg-[var(--bg-primary)]/50 hover:bg-[var(--bg-primary)]' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.included ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <DollarSign className="w-3.5 h-3.5 text-red-400" />
                        </div>
                      )}
                      <span className={`font-medium ${item.included ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>
                        {item.tool}
                      </span>
                    </div>
                    <span className={`font-semibold ${
                      item.included 
                        ? 'text-[var(--text-muted)] line-through' 
                        : 'text-red-400'
                    }`}>
                      {item.price}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Tingu Price - Enhanced prominent card */}
              <motion.div 
                className="relative bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-2 border-cyan-500/40 rounded-2xl p-6 overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Animated gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <Layers className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-[var(--text-primary)]">Tingu.ai</span>
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">All 50+ models included</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-[var(--text-muted)]">from</span>
                      <span className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">$15</span>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">/month</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
