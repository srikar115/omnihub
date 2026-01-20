'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Wand2, Check, Search, DollarSign, Layers, ChevronDown,
  Image, ImagePlus, Sparkles, Zap, Video, RotateCcw,
  Camera, SlidersHorizontal, Star
} from 'lucide-react';

const API_BASE = '/api';

interface ModelOption {
  label: string;
  type: string;
  default: string;
  choices?: { value: string; label: string; priceMultiplier?: number }[];
}

interface Model {
  id: string;
  name: string;
  type: string;
  credits: number;
  baseCost?: number;
  thumbnail?: string;
  provider?: string;
  providerName?: string;
  category?: string;
  imageInput?: 'none' | 'optional' | 'required';
  maxInputImages?: number;
  tags?: string[];
  options?: Record<string, ModelOption>;
}

interface InputFilter {
  id: string;
  label: string;
  icon: any;
  categories?: string[];
  imageInput?: string[];
  minImages?: number;
}

const INPUT_FILTERS: Record<string, InputFilter[]> = {
  image: [
    { id: 'all', label: 'All Models', icon: Sparkles },
    { id: 'text-to-image', label: 'Text to Image', icon: Wand2, categories: ['text-to-image', 'both'] },
    { id: 'image-to-image', label: 'Image to Image', icon: ImagePlus, categories: ['image-to-image', 'both'], imageInput: ['required', 'optional'] },
    { id: 'upscale', label: 'Upscaling', icon: Zap, categories: ['upscale'] },
    { id: 'multi-ref', label: 'Multi-Reference', icon: Camera, minImages: 2 },
  ],
  video: [
    { id: 'all', label: 'All Models', icon: Sparkles },
    { id: 'text-to-video', label: 'Text to Video', icon: Video, categories: ['text-to-video'] },
    { id: 'image-to-video', label: 'Image to Video', icon: ImagePlus, categories: ['image-to-video'], imageInput: ['required', 'optional'] },
    { id: 'upscale', label: 'Upscaling', icon: Zap, categories: ['upscale'] },
  ],
};

const PROVIDER_GRADIENTS: Record<string, { gradient: string; border: string; accent: string }> = {
  'Black Forest Labs': { gradient: 'from-purple-600/20 to-indigo-600/20', border: 'border-purple-500/30', accent: 'text-purple-400' },
  'Stability AI': { gradient: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', accent: 'text-orange-400' },
  'Recraft': { gradient: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', accent: 'text-cyan-400' },
  'default': { gradient: 'from-gray-600/20 to-gray-800/20', border: 'border-gray-500/30', accent: 'text-gray-400' },
};

interface ModelSelectorModalProps {
  models: Model[];
  selectedModel: Model | null;
  selectedModels?: Model[];
  multiMode?: boolean;
  onSelect: (model: Model) => void;
  onSelectMulti?: (models: Model[]) => void;
  onToggleMultiMode?: (enabled: boolean) => void;
  onClose: () => void;
  generationType: string;
  hasReferenceImages?: boolean;
}

export function ModelSelectorModal({ 
  models, 
  selectedModel, 
  selectedModels = [],
  multiMode = false,
  onSelect, 
  onSelectMulti,
  onToggleMultiMode,
  onClose, 
  generationType,
  hasReferenceImages = false
}: ModelSelectorModalProps) {
  const [activeInputFilter, setActiveInputFilter] = useState('all');
  const [activeProvider, setActiveProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');

  const inputFilters = INPUT_FILTERS[generationType] || INPUT_FILTERS.image;
  const providers = useMemo(() => 
    ['all', ...Array.from(new Set(models.map(m => m.providerName || m.provider).filter(Boolean) as string[]))],
    [models]
  );

  const getProviderStyle = (providerName?: string) => {
    return PROVIDER_GRADIENTS[providerName || ''] || PROVIDER_GRADIENTS.default;
  };

  const handleMultiSelect = (model: Model) => {
    const isSelected = selectedModels.some(m => m.id === model.id);
    
    if (isSelected) {
      onSelectMulti?.(selectedModels.filter(m => m.id !== model.id));
    } else if (selectedModels.length < 4) {
      onSelectMulti?.([...selectedModels, model]);
    }
  };

  const filteredModels = useMemo(() => {
    return models.filter(model => {
      if (activeInputFilter !== 'all') {
        const filter = inputFilters.find(f => f.id === activeInputFilter);
        if (filter) {
          if (filter.categories && !filter.categories.includes(model.category || '')) return false;
          if (filter.imageInput && !filter.imageInput.includes(model.imageInput || '')) return false;
          if (filter.minImages && (model.maxInputImages || 0) < filter.minImages) return false;
        }
      }

      if (activeProvider !== 'all' && (model.providerName || model.provider) !== activeProvider) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = model.name.toLowerCase().includes(query);
        const matchesProvider = (model.providerName || model.provider || '').toLowerCase().includes(query);
        if (!matchesName && !matchesProvider) return false;
      }

      return true;
    });
  }, [models, activeInputFilter, activeProvider, searchQuery, inputFilters]);

  const getCategoryBadge = (model: Model) => {
    if (model.category === 'text-to-image') return { label: 'T2I', color: 'bg-blue-500' };
    if (model.category === 'image-to-image') return { label: 'I2I', color: 'bg-green-500' };
    if (model.category === 'both') return { label: 'Both', color: 'bg-purple-500' };
    if (model.category === 'text-to-video') return { label: 'T2V', color: 'bg-pink-500' };
    if (model.category === 'image-to-video') return { label: 'I2V', color: 'bg-cyan-500' };
    return null;
  };

  return (
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
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              {multiMode ? <Layers className="w-6 h-6 text-purple-400" /> : <Wand2 className="w-6 h-6 text-purple-400" />}
              {multiMode ? 'Select Models to Compare' : 'Select Model'}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {multiMode 
                ? `Select up to 4 models - ${selectedModels.length}/4 selected`
                : `${filteredModels.length} models available`
              }
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Multi-Model Toggle Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-sm text-[var(--text-primary)]">Multi-Model Comparison</p>
              <p className="text-xs text-[var(--text-muted)]">Generate with up to 4 models simultaneously</p>
            </div>
          </div>
          <button
            onClick={() => onToggleMultiMode?.(!multiMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              multiMode ? 'bg-purple-500' : 'bg-[var(--border-color)]'
            }`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
              multiMode ? 'left-8' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 overflow-x-auto">
          {inputFilters.map(filter => {
            const FilterIcon = filter.icon;
            const isActive = activeInputFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveInputFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <FilterIcon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-purple-500/50 transition-colors text-[var(--text-primary)]"
            />
          </div>

          <select
            value={activeProvider}
            onChange={(e) => setActiveProvider(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 cursor-pointer text-[var(--text-primary)]"
          >
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {provider === 'all' ? 'All Providers' : provider}
              </option>
            ))}
          </select>
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredModels.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Wand2 className="w-10 h-10 opacity-30" />
              </div>
              <p className="text-lg font-medium mb-2">No models found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredModels.map(model => {
                const isSelectedSingle = selectedModel?.id === model.id;
                const isSelectedMulti = selectedModels.some(m => m.id === model.id);
                const selectedIndex = selectedModels.findIndex(m => m.id === model.id);
                const providerStyle = getProviderStyle(model.providerName || model.provider);
                const badge = getCategoryBadge(model);
                
                return (
                  <motion.button
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      if (multiMode) {
                        handleMultiSelect(model);
                      } else {
                        onSelect(model);
                      }
                    }}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all text-left ${
                      multiMode
                        ? isSelectedMulti
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-[var(--border-color)] hover:border-purple-500/50'
                        : isSelectedSingle
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-[var(--border-color)] hover:border-purple-500/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className={`aspect-[4/3] relative bg-gradient-to-br ${providerStyle.gradient}`}>
                      {model.thumbnail ? (
                        <img src={model.thumbnail} alt={model.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-bold text-white/20">{model.name.charAt(0)}</span>
                        </div>
                      )}
                      
                      {multiMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelectedMulti 
                              ? 'bg-purple-500 border-purple-500' 
                              : 'border-white/50 bg-black/40 backdrop-blur-sm'
                          }`}>
                            {isSelectedMulti ? (
                              <span className="text-sm font-bold text-white">{selectedIndex + 1}</span>
                            ) : (
                              <Check className="w-4 h-4 text-white/50" />
                            )}
                          </div>
                        </div>
                      )}

                      {badge && (
                        <div className="absolute top-2 right-2 z-10">
                          <span className={`px-2 py-1 ${badge.color} text-white text-xs rounded-lg font-medium`}>
                            {badge.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Model Info */}
                    <div className="p-3 bg-[var(--bg-primary)]">
                      <p className="font-semibold text-sm truncate text-[var(--text-primary)]">{model.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${providerStyle.accent}`}>
                          {model.providerName || model.provider}
                        </span>
                        <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                          {(model.credits || 0).toFixed(1)} cr
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]/50">
          <span className="text-sm text-[var(--text-muted)]">
            {filteredModels.length} of {models.length} models
          </span>
          <div className="flex items-center gap-2">
            {multiMode && selectedModels.length > 0 && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 rounded-xl text-sm font-medium transition-all text-white"
              >
                Done ({selectedModels.length} selected)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl text-sm transition-colors border border-[var(--border-color)] text-[var(--text-primary)]"
            >
              {multiMode && selectedModels.length > 0 ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
