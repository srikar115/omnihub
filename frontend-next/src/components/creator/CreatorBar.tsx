'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Video, MessageSquare,
  ChevronDown, Send, Loader2,
  X, Wand2, CreditCard,
  Check, ImagePlus, Layers,
  Volume2, VolumeX, Square, RectangleHorizontal, RectangleVertical
} from 'lucide-react';
import { ModelSelectorModal } from './ModelSelectorModal';
import { ImageSourceModal } from './ImageSourceModal';
import { MultiModelSettingsModal } from './MultiModelSettingsModal';

const API_BASE = '/api';

interface Model {
  id: string;
  name: string;
  type: string;
  credits: number;
  baseCost?: number;
  thumbnail?: string;
  provider?: string;
  providerName?: string;
  imageInput?: 'optional' | 'required' | 'none';
  options?: Record<string, any>;
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
}

interface Generation {
  id: string;
  type: string;
  status: string;
  result?: string;
  thumbnailUrl?: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  assetCount?: number;
}

interface UploadHistoryItem {
  id: string;
  url: string;
  filename?: string;
}

interface Workspace {
  id: string;
  name: string;
  isDefault?: boolean;
  credits?: number;
  creditMode?: string;
}

interface CreatorBarProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  inputImages: string[];
  setInputImages: (images: string[] | ((prev: string[]) => string[])) => void;
  generationType: string;
  setGenerationType: (type: string) => void;
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  selectedModels: Model[];
  setSelectedModels: (models: Model[]) => void;
  multiModelMode: boolean;
  setMultiModelMode: (mode: boolean) => void;
  selectedOptions: Record<string, string>;
  setSelectedOptions: (options: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  numImages: number;
  setNumImages: (num: number) => void;
  calculatedPrice: number;
  models: Record<string, Model[]>;
  user: User | null;
  activeWorkspace?: Workspace | null;
  onGenerate: (params?: any) => void;
  showAuthModal: () => void;
  fixed?: boolean;
  generations?: Generation[];
  uploadHistory?: UploadHistoryItem[];
  projects?: Project[];
  onLoadProjects?: () => void;
  onCreateProject?: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = { image: Image, video: Video, chat: MessageSquare };
const TYPE_COLORS: Record<string, string> = {
  image: 'from-cyan-500 to-blue-600',
  video: 'from-pink-500 to-rose-600',
  chat: 'from-emerald-500 to-teal-600',
};

export function CreatorBar({
  prompt,
  setPrompt,
  inputImages,
  setInputImages,
  generationType,
  setGenerationType,
  selectedModel,
  setSelectedModel,
  selectedModels,
  setSelectedModels,
  multiModelMode,
  setMultiModelMode,
  selectedOptions,
  setSelectedOptions,
  numImages,
  setNumImages,
  calculatedPrice,
  models,
  user,
  activeWorkspace,
  onGenerate,
  showAuthModal,
  fixed = true,
  generations = [],
  uploadHistory = [],
  projects = [],
  onLoadProjects,
  onCreateProject,
}: CreatorBarProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showNumImagesDropdown, setShowNumImagesDropdown] = useState(false);
  const [showAspectRatioDropdown, setShowAspectRatioDropdown] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showMultiModelSettings, setShowMultiModelSettings] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enhanceCostEstimate = useMemo(() => {
    const promptTokens = Math.ceil((prompt || '').length / 4);
    const imageTokens = inputImages.length * 85 * 4;
    const inputTokens = promptTokens + imageTokens + 200;
    const outputTokens = 250;
    return ((inputTokens * 0.0025 / 1000) + (outputTokens * 0.01 / 1000)).toFixed(3);
  }, [prompt, inputImages.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the dropdown area
      if (dropdownRef.current?.contains(e.target as Node)) {
        return;
      }
      setShowModelDropdown(false);
      setShowTypeDropdown(false);
      setShowNumImagesDropdown(false);
      setShowAspectRatioDropdown(false);
    };
    // Use mousedown instead of click for better timing
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputImages(prev => [...prev.slice(0, 3), event.target?.result as string]);
        setShowImageSourceModal(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEnhancePrompt = async () => {
    if (!user) {
      showAuthModal?.();
      return;
    }
    
    if (!prompt.trim() && inputImages.length === 0) return;
    
    setIsEnhancing(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/enhance-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageUrls: inputImages,
          variationType: 'enhance'
        }),
      });
      
      const data = await response.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
      alert('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    const modelsToGenerate = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
    
    if (!prompt.trim() || modelsToGenerate.length === 0) return;
    
    if (!user) {
      showAuthModal?.();
      return;
    }
    
    for (const model of modelsToGenerate) {
      if (model.imageInput === 'required' && inputImages.length === 0) {
        alert(`${model.name} requires a reference image. Please add one before generating.`);
        return;
      }
    }
    
    if (user.credits < calculatedPrice) {
      alert('Insufficient credits. Please add more credits to continue.');
      return;
    }

    if (multiModelMode && selectedModels.length > 1) {
      setShowMultiModelSettings(true);
      return;
    }

    onGenerate?.();
  };

  const handleMultiModelConfirm = (perModelSettings: Record<string, Record<string, string>>) => {
    setShowMultiModelSettings(false);
    onGenerate?.({ modelSettings: perModelSettings });
  };

  const generatedImages = generations.filter(g => g.type === 'image' && g.status === 'completed');

  const containerClass = fixed
    ? 'fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-5xl z-40'
    : 'w-full';

  const modelsToCheck = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
  const anySupportsImages = modelsToCheck.some(m => m.imageInput === 'optional' || m.imageInput === 'required');
  const anyRequiresImages = modelsToCheck.some(m => m.imageInput === 'required');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className={containerClass}>
        <div className="bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-4">
            {/* Add Image Button */}
            {modelsToCheck.length > 0 && anySupportsImages && (
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowImageSourceModal(true)}
                  className={`w-20 h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors bg-[var(--bg-tertiary)]/50 ${
                    anyRequiresImages && inputImages.length === 0
                      ? 'border-red-500/50 hover:border-red-400 hover:bg-red-500/5'
                      : 'border-[var(--border-color)] hover:border-cyan-500 hover:bg-cyan-500/5'
                  }`}
                  title={anyRequiresImages ? 'Reference image required' : 'Add reference image (optional)'}
                >
                  <ImagePlus className={`w-6 h-6 mb-1 ${
                    anyRequiresImages && inputImages.length === 0
                      ? 'text-red-400'
                      : 'text-[var(--text-muted)]'
                  }`} />
                  <span className={`text-xs ${
                    anyRequiresImages && inputImages.length === 0
                      ? 'text-red-400'
                      : 'text-[var(--text-muted)]'
                  }`}>
                    {anyRequiresImages ? 'Required' : 'Add'}
                  </span>
                </button>
              </div>
            )}

            {/* Input images preview */}
            {inputImages.map((img, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={img} alt="" className="w-20 h-20 rounded-xl object-cover" />
                <button
                  onClick={() => setInputImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}

            {/* Prompt Input */}
            <div className="flex-1 relative">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Describe what you want to create..."
                className="w-full h-20 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-4 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-colors text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          {/* Options Row */}
          <div ref={dropdownRef} className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Output Type Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowTypeDropdown(!showTypeDropdown); setShowModelDropdown(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all bg-gradient-to-r ${TYPE_COLORS[generationType]} text-white`}
                >
                  {(() => {
                    const Icon = TYPE_ICONS[generationType];
                    return Icon ? <Icon className="w-4 h-4" /> : null;
                  })()}
                  <span className="capitalize">{generationType}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-0 mb-2 w-40 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      {['image', 'video', 'chat'].map(type => {
                        const Icon = TYPE_ICONS[type];
                        const isActive = generationType === type;
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setGenerationType(type);
                              setMultiModelMode(false);
                              setSelectedModels([]);
                              setShowTypeDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-hover)] transition-colors ${
                              isActive ? 'bg-[var(--card-hover)]' : ''
                            }`}
                          >
                            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`} />}
                            <span className={`capitalize ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{type}</span>
                            {isActive && <Check className="w-4 h-4 text-cyan-400 ml-auto" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Multi-model Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!multiModelMode) {
                    setMultiModelMode(true);
                    setSelectedModels(selectedModel ? [selectedModel] : []);
                  } else {
                    setMultiModelMode(false);
                    setSelectedModel(selectedModels[0] || selectedModel);
                  }
                }}
                className={`p-2 rounded-lg border transition-colors ${
                  multiModelMode 
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-color)]'
                }`}
                title={multiModelMode ? 'Exit multi-model mode' : 'Compare multiple models (up to 4)'}
              >
                <Layers className="w-4 h-4" />
              </button>

              {/* Model Selector */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowModelModal(true); setShowTypeDropdown(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-colors"
              >
                {multiModelMode ? (
                  <>
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="max-w-[150px] truncate">
                      {selectedModels.length === 0 ? 'Select models' : `${selectedModels.length} model${selectedModels.length > 1 ? 's' : ''}`}
                    </span>
                  </>
                ) : (
                  <>
                    {selectedModel?.thumbnail ? (
                      <img src={selectedModel.thumbnail} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Wand2 className="w-4 h-4 text-purple-400" />
                    )}
                    <span className="max-w-[150px] truncate">{selectedModel?.name || 'Select model'}</span>
                  </>
                )}
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </button>

              <div className="w-px h-6 bg-[var(--border-color)]" />

              {/* Number of Images Dropdown */}
              {generationType === 'image' && (
                <div className="relative">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowNumImagesDropdown(!showNumImagesDropdown); 
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
                  >
                    <span className="text-cyan-400 font-medium">{numImages}</span>
                    <span className="text-[var(--text-muted)]">image{numImages > 1 ? 's' : ''}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showNumImagesDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showNumImagesDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full left-0 mb-2 w-32 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        {[1, 2, 3, 4].map(num => (
                          <button
                            key={num}
                            onClick={() => {
                              setNumImages(num);
                              setShowNumImagesDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--card-hover)] transition-colors ${
                              numImages === num ? 'bg-[var(--card-hover)]' : ''
                            }`}
                          >
                            <span className={numImages === num ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{num} image{num > 1 ? 's' : ''}</span>
                            {numImages === num && <Check className="w-4 h-4 text-cyan-400" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Dynamic Model Options (Aspect Ratio, Audio, etc.) */}
              {selectedModel?.options && Object.entries(selectedModel.options)
                .filter(([key]) => key !== 'num_images')
                .map(([key, option]: [string, any]) => {
                  const currentValue = selectedOptions[key] || option.default;
                  
                  // Aspect Ratio Selector
                  const isAspectRatioOption = key === 'aspect_ratio' || key === 'aspect-ratio' || key === 'aspectRatio';
                  if (isAspectRatioOption && option.choices) {
                    const getAspectIcon = (value: string) => {
                      if (value === '16:9' || value === '16:10') return <RectangleHorizontal className="w-4 h-3" />;
                      if (value === '9:16' || value === '10:16') return <RectangleVertical className="w-3 h-4" />;
                      if (value === '4:3' || value === '3:4') return <RectangleHorizontal className="w-3.5 h-3" />;
                      return <Square className="w-3.5 h-3.5" />;
                    };
                    const currentChoice = option.choices.find((c: any) => c.value === currentValue) || option.choices[0];
                    
                    return (
                      <div key={key} className="relative">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setShowAspectRatioDropdown(!showAspectRatioDropdown);
                            setShowModelDropdown(false);
                            setShowTypeDropdown(false);
                            setShowNumImagesDropdown(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-colors"
                        >
                          <span className="text-purple-400">{getAspectIcon(currentValue)}</span>
                          <span>{currentChoice?.label || currentValue}</span>
                          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showAspectRatioDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showAspectRatioDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                            >
                              <div className="p-2 border-b border-[var(--border-color)]">
                                <span className="text-xs text-[var(--text-muted)] font-medium px-2">Aspect Ratio</span>
                              </div>
                              {option.choices?.map((choice: any) => {
                                const isSelected = currentValue === choice.value;
                                return (
                                  <button
                                    key={choice.value}
                                    onClick={() => {
                                      setSelectedOptions(prev => ({ ...prev, [key]: choice.value }));
                                      setShowAspectRatioDropdown(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-hover)] transition-colors ${
                                      isSelected ? 'bg-[var(--card-hover)]' : ''
                                    }`}
                                  >
                                    <span className={isSelected ? 'text-purple-400' : 'text-[var(--text-muted)]'}>
                                      {getAspectIcon(choice.value)}
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
                    );
                  }
                  
                  // Audio Toggle for video models
                  if (option.type === 'toggle' && (key === 'generate_audio' || key === 'with_audio')) {
                    const isAudioOn = currentValue === 'true' || currentValue === true;
                    return (
                      <div key={key} className="flex items-center gap-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-1">
                        <button
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: 'true' }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                            isAudioOn 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                          <span className="text-xs">Audio</span>
                        </button>
                        <button
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: 'false' }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${
                            !isAudioOn 
                              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          <VolumeX className="w-4 h-4" />
                          <span className="text-xs">Silent</span>
                        </button>
                      </div>
                    );
                  }
                  
                  // Generic select dropdown for other options (resolution, etc.)
                  if (option.type === 'select' && option.choices && !isAspectRatioOption) {
                    const currentChoice = option.choices.find((c: any) => c.value === currentValue) || option.choices[0];
                    return (
                      <div key={key} className="relative">
                        <select
                          value={currentValue}
                          onChange={(e) => setSelectedOptions(prev => ({ ...prev, [key]: e.target.value }))}
                          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
                        >
                          {option.choices.map((choice: any) => (
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

            {/* Right: Enhance, Cost, Create */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {(inputImages.length > 0 || prompt.trim()) && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || (!prompt.trim() && inputImages.length === 0)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isEnhancing 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/30'
                    } disabled:opacity-50`}
                    title="Enhance prompt with GPT-4o Vision"
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    <span>Enhance</span>
                  </button>
                  <span className="text-[9px] text-purple-400/60 mt-0.5">~{enhanceCostEstimate} credits</span>
                </div>
              )}

              <div className="flex flex-col items-center">
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || (multiModelMode ? selectedModels.length === 0 : !selectedModel) || isEnhancing}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${TYPE_COLORS[generationType]} hover:opacity-90 text-white`}
                >
                  <Send className="w-4 h-4" />
                  {multiModelMode && selectedModels.length > 1 ? `Create (${selectedModels.length})` : 'Create'}
                </button>
                <div className="flex flex-col items-center gap-0.5 mt-1">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-cyan-400 font-mono text-xs font-medium">{calculatedPrice.toFixed(2)}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">credits</span>
                  </div>
                  {/* Credit source indicator */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    activeWorkspace && !activeWorkspace.isDefault 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {activeWorkspace && !activeWorkspace.isDefault 
                      ? `from ${activeWorkspace.creditMode === 'individual' ? 'allocated' : 'workspace'}`
                      : 'from personal'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Source Modal */}
      <AnimatePresence>
        {showImageSourceModal && (
          <ImageSourceModal
            onClose={() => setShowImageSourceModal(false)}
            onSelectImage={(url) => {
              setInputImages(prev => [...prev.slice(0, 3), url]);
              setShowImageSourceModal(false);
            }}
            onUploadClick={() => fileInputRef.current?.click()}
            generatedImages={generatedImages.map(g => ({ id: g.id, result: g.result || '', thumbnailUrl: g.thumbnailUrl }))}
            maxImages={4}
            currentCount={inputImages.length}
            uploadHistory={uploadHistory}
            projects={projects}
            onLoadProjects={onLoadProjects}
            onCreateProject={onCreateProject}
          />
        )}
      </AnimatePresence>

      {/* Model Selector Modal */}
      <AnimatePresence>
        {showModelModal && (
          <ModelSelectorModal
            models={models[generationType] || []}
            selectedModel={selectedModel}
            selectedModels={selectedModels}
            multiMode={multiModelMode}
            onSelect={(model) => {
              setSelectedModel(model);
              setSelectedOptions({});
              setShowModelModal(false);
            }}
            onSelectMulti={setSelectedModels}
            onToggleMultiMode={(enabled) => {
              setMultiModelMode(enabled);
              if (enabled && selectedModel) {
                setSelectedModels([selectedModel]);
              } else if (!enabled && selectedModels.length > 0) {
                setSelectedModel(selectedModels[0]);
              }
            }}
            onClose={() => setShowModelModal(false)}
            generationType={generationType}
            hasReferenceImages={inputImages.length > 0}
          />
        )}
      </AnimatePresence>

      {/* Multi-Model Settings Modal */}
      <AnimatePresence>
        {showMultiModelSettings && (
          <MultiModelSettingsModal
            selectedModels={selectedModels}
            onConfirm={handleMultiModelConfirm}
            onClose={() => setShowMultiModelSettings(false)}
            numImages={numImages}
            generationType={generationType}
          />
        )}
      </AnimatePresence>
    </>
  );
}
