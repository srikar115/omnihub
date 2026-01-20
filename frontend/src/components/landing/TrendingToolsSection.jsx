import { motion } from 'framer-motion';
import { Image, Video, MessageSquare, Wand2, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';

const trendingTools = [
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Create stunning visuals with 30+ AI models',
    modelCount: '30+',
    icon: Image,
    color: 'from-purple-500 to-pink-500',
    stats: { today: '12.5K', label: 'today' },
    examples: [
      'https://images.unsplash.com/photo-1686191128892-3b37add0d1de?w=150',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=150',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150',
      'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=150',
    ],
  },
  {
    id: 'video-gen',
    name: 'Video Generation',
    description: 'Generate cinematic videos with AI',
    modelCount: '15+',
    icon: Video,
    color: 'from-cyan-500 to-blue-500',
    stats: { today: '8.2K', label: 'today' },
    examples: [
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=150',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=150',
      'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=150',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=150',
    ],
  },
  {
    id: 'ai-chat',
    name: 'AI Chat',
    description: 'Chat with the smartest AI models',
    modelCount: '10+',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-500',
    stats: { today: '25K', label: 'today' },
    examples: [
      'https://images.unsplash.com/photo-1676299081847-5c2da1cf6b64?w=150',
      'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=150',
      'https://images.unsplash.com/photo-1675557009875-436f7a5c6f82?w=150',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=150',
    ],
  },
  {
    id: 'enhance',
    name: 'Image Enhance',
    description: 'Upscale, restore & enhance images',
    modelCount: '5+',
    icon: Wand2,
    color: 'from-orange-500 to-yellow-500',
    stats: { today: '4.8K', label: 'today' },
    examples: [
      'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=150',
      'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=150',
      'https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1?w=150',
      'https://images.unsplash.com/photo-1682695797221-8164ff1fafc9?w=150',
    ],
  },
];

export function TrendingToolsSection({ onToolClick }) {
  return (
    <section className="py-16 px-4 sm:px-6 bg-[var(--bg-secondary)]/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Trending Tools</h2>
              <p className="text-sm text-[var(--text-secondary)]">Most popular AI capabilities</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>50K+ generations today</span>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingTools.map((tool, idx) => (
            <motion.button
              key={tool.id}
              onClick={() => onToolClick?.(tool.id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 text-left hover:border-cyan-500/50 transition-all overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header with Icon and Stats */}
                <div className="flex items-start justify-between mb-4">
                  <motion.div 
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <tool.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-[var(--text-muted)]">{tool.stats.label}</div>
                    <div className="text-sm font-bold text-cyan-400">{tool.stats.today}</div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                  {tool.name}
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{tool.description}</p>

                {/* Model count badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r ${tool.color} text-white`}>
                    {tool.modelCount} models
                  </span>
                </div>

                {/* Example Images with improved display */}
                <div className="flex -space-x-3">
                  {tool.examples.map((img, i) => (
                    <motion.img
                      key={i}
                      src={img}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border-2 border-[var(--bg-primary)] shadow-md"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 + i * 0.05 }}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                    />
                  ))}
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--bg-primary)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">
                    +99
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
