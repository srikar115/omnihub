import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, Layers, ChevronDown, Send, Volume2, VolumeX, Square, RectangleHorizontal, RectangleVertical, Check } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export function MultiModelSettingsModal({ selectedModels, onConfirm, onClose, numImages, generationType }) {
  const [modelSettings, setModelSettings] = useState(() => {
    return selectedModels.reduce((acc, model) => {
      const defaults = {};
      if (model.options) {
        Object.entries(model.options).forEach(([key, option]) => {
          defaults[key] = option.default || '';
        });
      }
      if (generationType === 'image') {
        defaults.num_images = String(numImages);
      }
      acc[model.id] = defaults;
      return acc;
    }, {});
  });

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
        console.log('Using default pricing settings');
      }
    };
    fetchPricingSettings();
  }, []);

  // Calculate user-facing credits with profit margin and credit conversion
  const calculateUserCredits = (model, baseCredits = null) => {
    const baseCost = baseCredits !== null ? baseCredits : (model.baseCost || model.credits || 0);
    
    let margin = pricingSettings.profitMargin;
    if (model.type === 'image' && pricingSettings.profitMarginImage > 0) {
      margin = pricingSettings.profitMarginImage;
    } else if (model.type === 'video' && pricingSettings.profitMarginVideo > 0) {
      margin = pricingSettings.profitMarginVideo;
    } else if (model.type === 'chat' && pricingSettings.profitMarginChat > 0) {
      margin = pricingSettings.profitMarginChat;
    }
    
    const finalUSD = baseCost * (1 + margin / 100);
    return finalUSD / pricingSettings.creditPrice;
  };
  
  // Expand the first model with options by default so users can see the settings
  const [expandedModel, setExpandedModel] = useState(() => {
    const firstModelWithOptions = selectedModels.find(m => 
      m.options && Object.keys(m.options).filter(k => k !== 'num_images').length > 0
    );
    return firstModelWithOptions?.id || null;
  });
  
  // Track which aspect ratio dropdown is open (by modelId)
  const [openAspectRatioDropdown, setOpenAspectRatioDropdown] = useState(null);
  
  const updateSetting = (modelId, key, value) => {
    setModelSettings(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [key]: value
      }
    }));
  };

  const totalPrice = selectedModels.reduce((sum, model) => {
    const settings = modelSettings[model.id] || {};
    let basePrice = model.credits || 0;
    
    if (model.options) {
      Object.entries(model.options).forEach(([key, option]) => {
        const selectedValue = settings[key];
        const choice = option.choices?.find(c => c.value === selectedValue);
        if (choice?.priceMultiplier) {
          basePrice *= choice.priceMultiplier;
        }
      });
    }
    
    if (generationType === 'image') {
      const numImgs = parseInt(settings.num_images) || 1;
      basePrice *= numImgs;
    }
    
    // Convert to user credits
    const userCredits = calculateUserCredits(model, basePrice);
    return sum + userCredits;
  }, 0);

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
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Configure Model Settings
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Customize settings like aspect ratio, quality, and style for each model
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1c25] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedModels.map((model, i) => {
            const isExpanded = expandedModel === model.id;
            const hasOptions = model.options && Object.keys(model.options).filter(k => k !== 'num_images').length > 0;
            
            return (
              <div 
                key={model.id} 
                className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-primary)]"
              >
                {/* Model header */}
                <button
                  onClick={() => hasOptions && setExpandedModel(isExpanded ? null : model.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-medium">{model.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{model.providerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-green-400">
                      {calculateUserCredits(model, model.credits * (generationType === 'image' ? (parseInt(modelSettings[model.id]?.num_images) || 1) : 1)).toFixed(1)} credits
                    </span>
                    {hasOptions && (
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </button>
                
                {/* Expandable options */}
                <AnimatePresence>
                  {isExpanded && hasOptions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[var(--border-color)]"
                    >
                      <div className="p-4 grid grid-cols-2 gap-4">
                        {Object.entries(model.options)
                          .filter(([key]) => key !== 'num_images')
                          .map(([key, option]) => {
                            const currentValue = modelSettings[model.id]?.[key] || option.default;
                            
                            // Aspect Ratio Selector as dropdown - check by key name, not type
                            // Backend models may use type: 'select' or type: 'aspect_ratio' for aspect ratio options
                            const isAspectRatioOption = key === 'aspect_ratio' || key === 'aspect-ratio' || key === 'aspectRatio';
                            if (isAspectRatioOption && option.choices) {
                              const getIcon = (value) => {
                                if (value === '16:9' || value === '16:10') return <RectangleHorizontal className="w-4 h-3" />;
                                if (value === '9:16' || value === '10:16') return <RectangleVertical className="w-3 h-4" />;
                                if (value === '4:3' || value === '3:4') return <RectangleHorizontal className="w-3.5 h-3" />;
                                return <Square className="w-3.5 h-3.5" />;
                              };
                              const currentChoice = option.choices.find(c => c.value === currentValue) || option.choices[0];
                              const dropdownKey = `${model.id}-${key}`;
                              const isDropdownOpen = openAspectRatioDropdown === dropdownKey;
                              
                              return (
                                <div key={key} className="col-span-2">
                                  <label className="block text-xs text-[var(--text-muted)] mb-2">{option.label}</label>
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenAspectRatioDropdown(isDropdownOpen ? null : dropdownKey);
                                      }}
                                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#1a1c25] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-purple-400">{getIcon(currentValue)}</span>
                                        <span>{currentChoice?.label || currentValue}</span>
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                      {isDropdownOpen && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -10 }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute top-full left-0 mt-2 w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                                        >
                                          {option.choices?.map(choice => {
                                            const isSelected = currentValue === choice.value;
                                            return (
                                              <button
                                                key={choice.value}
                                                onClick={() => {
                                                  updateSetting(model.id, key, choice.value);
                                                  setOpenAspectRatioDropdown(null);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-hover)] transition-colors ${
                                                  isSelected ? 'bg-[var(--card-hover)]' : ''
                                                }`}
                                              >
                                                <span className={isSelected ? 'text-purple-400' : 'text-[var(--text-muted)]'}>
                                                  {getIcon(choice.value)}
                                                </span>
                                                <span className={isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                                                  {choice.label}
                                                </span>
                                                {isSelected && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                                              </button>
                                            );
                                          })}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Audio Toggle
                            if (option.type === 'toggle' && (key === 'generate_audio' || key === 'with_audio')) {
                              const isAudioOn = currentValue === 'true';
                              return (
                                <div key={key}>
                                  <label className="block text-xs text-[var(--text-muted)] mb-2">{option.label}</label>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updateSetting(model.id, key, 'true')}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                                        isAudioOn 
                                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                          : 'bg-[#1a1c25] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
                                      }`}
                                    >
                                      <Volume2 className="w-4 h-4" />
                                      <span className="text-xs">Audio</span>
                                    </button>
                                    <button
                                      onClick={() => updateSetting(model.id, key, 'false')}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                                        !isAudioOn 
                                          ? 'bg-[#3a3c45] text-white border border-[#4a4c55]' 
                                          : 'bg-[#1a1c25] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
                                      }`}
                                    >
                                      <VolumeX className="w-4 h-4" />
                                      <span className="text-xs">Silent</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Standard select
                            if (option.type === 'select') {
                              return (
                                <div key={key}>
                                  <label className="block text-xs text-[var(--text-muted)] mb-1">{option.label}</label>
                                  <select
                                    value={currentValue}
                                    onChange={(e) => updateSetting(model.id, key, e.target.value)}
                                    className="w-full bg-[#1a1c25] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                                  >
                                    {option.choices?.map(choice => (
                                      <option key={choice.value} value={choice.value}>
                                        {choice.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }
                            
                            return null;
                          })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="text-sm">
            <span className="text-[var(--text-muted)]">Total: </span>
            <span className="font-mono text-green-400 font-medium">{totalPrice.toFixed(1)} credits</span>
            <span className="text-[var(--text-muted)] ml-2">for {selectedModels.length} models</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1c25] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(modelSettings)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Generate All ({selectedModels.length})
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
