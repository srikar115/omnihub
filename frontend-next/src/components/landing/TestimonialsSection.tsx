'use client';

import { motion } from 'framer-motion';
import { Star, Quote, Building2, Briefcase, Code, Palette, Video, Camera, LucideIcon } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  companyIcon: LucideIcon;
  companyColor: string;
  avatar: string;
  content: string;
  rating: number;
  featured: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Creative Director',
    company: 'DesignStudio',
    companyIcon: Palette,
    companyColor: 'from-purple-500 to-pink-500',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    content: 'OmniHub has completely transformed our creative workflow. Having all AI models in one place saves us hours every week. The quality is consistently excellent.',
    rating: 5,
    featured: true,
  },
  {
    id: '2',
    name: 'Michael Park',
    role: 'Product Manager',
    company: 'TechCorp',
    companyIcon: Code,
    companyColor: 'from-cyan-500 to-blue-500',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    content: 'The cost savings are incredible. We replaced 5 different AI subscriptions with just OmniHub. The unified billing and analytics are a game-changer.',
    rating: 5,
    featured: false,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Marketing Lead',
    company: 'GrowthCo',
    companyIcon: Briefcase,
    companyColor: 'from-green-500 to-emerald-500',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    content: 'Best AI platform I have used. The video generation quality is outstanding, especially with Sora and Veo. Our content production has 10x-ed.',
    rating: 5,
    featured: false,
  },
];

const trustedCompanies = [
  { name: 'TechFlow', icon: Code, color: 'from-blue-500 to-cyan-500' },
  { name: 'DesignLab', icon: Palette, color: 'from-purple-500 to-pink-500' },
  { name: 'MediaPro', icon: Video, color: 'from-red-500 to-orange-500' },
  { name: 'StartupX', icon: Building2, color: 'from-green-500 to-teal-500' },
  { name: 'CreativeCo', icon: Camera, color: 'from-amber-500 to-yellow-500' },
  { name: 'InnovateLab', icon: Briefcase, color: 'from-indigo-500 to-purple-500' },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[var(--bg-secondary)]/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm mb-6"
          >
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-[var(--text-secondary)]">4.9/5 from 500+ reviews</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            <span className="text-[var(--text-primary)]">Trusted by </span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              creators
            </span>
            <span className="text-[var(--text-primary)]"> worldwide</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto"
          >
            See what our customers are saying about their experience with OmniHub
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, idx) => {
            const CompanyIcon = testimonial.companyIcon;
            return (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className={`relative bg-[var(--bg-primary)] border rounded-2xl p-6 transition-all group overflow-hidden ${
                  testimonial.featured 
                    ? 'border-cyan-500/30 shadow-xl shadow-cyan-500/5' 
                    : 'border-[var(--border-color)] hover:border-cyan-500/30 shadow-lg shadow-black/5'
                }`}
              >
                {testimonial.featured && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold rounded-full">
                      Featured
                    </span>
                  </div>
                )}

                <motion.div className="mb-4" whileHover={{ scale: 1.1, rotate: 5 }}>
                  <Quote className="w-10 h-10 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors" />
                </motion.div>

                <p className="text-[var(--text-primary)] mb-6 leading-relaxed text-lg">
                  "{testimonial.content}"
                </p>

                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`absolute -inset-1 bg-gradient-to-br ${testimonial.companyColor} rounded-full opacity-50 blur-sm`} />
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="relative w-12 h-12 rounded-full object-cover border-2 border-[var(--bg-primary)]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--text-primary)]">{testimonial.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{testimonial.role}</div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${testimonial.companyColor} flex items-center justify-center shadow-lg`}>
                    <CompanyIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm text-[var(--text-muted)] mb-8 uppercase tracking-wider font-medium">Trusted by innovative teams at</p>
          <div className="flex flex-wrap justify-center gap-4">
            {trustedCompanies.map((company, idx) => {
              const CompanyIcon = company.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--text-muted)] transition-all group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${company.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <CompanyIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {company.name}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
