'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, ArrowUpRight, DollarSign, Info, Loader2, Image, Video, Check } from 'lucide-react';

const API_BASE = '/api';

interface UpscaleOption {
  label: string;
  choices?: { value: string; label: string; priceMultiplier?: number }[];
  default: string;
}

interface UpscaleModel {
  id: string;
  name: string;
  providerName?: string;
  options?: Record<string, UpscaleOption>;
}

import type { Generation as BaseGeneration } from '@/components/shared/GenerationCard';

// UpscaleModal only works with image and video types
type UpscalableGeneration = BaseGeneration & { type: 'image' | 'video' };

interface UpscaleModalProps {
  generation: UpscalableGeneration;
  onClose: () => void;
  onUpscaleStart?: (data: any) => void;
  authToken?: string;
}

export function UpscaleModal({ 
  generation, 
  onClose, 
  onUpscaleStart,
  authToken 
}: UpscaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<UpscaleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<UpscaleModel | null>(null);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [estimatedCost, setEstimatedCost] = useState<{ price: number } | null>(null);

  const isVideo = generation?.type === 'video';

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const token = authToken || localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE}/upscale/models?type=${isVideo ? 'video' : 'image'}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setModels(data);
        if (data.length > 0) {
          const model = data[0];
          setSelectedModel(model);
          const defaults: Record<string, string> = {};
          Object.entries(model.options || {}).forEach(([key, opt]: [string, any]) => {
            defaults[key] = opt.default;
          });
          setOptions(defaults);
        }
      } catch (err) {
        console.error('Failed to fetch upscale models:', err);
        setError('Failed to load upscale options');
      }
    };
    fetchModels();
  }, [isVideo, authToken]);

  useEffect(() => {
    if (!selectedModel || !generation?.id) return;

    const calculateCost = async () => {
      setCalculating(true);
      try {
        const token = authToken || localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE}/upscale/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            generationId: generation.id,
            modelId: selectedModel.id,
            options
          }),
        });
        const data = await response.json();
        setEstimatedCost(data);
      } catch (err) {
        console.error('Failed to calculate cost:', err);
      } finally {
        setCalculating(false);
      }
    };

    const debounce = setTimeout(calculateCost, 300);
    return () => clearTimeout(debounce);
  }, [selectedModel, options, generation?.id, authToken]);

  const handleOptionChange = (key: string, value: string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleUpscale = async () => {
    if (!selectedModel || !generation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const token = authToken || localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/upscale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          generationId: generation.id,
          modelId: selectedModel.id,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start upscale');
      }

      const data = await response.json();
      onUpscaleStart?.(data);
      onClose();
    } catch (err: any) {
      console.error('Upscale failed:', err);
      setError(err.message || 'Failed to start upscale');
    } finally {
      setLoading(false);
    }
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
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-gradient-to-r from-sky-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upscale {isVideo ? 'Video' : 'Image'}</h3>
              <p className="text-sm text-[var(--text-muted)]">Enhance resolution with AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
              {isVideo ? (
                <video src={generation?.result} className="w-full h-full object-cover" muted />
              ) : (
                <img src={generation?.thumbnailUrl || generation?.result} alt="Source" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                {isVideo ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                <span>Source {isVideo ? 'Video' : 'Image'}</span>
              </div>
              <p className="font-medium text-[var(--text-primary)] truncate">{generation?.modelName || 'Generation'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                {generation?.prompt?.slice(0, 100)}...
              </p>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        {models.length > 1 && (
          <div className="p-4 border-b border-[var(--border-color)]">
            <label className="text-sm text-[var(--text-muted)] block mb-2">Upscaler Model</label>
            <div className="flex gap-2">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    const defaults: Record<string, string> = {};
                    Object.entries(model.options || {}).forEach(([key, opt]: [string, any]) => {
                      defaults[key] = opt.default;
                    });
                    setOptions(defaults);
                  }}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    selectedModel?.id === model.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-[var(--border-color)] hover:border-sky-500/50'
                  }`}
                >
                  <p className="font-medium text-sm text-[var(--text-primary)]">{model.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{model.providerName}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {selectedModel && Object.keys(selectedModel.options || {}).length > 0 && (
          <div className="p-4 space-y-4">
            {Object.entries(selectedModel.options || {}).map(([key, opt]) => (
              <div key={key}>
                <label className="text-sm text-[var(--text-muted)] block mb-2">{opt.label}</label>
                <div className="grid grid-cols-3 gap-2">
                  {opt.choices?.map(choice => {
                    const isSelected = options[key] === choice.value;
                    return (
                      <button
                        key={choice.value}
                        onClick={() => handleOptionChange(key, choice.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? 'border-sky-500 bg-sky-500/10'
                            : 'border-[var(--border-color)] hover:border-sky-500/50'
                        }`}
                      >
                        <p className="font-medium text-sm text-[var(--text-primary)]">{choice.label.split(' ')[0]}</p>
                        {choice.priceMultiplier && choice.priceMultiplier > 1 && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{choice.priceMultiplier}x cost</p>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-sky-400 mx-auto mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost & Actions */}
        <div className="p-4 bg-[var(--bg-primary)]/50 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm text-[var(--text-muted)]">Estimated Cost</span>
            </div>
            <div className="text-right">
              {calculating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
              ) : estimatedCost ? (
                <span className="text-xl font-bold text-green-400">
                  ${estimatedCost.price?.toFixed(4)}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">--</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-sky-500/10 rounded-xl mb-4">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)]">
              {isVideo 
                ? 'Video upscaling may take several minutes.'
                : 'Higher scale factors produce larger images at higher cost.'
              }
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl font-medium transition-colors border border-[var(--border-color)] text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUpscale}
              disabled={loading || !selectedModel}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Upscale Now
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
