'use client';

import { motion } from 'framer-motion';
import { Building2, Shield, Users, Lock, Globe, Check, ArrowRight, Zap, Server, HeadphonesIcon, LucideIcon } from 'lucide-react';

interface EnterpriseFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

const enterpriseFeatures: EnterpriseFeature[] = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II certified with advanced encryption and compliance.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Unlimited seats, role-based access, and centralized billing.',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Lock,
    title: 'SSO & SAML',
    description: 'Single sign-on integration with your identity provider.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Dedicated Infrastructure',
    description: 'Private endpoints and custom deployment options.',
    gradient: 'from-orange-500 to-red-500',
  },
];

const enterpriseBenefits = [
  { text: 'Custom model fine-tuning', icon: Zap },
  { text: '99.9% uptime SLA', icon: Server },
  { text: 'Priority API access', icon: Zap },
  { text: 'Dedicated account manager', icon: HeadphonesIcon },
  { text: 'Custom contracts', icon: Check },
  { text: 'Volume discounts', icon: Check },
];

interface EnterpriseSectionProps {
  onContactSales?: () => void;
}

export function EnterpriseSection({ onContactSales }: EnterpriseSectionProps) {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `
                  linear-gradient(to right, var(--text-primary) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--text-primary) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
            
            <motion.div 
              animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" 
            />
            <motion.div 
              animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" 
            />
          </div>

          <div className="relative z-10 p-8 sm:p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-sm mb-6"
                >
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">For Organizations</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
                >
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Enterprise AI
                  </span>
                  <br />
                  <span className="text-[var(--text-primary)]">without enterprise costs</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-[var(--text-secondary)] mb-10 leading-relaxed"
                >
                  Get the power of 50+ AI models with enterprise-grade security, 
                  compliance, and support. Scale your team's AI capabilities without breaking the bank.
                </motion.p>

                <div className="grid sm:grid-cols-2 gap-4 mb-10">
                  {enterpriseBenefits.map((benefit, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="flex items-center gap-3 group"
                    >
                      <motion.div 
                        className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/30 transition-colors"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      </motion.div>
                      <span className="text-[var(--text-primary)]">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-4"
                >
                  <motion.button
                    onClick={onContactSales}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-semibold text-white transition-all shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
                  >
                    Contact Sales
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  <button className="px-8 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-cyan-500/50 rounded-xl font-semibold text-[var(--text-primary)] transition-all">
                    View Security Docs
                  </button>
                </motion.div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {enterpriseFeatures.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="relative bg-[var(--bg-primary)]/80 backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-6 hover:border-cyan-500/40 transition-all shadow-lg shadow-black/5 group overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    
                    <div className="relative">
                      <motion.div 
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <feature.icon className="w-6 h-6 text-white" />
                      </motion.div>
                      <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2 group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-16 pt-10 border-t border-[var(--border-color)]"
            >
              <p className="text-center text-sm text-[var(--text-muted)] mb-6">Trusted by innovative teams at</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
                {['TechCorp', 'StartupX', 'GlobalCo', 'InnovateLab', 'CreativeStudio'].map((company, idx) => (
                  <div key={idx} className="text-lg font-bold text-[var(--text-muted)]">
                    {company}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
