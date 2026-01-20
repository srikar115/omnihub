import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, ExternalLink, Sparkles, Star } from 'lucide-react';

// Mock data - will be replaced with API data
const defaultFeaturedItems = [
  {
    id: '1',
    type: 'model_launch',
    title: 'Veo 3.1 is Here',
    description: 'Generate stunning 8-second videos with native audio support. Industry-leading quality and consistency.',
    mediaUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
    mediaType: 'image',
    linkUrl: '/omnihub?type=video',
    linkText: 'Try Now',
    featured: true,
  },
  {
    id: '2',
    type: 'feature',
    title: 'Multi-Model Compare',
    description: 'Compare up to 4 AI models side-by-side in one generation. Find your perfect model instantly.',
    mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    mediaType: 'image',
    linkUrl: '/omnihub',
    linkText: 'Learn More',
    featured: false,
  },
  {
    id: '3',
    type: 'announcement',
    title: 'Kling 2.6 Pro Released',
    description: 'The latest video generation model with improved quality, motion coherence, and faster processing.',
    mediaUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
    mediaType: 'image',
    linkUrl: '/omnihub?type=video',
    linkText: 'Generate',
    featured: true,
  },
  {
    id: '4',
    type: 'model_launch',
    title: 'FLUX 1.1 Pro Ultra',
    description: 'Photorealistic images with unprecedented detail. Perfect for professional and creative work.',
    mediaUrl: 'https://images.unsplash.com/photo-1686191128892-3b37add0d1de?w=400',
    mediaType: 'image',
    linkUrl: '/omnihub?type=image',
    linkText: 'Create',
    featured: false,
  },
];

export function WhatsNewSection({ featuredItems = defaultFeaturedItems }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 380;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'model_launch': return 'from-cyan-500 to-blue-500';
      case 'feature': return 'from-purple-500 to-pink-500';
      case 'announcement': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'model_launch': return 'New Model';
      case 'feature': return 'Feature';
      case 'announcement': return 'Announcement';
      default: return 'Update';
    }
  };

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400 uppercase tracking-wider">Latest Updates</span>
            </div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              What's New @ <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Tingu</span>?
            </h2>
            <p className="text-[var(--text-secondary)] mt-2">
              Stay ahead with the latest models, features, and announcements
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Cards */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {featuredItems.map((item, idx) => (
            <motion.a
              key={item.id}
              href={item.linkUrl}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex-shrink-0 w-[320px] sm:w-[350px] group"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className={`relative bg-[var(--bg-secondary)] border rounded-2xl overflow-hidden transition-all duration-300 ${
                item.featured 
                  ? 'border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 hover:border-cyan-500/50' 
                  : 'border-[var(--border-color)] hover:border-cyan-500/50 shadow-lg shadow-black/10 hover:shadow-xl'
              }`}>
                {/* Featured glow effect */}
                {item.featured && (
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                )}
                
                {/* Media */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Gradient overlay on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {item.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform border border-white/30">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold text-white rounded-lg bg-gradient-to-r ${getTypeColor(item.type)} shadow-lg`}>
                      {getTypeLabel(item.type)}
                    </span>
                    {item.featured && (
                      <span className="px-2.5 py-1 text-xs font-semibold text-yellow-100 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2 group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-cyan-400 font-semibold group-hover:gap-2.5 transition-all">
                    {item.linkText}
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
