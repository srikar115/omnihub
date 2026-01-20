import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Bot, Palette, Video, MessageSquare, Mic } from 'lucide-react';

// Model provider logos/names for the strip with gradient backgrounds
const modelProviders = [
  { name: 'GPT-5', gradient: 'from-emerald-500 to-teal-600', icon: Bot },
  { name: 'Claude 4', gradient: 'from-orange-500 to-amber-600', icon: MessageSquare },
  { name: 'Gemini 3', gradient: 'from-blue-500 to-indigo-600', icon: Sparkles },
  { name: 'DALL-E 4', gradient: 'from-green-500 to-emerald-600', icon: Palette },
  { name: 'Midjourney', gradient: 'from-purple-500 to-violet-600', icon: Palette },
  { name: 'Stable Diffusion', gradient: 'from-pink-500 to-rose-600', icon: Palette },
  { name: 'FLUX Pro', gradient: 'from-yellow-500 to-orange-600', icon: Zap },
  { name: 'Sora 2', gradient: 'from-red-500 to-pink-600', icon: Video },
  { name: 'Runway', gradient: 'from-cyan-500 to-blue-600', icon: Video },
  { name: 'Kling', gradient: 'from-violet-500 to-purple-600', icon: Video },
  { name: 'Veo 3', gradient: 'from-indigo-500 to-blue-600', icon: Video },
  { name: 'Whisper', gradient: 'from-teal-500 to-cyan-600', icon: Mic },
];

export function HeroSection({ onGetStarted }) {
  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Background grid pattern */}
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
        
        {/* Radial gradient overlay to fade the grid */}
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
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-pink-500 rounded-full blur-[120px]" 
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Badge with enhanced styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="relative group">
            {/* Animated glow behind badge */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-sm">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </motion.div>
              <span className="text-[var(--text-primary)] font-medium">50+ AI Models in One Place</span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-xs text-white font-semibold">
                NEW
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Heading with enhanced typography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span className="text-[var(--text-primary)]">All the </span>
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Models.
              </span>
              {/* Underline decoration */}
              <motion.svg 
                className="absolute -bottom-2 left-0 w-full" 
                viewBox="0 0 300 12" 
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <motion.path 
                  d="M2 8C50 4 100 4 150 6C200 8 250 6 298 4" 
                  stroke="url(#gradient1)" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </span>
            <br />
            <span className="text-[var(--text-primary)]">One </span>
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Workspace.
              </span>
            </span>
          </h1>
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Generate images, videos, and chat with AI. Access GPT-5, Claude, DALL-E, Midjourney, 
          Sora, and 50+ more models with one subscription.
        </motion.p>

        {/* CTA Button with animated gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-14"
        >
          {/* Primary CTA with animated border */}
          <div className="relative group">
            {/* Animated gradient border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
            <button
              onClick={onGetStarted}
              className="relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-semibold text-lg text-white transition-all flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Secondary CTA */}
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)] rounded-xl font-semibold text-[var(--text-primary)] transition-all flex items-center gap-2"
          >
            View Pricing
          </button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-wrap justify-center gap-8 mb-12"
        >
          {[
            { value: '50+', label: 'AI Models' },
            { value: '10K+', label: 'Active Users' },
            { value: '1M+', label: 'Generations' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Model Providers Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          <div className="text-center text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wider font-medium">
            Powered by leading AI providers
          </div>
          
          {/* Scrolling logos with improved styling */}
          <div className="relative overflow-hidden py-2">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10" />
            
            <div className="flex gap-4 animate-scroll">
              {[...modelProviders, ...modelProviders].map((provider, idx) => {
                const Icon = provider.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl whitespace-nowrap hover:border-[var(--border-hover)] transition-colors group"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${provider.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{provider.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
