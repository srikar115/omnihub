import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Star, Loader2, CreditCard, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export default function PricingModal({ isOpen, onClose, user, onSuccess }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/subscription-plans`);
      setPlans(response.data);
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      setError('Please log in to subscribe');
      return;
    }

    setProcessingPlan(plan.id);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Create order
      const orderResponse = await axios.post(
        `${API_BASE}/payments/create-order`,
        {
          planId: plan.id,
          billingCycle,
          type: 'subscription'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { orderId, amount, currency, key } = orderResponse.data;

      // Initialize Razorpay
      const options = {
        key,
        amount,
        currency,
        name: 'Tingu.ai',
        description: `${plan.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await axios.post(
              `${API_BASE}/payments/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                billingCycle,
                type: 'subscription'
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyResponse.data.success) {
              onSuccess?.(verifyResponse.data);
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

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment');
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPrice = (plan) => {
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
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
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
                    <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{formatPrice(getPrice(plan))}</span>
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
                      <span className="text-sm font-medium">
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
