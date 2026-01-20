'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Check, Eye, Globe, Zap, Brain, Search,
  MessageSquare
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  inputCost: number;
  outputCost: number;
  capabilities?: {
    vision?: boolean;
    webSearch?: boolean;
    reasoning?: boolean;
    maxContext?: number;
  };
}

interface ChatModelSelectorModalProps {
  models: Model[];
  selectedModel: Model | null;
  onSelect: (model: Model) => void;
  onClose: () => void;
}

const PROVIDER_INFO: Record<string, { color: string; name: string }> = {
  'OpenAI': { color: 'from-green-500 to-emerald-600', name: 'OpenAI' },
  'Anthropic': { color: 'from-orange-500 to-amber-600', name: 'Anthropic' },
  'Google': { color: 'from-blue-500 to-cyan-600', name: 'Google' },
  'Meta': { color: 'from-blue-600 to-indigo-600', name: 'Meta' },
  'DeepSeek': { color: 'from-purple-500 to-violet-600', name: 'DeepSeek' },
  'Qwen': { color: 'from-red-500 to-pink-600', name: 'Qwen' },
  'Mistral': { color: 'from-yellow-500 to-orange-600', name: 'Mistral' },
  'Other': { color: 'from-gray-500 to-slate-600', name: 'Other' },
};

function getProviderFromId(id: string): string {
  if (id.startsWith('openai/')) return 'OpenAI';
  if (id.startsWith('anthropic/')) return 'Anthropic';
  if (id.startsWith('google/')) return 'Google';
  if (id.startsWith('meta-llama/')) return 'Meta';
  if (id.startsWith('deepseek/')) return 'DeepSeek';
  if (id.startsWith('qwen/')) return 'Qwen';
  if (id.startsWith('mistralai/')) return 'Mistral';
  return 'Other';
}

function getPriceTier(model: Model): { label: string; color: string; value: number } {
  const avgCost = (model.inputCost + model.outputCost) / 2;
  if (avgCost === 0) return { label: 'Free', color: 'bg-green-500/20 text-green-400', value: 0 };
  if (avgCost < 0.001) return { label: '$', color: 'bg-yellow-500/20 text-yellow-400', value: 1 };
  if (avgCost < 0.005) return { label: '$$', color: 'bg-orange-500/20 text-orange-400', value: 2 };
  return { label: '$$$', color: 'bg-red-500/20 text-red-400', value: 3 };
}

function formatContextSize(size: number | undefined): string {
  if (!size) return '';
  if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
  if (size >= 1000) return `${(size / 1000).toFixed(0)}K`;
  return String(size);
}

export function ChatModelSelectorModal({ models, selectedModel, onSelect, onClose }: ChatModelSelectorModalProps) {
  const [activeProvider, setActiveProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Get unique providers
  const providers = useMemo(() => {
    const providerSet = new Set(models.map(m => getProviderFromId(m.id)));
    return ['all', ...Array.from(providerSet).sort()];
  }, [models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let result = [...models];
    
    // Filter by provider
    if (activeProvider !== 'all') {
      result = result.filter(m => getProviderFromId(m.id) === activeProvider);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortBy === 'cost-low') {
      result.sort((a, b) => (a.inputCost + a.outputCost) - (b.inputCost + b.outputCost));
    } else if (sortBy === 'cost-high') {
      result.sort((a, b) => (b.inputCost + b.outputCost) - (a.inputCost + a.outputCost));
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }, [models, activeProvider, searchQuery, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Select AI Model
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Choose a model based on your needs</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] overflow-x-auto">
          {providers.map(provider => (
            <button
              key={provider}
              onClick={() => setActiveProvider(provider)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeProvider === provider
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {provider === 'all' ? 'All Providers' : provider}
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500 text-[var(--text-primary)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none text-[var(--text-primary)]"
            >
              <option value="name">Name</option>
              <option value="cost-low">Cost: Low to High</option>
              <option value="cost-high">Cost: High to Low</option>
            </select>
          </div>
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredModels.map(model => {
              const provider = getProviderFromId(model.id);
              const providerInfo = PROVIDER_INFO[provider] || PROVIDER_INFO['Other'];
              const priceTier = getPriceTier(model);
              const caps = model.capabilities || {};
              const isSelected = selectedModel?.id === model.id;
              
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model);
                    onClose();
                  }}
                  className={`relative p-4 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {/* Selected check */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Provider badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${providerInfo.color}`} />
                    <span className="text-xs text-[var(--text-muted)]">{provider}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${priceTier.color}`}>
                      {priceTier.label}
                    </span>
                  </div>
                  
                  {/* Model name */}
                  <h4 className="font-medium text-sm mb-2 text-[var(--text-primary)]">{model.name}</h4>
                  
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {caps.vision && (
                      <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                        <Eye className="w-3 h-3" />
                        Vision
                      </span>
                    )}
                    {caps.webSearch && (
                      <span className="flex items-center gap-1 text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                        <Globe className="w-3 h-3" />
                        Web
                      </span>
                    )}
                    {caps.reasoning && (
                      <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                        <Brain className="w-3 h-3" />
                        Reasoning
                      </span>
                    )}
                    {caps.maxContext && (
                      <span className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                        {formatContextSize(caps.maxContext)} ctx
                      </span>
                    )}
                  </div>
                  
                  {/* Pricing */}
                  <div className="text-xs text-[var(--text-muted)]">
                    <span>In: ${model.inputCost}/1K</span>
                    <span className="mx-2">·</span>
                    <span>Out: ${model.outputCost}/1K</span>
                  </div>
                </button>
              );
            })}
          </div>
          
          {filteredModels.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              No models found matching your criteria
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {filteredModels.length} models available
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
