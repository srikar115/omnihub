'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Bot, Palette, Video, MessageSquare, Mic } from 'lucide-react';

// Model provider logos/names for the strip
const modelProviders = [
  { name: 'GPT-4', gradient: 'from-emerald-500 to-teal-600', icon: Bot },
  { name: 'Claude 3', gradient: 'from-orange-500 to-amber-600', icon: MessageSquare },
  { name: 'Gemini', gradient: 'from-blue-500 to-indigo-600', icon: Sparkles },
  { name: 'DALL-E 3', gradient: 'from-green-500 to-emerald-600', icon: Palette },
  { name: 'Midjourney', gradient: 'from-purple-500 to-violet-600', icon: Palette },
  { name: 'FLUX Pro', gradient: 'from-yellow-500 to-orange-600', icon: Zap },
  { name: 'Sora', gradient: 'from-red-500 to-pink-600', icon: Video },
  { name: 'Runway', gradient: 'from-cyan-500 to-blue-600', icon: Video },
  { name: 'Kling AI', gradient: 'from-violet-500 to-purple-600', icon: Video },
  { name: 'Luma', gradient: 'from-indigo-500 to-blue-600', icon: Video },
  { name: 'Whisper', gradient: 'from-teal-500 to-cyan-600', icon: Mic },
];

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--text-primary) 1px, transparent 1px),
              linear-gradient(to bottom, var(--text-primary) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg-primary)_70%)]" />
        
        {/* Animated gradient orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500 rounded-full blur-[180px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[150px]" 
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </motion.div>
              <span className="text-[var(--text-primary)] font-medium">70+ AI Models in One Place</span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-xs text-white font-semibold">
                NEW
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span className="text-[var(--text-primary)]">All the </span>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Best AI Models
            </span>
            <br />
            <span className="text-[var(--text-primary)]">in One Place</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg sm:text-xl text-[var(--text-secondary)] text-center max-w-2xl mx-auto mb-10"
        >
          Generate stunning images, create videos, and chat with AI - all from a single platform. 
          Access FLUX, Kling, Runway, GPT-4, Claude and 70+ more models instantly.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <button
            onClick={onGetStarted}
            className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Start Creating Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#models"
            className="px-8 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium rounded-xl hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
          >
            Explore Models
          </a>
        </motion.div>

        {/* Model Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          <p className="text-center text-[var(--text-muted)] text-sm mb-4">
            Powered by leading AI providers
          </p>
          
          <div className="relative overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10" />
            
            {/* Scrolling strip */}
            <div className="flex gap-4 animate-scroll">
              {[...modelProviders, ...modelProviders].map((provider, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full"
                >
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${provider.gradient}`}>
                    <provider.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Animation keyframes in CSS */}
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
