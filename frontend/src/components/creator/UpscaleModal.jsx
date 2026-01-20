import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowUpRight, DollarSign, Info, Loader2, Image, Video, Check } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export function UpscaleModal({ 
  generation, 
  onClose, 
  onUpscaleStart,
  authToken 
}) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [options, setOptions] = useState({});
  const [estimatedCost, setEstimatedCost] = useState(null);

  const isVideo = generation?.type === 'video';

  // Fetch upscale models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(`${API_BASE}/upscale/models?type=${isVideo ? 'video' : 'image'}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setModels(response.data);
        if (response.data.length > 0) {
          const model = response.data[0];
          setSelectedModel(model);
          // Set default options
          const defaults = {};
          Object.entries(model.options || {}).forEach(([key, opt]) => {
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

  // Calculate cost when options change
  useEffect(() => {
    if (!selectedModel || !generation?.id) return;

    const calculateCost = async () => {
      setCalculating(true);
      try {
        const response = await axios.post(`${API_BASE}/upscale/calculate`, {
          generationId: generation.id,
          modelId: selectedModel.id,
          options
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setEstimatedCost(response.data);
      } catch (err) {
        console.error('Failed to calculate cost:', err);
      } finally {
        setCalculating(false);
      }
    };

    const debounce = setTimeout(calculateCost, 300);
    return () => clearTimeout(debounce);
  }, [selectedModel, options, generation?.id, authToken]);

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleUpscale = async () => {
    if (!selectedModel || !generation?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/upscale`, {
        generationId: generation.id,
        modelId: selectedModel.id,
        options
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      onUpscaleStart?.(response.data);
      onClose();
    } catch (err) {
      console.error('Upscale failed:', err);
      setError(err.response?.data?.error || 'Failed to start upscale');
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
              <h3 className="text-lg font-semibold">Upscale {isVideo ? 'Video' : 'Image'}</h3>
              <p className="text-sm text-[var(--text-muted)]">Enhance resolution with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
              {isVideo ? (
                <video 
                  src={generation?.result} 
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img 
                  src={generation?.thumbnailUrl || generation?.result} 
                  alt="Source"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                {isVideo ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                <span>Source {isVideo ? 'Video' : 'Image'}</span>
              </div>
              <p className="font-medium truncate">{generation?.modelName || 'Generation'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                {generation?.prompt?.slice(0, 100)}...
              </p>
            </div>
          </div>
        </div>

        {/* Model Selection (if multiple) */}
        {models.length > 1 && (
          <div className="p-4 border-b border-[var(--border-color)]">
            <label className="text-sm text-[var(--text-muted)] block mb-2">Upscaler Model</label>
            <div className="flex gap-2">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    const defaults = {};
                    Object.entries(model.options || {}).forEach(([key, opt]) => {
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
                  <p className="font-medium text-sm">{model.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{model.providerName}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {selectedModel && Object.keys(selectedModel.options || {}).length > 0 && (
          <div className="p-4 space-y-4">
            {Object.entries(selectedModel.options).map(([key, opt]) => (
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
                        <p className="font-medium text-sm">{choice.label.split(' ')[0]}</p>
                        {choice.priceMultiplier > 1 && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {choice.priceMultiplier}× cost
                          </p>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-sky-400 mx-auto mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost & Info */}
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

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-sky-500/10 rounded-xl mb-4">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)]">
              {isVideo 
                ? 'Video upscaling uses queue processing and may take several minutes. Cost is $0.10 per megapixel per second of video.'
                : 'Image upscaling cost is based on output resolution. Higher scale factors produce larger images at higher cost.'
              }
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl font-medium transition-colors border border-[var(--border-color)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUpscale}
              disabled={loading || !selectedModel}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
