import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  X, Wand2, Check, Search, DollarSign, Layers, ChevronDown,
  Image, ImagePlus, Sparkles, Zap, Eye, Video, RotateCcw,
  Camera, SlidersHorizontal, Star, Info
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

// Input type filter definitions
const INPUT_FILTERS = {
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

// Provider colors for backgrounds
const PROVIDER_GRADIENTS = {
  'Black Forest Labs': { gradient: 'from-purple-600/20 to-indigo-600/20', border: 'border-purple-500/30', accent: 'text-purple-400' },
  'Stability AI': { gradient: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', accent: 'text-orange-400' },
  'Recraft': { gradient: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', accent: 'text-cyan-400' },
  'Ideogram': { gradient: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', accent: 'text-pink-400' },
  'Google': { gradient: 'from-blue-500/20 to-green-500/20', border: 'border-blue-500/30', accent: 'text-blue-400' },
  'OpenAI': { gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
  'Alibaba': { gradient: 'from-orange-400/20 to-yellow-500/20', border: 'border-orange-400/30', accent: 'text-orange-400' },
  'ByteDance': { gradient: 'from-cyan-400/20 to-pink-500/20', border: 'border-cyan-400/30', accent: 'text-cyan-400' },
  'Zhipu AI': { gradient: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/30', accent: 'text-violet-400' },
  'Tongyi-MAI': { gradient: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', accent: 'text-amber-400' },
  'Clarity AI': { gradient: 'from-sky-500/20 to-indigo-500/20', border: 'border-sky-500/30', accent: 'text-sky-400' },
  'Lightricks': { gradient: 'from-pink-500/20 to-fuchsia-500/20', border: 'border-pink-500/30', accent: 'text-pink-400' },
  'Kuaishou': { gradient: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', accent: 'text-red-400' },
  'Community': { gradient: 'from-gray-500/20 to-gray-700/20', border: 'border-gray-500/30', accent: 'text-gray-400' },
  'Fal.ai': { gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
  'default': { gradient: 'from-gray-600/20 to-gray-800/20', border: 'border-gray-500/30', accent: 'text-gray-400' },
};

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
}) {
  const [activeInputFilter, setActiveInputFilter] = useState('all');
  const [activeProvider, setActiveProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [pricingSettings, setPricingSettings] = useState({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
  });

  // Fetch pricing settings on mount
  useEffect(() => {
    const fetchPricingSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE}/admin/settings`);
        setPricingSettings({
          profitMargin: parseFloat(response.data.profitMargin) || 0,
          profitMarginImage: parseFloat(response.data.profitMarginImage) || 0,
          profitMarginVideo: parseFloat(response.data.profitMarginVideo) || 0,
          profitMarginChat: parseFloat(response.data.profitMarginChat) || 0,
          creditPrice: parseFloat(response.data.creditPrice) || 1,
        });
      } catch (err) {
        // Silently fail - use defaults
        console.log('Using default pricing settings');
      }
    };
    fetchPricingSettings();
  }, []);

  // Calculate user-facing credits with profit margin and credit conversion
  const calculateUserCredits = (model) => {
    const baseCost = model.baseCost || model.credits || 0;
    
    // Get the appropriate margin (type-specific or universal)
    let margin = pricingSettings.profitMargin;
    if (model.type === 'image' && pricingSettings.profitMarginImage > 0) {
      margin = pricingSettings.profitMarginImage;
    } else if (model.type === 'video' && pricingSettings.profitMarginVideo > 0) {
      margin = pricingSettings.profitMarginVideo;
    } else if (model.type === 'chat' && pricingSettings.profitMarginChat > 0) {
      margin = pricingSettings.profitMarginChat;
    }
    
    // Calculate final USD price with margin
    const finalUSD = baseCost * (1 + margin / 100);
    
    // Convert to credits (creditPrice is USD per credit)
    const userCredits = finalUSD / pricingSettings.creditPrice;
    
    return userCredits;
  };

  const inputFilters = INPUT_FILTERS[generationType] || INPUT_FILTERS.image;
  const providers = useMemo(() => 
    ['all', ...new Set(models.map(m => m.providerName || m.provider).filter(Boolean))],
    [models]
  );

  const getProviderStyle = (providerName) => {
    return PROVIDER_GRADIENTS[providerName] || PROVIDER_GRADIENTS.default;
  };

  const getModelCompatibility = (model) => {
    if (!hasReferenceImages) {
      return { compatible: true, reason: null };
    }
    if (model.imageInput === 'none') {
      return { 
        compatible: false, 
        reason: 'No image input support' 
      };
    }
    return { compatible: true, reason: null };
  };

  const handleMultiSelect = (model) => {
    const isSelected = selectedModels.some(m => m.id === model.id);
    
    if (isSelected) {
      onSelectMulti?.(selectedModels.filter(m => m.id !== model.id));
    } else if (selectedModels.length < 4) {
      onSelectMulti?.([...selectedModels, model]);
    }
  };

  const filteredModels = useMemo(() => {
    return models.filter(model => {
      // Input type filter
      if (activeInputFilter !== 'all') {
        const filter = inputFilters.find(f => f.id === activeInputFilter);
        if (filter) {
          // Check categories (supports array of acceptable categories)
          if (filter.categories && !filter.categories.includes(model.category)) return false;
          // For image-to-image, also need to check if model can accept images
          if (filter.imageInput && !filter.imageInput.includes(model.imageInput)) return false;
          if (filter.minImages && (model.maxInputImages || 0) < filter.minImages) return false;
        }
      }

      // Provider filter
      if (activeProvider !== 'all' && (model.providerName || model.provider) !== activeProvider) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = model.name.toLowerCase().includes(query);
        const matchesProvider = (model.providerName || model.provider || '').toLowerCase().includes(query);
        const matchesTags = model.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesProvider && !matchesTags) return false;
      }

      // Price filter (using calculated user credits)
      const userCredits = calculateUserCredits(model);
      if (priceFilter === 'budget' && userCredits > 50) return false;
      if (priceFilter === 'mid' && (userCredits < 50 || userCredits > 200)) return false;
      if (priceFilter === 'premium' && userCredits < 200) return false;
      
      return true;
    });
  }, [models, activeInputFilter, activeProvider, searchQuery, priceFilter, inputFilters]);

  const getCategoryBadge = (model) => {
    if (model.category === 'text-to-image') return { label: 'T2I', color: 'bg-blue-500' };
    if (model.category === 'image-to-image') return { label: 'I2I', color: 'bg-green-500' };
    if (model.category === 'both') return { label: 'Both', color: 'bg-purple-500' };
    if (model.category === 'text-to-video') return { label: 'T2V', color: 'bg-pink-500' };
    if (model.category === 'image-to-video') return { label: 'I2V', color: 'bg-cyan-500' };
    return null;
  };

  const getCapabilityIcons = (model) => {
    const icons = [];
    if (model.imageInput === 'optional') icons.push({ icon: ImagePlus, label: 'Accepts images', color: 'text-cyan-400' });
    if (model.imageInput === 'required') icons.push({ icon: Image, label: 'Requires image', color: 'text-green-400' });
    if (model.maxInputImages > 1) icons.push({ icon: Camera, label: `Up to ${model.maxInputImages} images`, color: 'text-amber-400' });
    return icons;
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
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              {multiMode ? <Layers className="w-6 h-6 text-purple-400" /> : <Wand2 className="w-6 h-6 text-purple-400" />}
              {multiMode ? 'Select Models to Compare' : `Select ${generationType === 'image' ? 'Image' : generationType === 'video' ? 'Video' : 'Chat'} Model`}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {multiMode 
                ? `Select up to 4 models • ${selectedModels.length}/4 selected`
                : `${filteredModels.length} models available`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Models Summary (Multi-mode) */}
        {multiMode && selectedModels.length > 0 && (
          <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Selected Models</span>
              <button
                onClick={() => onSelectMulti?.([])}
                className="ml-auto text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedModels.map((model, idx) => {
                const providerStyle = getProviderStyle(model.providerName || model.provider);
                const badge = getCategoryBadge(model);
                return (
                  <div
                    key={model.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border ${providerStyle.border}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{model.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{model.providerName || model.provider}</span>
                        {badge && (
                          <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                        <span className="text-green-400 font-mono">{calculateUserCredits(model).toFixed(1)} cr</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMultiSelect(model)}
                      className="ml-2 p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Model Toggle Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Multi-Model Comparison</p>
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

        {/* Input Type Filter Tabs */}
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
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-color)]'
                }`}
              >
                <FilterIcon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search, Provider Filter, and Price Filter */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search models, providers, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Provider Filter */}
          <div className="relative">
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value)}
              className="appearance-none bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-purple-500/50 cursor-pointer"
            >
              {providers.map(provider => (
                <option key={provider} value={provider}>
                  {provider === 'all' ? 'All Providers' : provider}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {/* Price Filter */}
          <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-transparent text-sm outline-none cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="budget">Budget (≤$0.02)</option>
              <option value="mid">Mid ($0.02-$0.05)</option>
              <option value="premium">Premium (≥$0.05)</option>
            </select>
          </div>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              showFilters ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredModels.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Wand2 className="w-10 h-10 opacity-30" />
              </div>
              <p className="text-lg font-medium mb-2">No models found</p>
              <p className="text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredModels.map(model => {
                const compatibility = getModelCompatibility(model);
                const isSelectedSingle = selectedModel?.id === model.id;
                const isSelectedMulti = selectedModels.some(m => m.id === model.id);
                const selectedIndex = selectedModels.findIndex(m => m.id === model.id);
                const isDisabled = multiMode && !compatibility.compatible;
                const providerStyle = getProviderStyle(model.providerName || model.provider);
                const badge = getCategoryBadge(model);
                const capabilities = getCapabilityIcons(model);
                
                return (
                  <motion.button
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      if (isDisabled) return;
                      if (multiMode) {
                        handleMultiSelect(model);
                      } else {
                        onSelect(model);
                      }
                    }}
                    disabled={isDisabled}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all text-left ${
                      isDisabled 
                        ? 'border-[var(--border-color)] opacity-50 cursor-not-allowed'
                        : multiMode
                          ? isSelectedMulti
                            ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                            : `border-[var(--border-color)] hover:border-purple-500/50 hover:shadow-lg`
                          : isSelectedSingle
                            ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                            : `border-[var(--border-color)] hover:border-purple-500/50 hover:shadow-lg`
                    }`}
                  >
                    {/* Thumbnail / Visual Area */}
                    <div className={`aspect-[4/3] relative bg-gradient-to-br ${providerStyle.gradient}`}>
                      {model.thumbnail ? (
                        <img
                          src={model.thumbnail}
                          alt={model.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          <span className="text-4xl font-bold text-white/20 mb-2">
                            {model.name.charAt(0)}
                          </span>
                          <span className={`text-xs ${providerStyle.accent} opacity-60`}>
                            {model.providerName || model.provider}
                          </span>
                        </div>
                      )}
                      
                      {/* Multi-select checkbox */}
                      {multiMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <div
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shadow-lg ${
                              isSelectedMulti 
                                ? 'bg-purple-500 border-purple-500' 
                                : 'border-white/50 bg-black/40 backdrop-blur-sm group-hover:border-white'
                            } ${isDisabled ? 'opacity-30' : ''}`}
                          >
                            {isSelectedMulti ? (
                              <span className="text-sm font-bold text-white">{selectedIndex + 1}</span>
                            ) : (
                              <Check className="w-4 h-4 text-white/50" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Category Badge */}
                      {badge && !isDisabled && (
                        <div className="absolute top-2 right-2 z-10">
                          <span className={`px-2 py-1 ${badge.color} text-white text-xs rounded-lg font-medium shadow-lg`}>
                            {badge.label}
                          </span>
                        </div>
                      )}

                      {/* Capability Icons */}
                      {capabilities.length > 0 && !isDisabled && (
                        <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                          {capabilities.map((cap, idx) => (
                            <div
                              key={idx}
                              className="w-6 h-6 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center"
                              title={cap.label}
                            >
                              <cap.icon className={`w-3.5 h-3.5 ${cap.color}`} />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Overlay for disabled */}
                      {isDisabled && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <p className="text-xs text-white/60 text-center px-2">{compatibility.reason}</p>
                        </div>
                      )}

                      {/* Hover overlay (single mode) */}
                      {!multiMode && !isDisabled && (
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <span className="text-white text-sm font-medium flex items-center gap-1">
                            <Check className="w-4 h-4" /> Select
                          </span>
                        </div>
                      )}

                      {/* Selected indicator (single mode) */}
                      {!multiMode && isSelectedSingle && (
                        <div className="absolute top-2 left-2 w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center z-10 shadow-lg">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Model Info */}
                    <div className="p-3 bg-[var(--bg-primary)]">
                      <p className="font-semibold text-sm truncate mb-1">{model.name}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${providerStyle.accent}`}>
                          {model.providerName || model.provider}
                        </span>
                        <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                          {calculateUserCredits(model).toFixed(1)} credits
                        </span>
                      </div>
                      
                      {/* Tags */}
                      {model.tags?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {model.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] text-[var(--text-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]/50">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">
              {filteredModels.length} of {models.length} models
            </span>
            {hasReferenceImages && (
              <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center gap-1">
                <ImagePlus className="w-3 h-3" />
                Reference images attached
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {multiMode && selectedModels.length > 0 && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-500/20"
              >
                Done ({selectedModels.length} selected)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl text-sm transition-colors border border-[var(--border-color)]"
            >
              {multiMode && selectedModels.length > 0 ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
