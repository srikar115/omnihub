import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Check, Eye, Globe, Zap, Brain, 
  Sparkles, DollarSign 
} from 'lucide-react';

const PROVIDER_COLORS = {
  'OpenAI': 'from-green-500 to-emerald-600',
  'Anthropic': 'from-orange-500 to-amber-600',
  'Google': 'from-blue-500 to-cyan-600',
  'Meta': 'from-blue-600 to-indigo-600',
  'DeepSeek': 'from-purple-500 to-violet-600',
  'Qwen': 'from-red-500 to-pink-600',
  'Mistral': 'from-yellow-500 to-orange-600',
  'OpenRouter': 'from-gray-500 to-slate-600',
};

function getProviderFromId(id) {
  if (id.startsWith('openai/')) return 'OpenAI';
  if (id.startsWith('anthropic/')) return 'Anthropic';
  if (id.startsWith('google/')) return 'Google';
  if (id.startsWith('meta-llama/')) return 'Meta';
  if (id.startsWith('deepseek/')) return 'DeepSeek';
  if (id.startsWith('qwen/')) return 'Qwen';
  if (id.startsWith('mistralai/')) return 'Mistral';
  return 'OpenRouter';
}

function getPriceTier(model) {
  const avgCost = (model.inputCost + model.outputCost) / 2;
  if (avgCost === 0) return { label: 'Free', color: 'text-green-400' };
  if (avgCost < 0.001) return { label: '$', color: 'text-yellow-400' };
  if (avgCost < 0.005) return { label: '$$', color: 'text-orange-400' };
  return { label: '$$$', color: 'text-red-400' };
}

function formatContextSize(size) {
  if (!size) return '';
  if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
  if (size >= 1000) return `${(size / 1000).toFixed(0)}K`;
  return size;
}

export default function ModelSelector({ models, selectedModel, onSelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [isOpen]);

  const provider = selectedModel ? getProviderFromId(selectedModel.id) : '';
  const priceTier = selectedModel ? getPriceTier(selectedModel) : null;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl transition-colors disabled:opacity-50"
      >
        {selectedModel && (
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${PROVIDER_COLORS[provider]}`} />
        )}
        <span className="text-sm font-medium">
          {selectedModel?.name || 'Select Model'}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {models.map(model => {
                const modelProvider = getProviderFromId(model.id);
                const modelPriceTier = getPriceTier(model);
                const caps = model.capabilities || {};
                
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelect(model);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors flex items-start gap-3 ${
                      selectedModel?.id === model.id ? 'bg-[var(--bg-tertiary)]' : ''
                    }`}
                  >
                    {/* Provider indicator */}
                    <div className={`w-2 h-2 rounded-full mt-2 bg-gradient-to-r ${PROVIDER_COLORS[modelProvider]}`} />
                    
                    <div className="flex-1 min-w-0">
                      {/* Model name & provider */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{model.name}</span>
                        <span className={`text-xs font-mono ${modelPriceTier.color}`}>
                          {modelPriceTier.label}
                        </span>
                      </div>
                      
                      {/* Capabilities badges */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatContextSize(caps.maxContext)} ctx
                          </span>
                        )}
                      </div>
                      
                      {/* Pricing */}
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        In: ${model.inputCost}/1K · Out: ${model.outputCost}/1K
                      </div>
                    </div>

                    {/* Selected check */}
                    {selectedModel?.id === model.id && (
                      <Check className="w-4 h-4 text-emerald-400 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
