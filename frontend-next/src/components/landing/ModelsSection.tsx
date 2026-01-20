'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Video, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';

const API_BASE = '/api';

const modelCategories = [
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

interface Model {
  id: string;
  name: string;
  type: string;
  credits: number;
  thumbnail?: string;
  providerName?: string;
  heading?: string;
  subheading?: string;
}

export function ModelsSection() {
  const [models, setModels] = useState<Model[]>([]);
  const [activeCategory, setActiveCategory] = useState('image');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`);
      const data = await response.json();
      setModels(data.filter((m: Model) => m.type !== 'upscaler'));
    } catch (err) {
      console.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(m => m.type === activeCategory).slice(0, 8);

  return (
    <section id="models" className="py-20 px-4 sm:px-6 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium">70+ AI Models</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Explore Our Models
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Access the best AI models for image generation, video creation, and conversational AI
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {modelCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Models Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--bg-tertiary)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {filteredModels.map((model, idx) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative aspect-square bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-purple-500/50 transition-all cursor-pointer"
              >
                {/* Thumbnail or Gradient */}
                {model.thumbnail ? (
                  <img 
                    src={model.thumbnail} 
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50" />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                    {model.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {model.providerName || 'AI Model'}
                    </span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {(parseFloat(String(model.credits)) || 0).toFixed(2)} cr
                    </span>
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Link */}
        <div className="text-center mt-10">
          <a
            href="/omnihub"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            View All Models
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
