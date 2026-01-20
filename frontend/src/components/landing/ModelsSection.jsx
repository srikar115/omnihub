import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Video, MessageSquare, Cpu, ExternalLink, Search, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const categories = [
  { id: 'all', label: 'All Models', icon: Cpu },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export function ModelsSection({ onViewAll }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState({ image: [], video: [], chat: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      const allModels = response.data || [];
      
      // Group models by type and get 10 most recent of each
      const imageModels = allModels
        .filter(m => m.type === 'image' && m.enabled)
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          name: m.name,
          provider: m.providerName || m.provider,
          cost: `$${(m.credits || 0).toFixed(2)}`,
          tags: m.tags ? (typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags) : [],
          type: 'image'
        }));
      
      const videoModels = allModels
        .filter(m => m.type === 'video' && m.enabled)
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          name: m.name,
          provider: m.providerName || m.provider,
          cost: `$${(m.credits || 0).toFixed(2)}`,
          tags: m.tags ? (typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags) : [],
          type: 'video'
        }));
      
      const chatModels = allModels
        .filter(m => m.type === 'chat' && m.enabled)
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          name: m.name,
          provider: m.providerName || m.provider,
          cost: `$${((m.inputCost || 0) * 1000).toFixed(3)}/1K`,
          tags: m.tags ? (typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags) : [],
          type: 'chat'
        }));
      
      setModels({
        image: imageModels,
        video: videoModels,
        chat: chatModels
      });
    } catch (err) {
      console.log('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredModels = () => {
    let allModels = [];
    
    if (activeCategory === 'all') {
      allModels = [
        ...(models.image || []),
        ...(models.video || []),
        ...(models.chat || []),
      ];
    } else {
      allModels = models[activeCategory] || [];
    }

    if (searchQuery) {
      allModels = allModels.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return allModels.slice(0, 12);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'image': return 'from-purple-500 to-pink-500';
      case 'video': return 'from-cyan-500 to-blue-500';
      case 'chat': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'chat': return MessageSquare;
      default: return Cpu;
    }
  };

  const filteredModels = getFilteredModels();

  return (
    <section id="models" className="py-20 px-4 sm:px-6 bg-[var(--bg-secondary)]/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4"
          >
            Explore AI models
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[var(--text-secondary)] max-w-2xl mx-auto"
          >
            Access 50+ state-of-the-art AI models from leading providers, all in one place.
          </motion.p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)]" />
                  <div className="flex-1">
                    <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredModels.length > 0 ? (
            filteredModels.map((model, idx) => {
              const TypeIcon = getTypeIcon(model.type);
              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 hover:border-cyan-500/50 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getTypeColor(model.type)} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className="w-5 h-5 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-cyan-400 transition-colors">
                        {model.name}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] truncate">{model.provider}</p>
                    </div>

                    {/* Price */}
                    <div className="text-sm font-mono text-green-400">{model.cost}</div>
                  </div>

                  {/* Tags */}
                  {model.tags && model.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {model.tags.slice(0, 3).map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-2 py-0.5 text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Cpu className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No models found</p>
            </div>
          )}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <button
            onClick={onViewAll}
            className="px-6 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-cyan-500/50 hover:shadow-lg rounded-xl font-medium text-[var(--text-primary)] transition-all inline-flex items-center gap-2"
          >
            View All {models.image.length + models.video.length + models.chat.length || '50+'}  Models
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
