'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Star, Loader2, CreditCard, Sparkles } from 'lucide-react';

const API_BASE = '/api';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  creditsPerMonth: number;
  features: string[];
  isPopular?: number | boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSuccess?: (data: any) => void;
}

export function PricingModal({ isOpen, onClose, user, onSuccess }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/subscription-plans`);
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    setProcessingPlan(plan.id);
    setError('');

    try {
      const token = localStorage.getItem('userToken');
      
      // Create order
      const orderResponse = await fetch(`${API_BASE}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          type: 'subscription'
        }),
      });

      const orderData = await orderResponse.json();
      const { orderId, amount, currency, key } = orderData;

      // Initialize Razorpay
      const options = {
        key,
        amount,
        currency,
        name: 'OmniHub',
        description: `${plan.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${API_BASE}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                billingCycle,
                type: 'subscription'
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              onSuccess?.(verifyData);
              onClose();
            }
          } catch (err) {
            setError('Payment verification failed');
          }
          setProcessingPlan(null);
        },
        prefill: {
          email: user?.email,
          name: user?.name
        },
        theme: {
          color: '#06b6d4'
        },
        modal: {
          ondismiss: function () {
            setProcessingPlan(null);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;
  };

  const getSavingsPercentage = () => 20; // 20% yearly discount

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0d0e14] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Choose Your Plan</h2>
              <p className="text-[#9ca3af]">Select a plan and billing interval that works best for your team</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-[var(--bg-tertiary)] rounded-xl p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-[#0d0e14] text-white shadow-lg'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-[#0d0e14] text-white shadow-lg'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                    Save {getSavingsPercentage()}%
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : (
              /* Plans Grid */
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-2xl p-6 ${
                      plan.isPopular
                        ? 'bg-gradient-to-b from-cyan-500/10 to-transparent border-2 border-cyan-500/50'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                    }`}
                  >
                    {/* Popular Badge */}
                    {plan.isPopular === 1 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          MOST POPULAR
                        </div>
                      </div>
                    )}

                    {/* Plan Name */}
                    <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{plan.name}</h3>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-[var(--text-primary)]">{formatPrice(getPrice(plan))}</span>
                      <span className="text-[var(--text-muted)] text-sm">
                        {billingCycle === 'yearly' ? '/mo (billed yearly)' : '/month'}
                      </span>
                      <p className="text-xs text-[var(--text-muted)] mt-1">+ 18% GST applicable</p>
                    </div>

                    {/* Subscribe Button */}
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={processingPlan === plan.id}
                      className={`w-full py-3 rounded-xl font-medium transition-all mb-6 flex items-center justify-center gap-2 ${
                        plan.isPopular
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                          : 'bg-[var(--bg-tertiary)] hover:bg-[#252830] text-white'
                      }`}
                    >
                      {processingPlan === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Subscribe Now
                        </>
                      )}
                    </button>

                    {/* Plan Description */}
                    <p className="text-sm text-[#9ca3af] mb-4">
                      {plan.id === 'starter' && 'Perfect for individuals and small projects'}
                      {plan.id === 'standard' && 'For growing businesses and teams'}
                      {plan.id === 'professional' && 'Advanced features for scaling companies'}
                    </p>

                    {/* Credits */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-[#0d0e14] rounded-xl">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {plan.creditsPerMonth.toLocaleString()} credits / month
                      </span>
                    </div>

                    {/* Add credits option */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-[#9ca3af]">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Add credits as needed
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-[#d1d5db]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Footer Note */}
            <p className="text-center text-xs text-[var(--text-muted)] mt-8">
              * Credit usage varies based on model and generation type. All plans include access to 50+ AI models.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
