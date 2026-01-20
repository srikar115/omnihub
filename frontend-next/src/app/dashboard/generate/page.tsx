'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, Video, MessageSquare, Send, 
  Loader2, Sparkles, X, Wand2, 
  Plus, History, Grid, List, Download, Trash2,
  ImagePlus, Layers, ChevronDown, CreditCard,
  Filter, Search, RefreshCw, CheckSquare, Square,
  Clock, Play, Eye, FolderPlus
} from 'lucide-react';
import { useDashboard } from '../layout';
import { CreatorBar, ModelSelectorModal, UpscaleModal } from '@/components/creator';
import { GenerationModal } from '@/components/shared';

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
  imageInput?: 'optional' | 'required' | 'none';
  options?: Record<string, any>;
}

// Import Generation type from shared component
import type { Generation } from '@/components/shared/GenerationCard';

const API_BASE = '/api';

const typeInfo: Record<string, { icon: React.ElementType; label: string; gradient: string }> = {
  image: { icon: ImageIcon, label: 'Image', gradient: 'from-cyan-500 to-blue-600' },
  video: { icon: Video, label: 'Video', gradient: 'from-pink-500 to-rose-600' },
  chat: { icon: MessageSquare, label: 'Chat', gradient: 'from-emerald-500 to-teal-600' },
  projects: { icon: Layers, label: 'Projects', gradient: 'from-purple-500 to-indigo-600' },
};

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'image';
  const initialFilter = searchParams.get('filter') || 'all';
  const initialView = searchParams.get('view') || 'generations';
  
  const { user, updateUserCredits, showAuthModal, activeWorkspace } = useDashboard();

  // Creator state
  const [generationType, setGenerationType] = useState(initialType);
  const [models, setModels] = useState<Record<string, Model[]>>({ image: [], video: [], chat: [] });
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [multiModelMode, setMultiModelMode] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [numImages, setNumImages] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [pricingSettings, setPricingSettings] = useState({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
  });
  
  // Gallery state
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeQueue, setActiveQueue] = useState<Generation[]>([]);
  const [galleryFilter, setGalleryFilter] = useState(initialFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [upscaleGeneration, setUpscaleGeneration] = useState<Generation | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Advanced filters
  const [dateFilter, setDateFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Projects
  const [projects, setProjects] = useState<{id: string; name: string; color: string}[]>([]);
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Date filter options
  const dateFilterOptions = [
    { id: 'all', label: 'All time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
  ];

  // Get unique model names for filter
  const uniqueModels = Array.from(new Set(generations.map(g => g.modelName).filter(Boolean)));

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchModels();
    fetchPricingSettings();
    fetchProjects();
  }, []);

  // Close dropdowns when clicking outside
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current?.contains(e.target as Node)) {
        return;
      }
      setShowDateDropdown(false);
      setShowModelDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  // Define fetchGenerations before useEffect that uses it
  const fetchGenerations = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    // Get the current workspace ID from the closure
    const currentWorkspaceId = activeWorkspace?.id;
    if (!currentWorkspaceId) return; // Don't fetch without workspace ID

    try {
      // Always pass workspaceId to filter generations by active workspace
      const workspaceParam = `&workspaceId=${currentWorkspaceId}`;
      const response = await fetch(`${API_BASE}/generations?limit=100${workspaceParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const gens = data.generations || [];
      setGenerations(gens);
      
      // Update queue
      const pending = gens.filter((g: Generation) => g.status === 'pending' || g.status === 'processing');
      setActiveQueue(pending);
    } catch (error) {
      console.error('Failed to fetch generations');
    } finally {
      setDataLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    // Only fetch when both user and activeWorkspace are available
    // This prevents fetching with empty workspaceId during initial load
    if (user && activeWorkspace) {
      fetchGenerations();
    }
  }, [user, activeWorkspace, fetchGenerations]);

  // Sync state with URL params when they change
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const filterParam = searchParams.get('filter');
    
    if (typeParam && (typeParam === 'image' || typeParam === 'video')) {
      setGenerationType(typeParam);
    }
    if (filterParam) {
      setGalleryFilter(filterParam);
    }
  }, [searchParams]);

  // Polling for pending generations
  useEffect(() => {
    const hasPending = generations.some(g => g.status === 'pending' || g.status === 'processing');
    
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        fetchGenerations();
      }, 3000);
    } else if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [generations, fetchGenerations]);

  // Auto-select model when type changes
  useEffect(() => {
    const typeModels = models[generationType] || [];
    if (typeModels.length > 0 && !selectedModel) {
      setSelectedModel(typeModels[0]);
    } else if (selectedModel && selectedModel.type !== generationType) {
      setSelectedModel(typeModels[0] || null);
    }
    setMultiModelMode(false);
    setSelectedModels([]);
  }, [generationType, models]);

  // Calculate price
  useEffect(() => {
    calculateModelPrice();
  }, [selectedModel, selectedModels, multiModelMode, selectedOptions, numImages, pricingSettings]);

  const fetchPricingSettings = async () => {
    try {
      // Use public pricing settings endpoint (no admin auth required)
      const response = await fetch(`${API_BASE}/pricing-settings`);
      const data = await response.json();
      setPricingSettings({
        profitMargin: parseFloat(data.profitMargin) || 0,
        profitMarginImage: parseFloat(data.profitMarginImage) || 0,
        profitMarginVideo: parseFloat(data.profitMarginVideo) || 0,
        profitMarginChat: parseFloat(data.profitMarginChat) || 0,
        creditPrice: parseFloat(data.creditPrice) || 1,
      });
    } catch (err) {
      console.log('Using default pricing settings');
    }
  };

  const calculateUserCredits = (model: Model, baseCredits: number | null = null): number => {
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

  const calculateModelPrice = () => {
    if (multiModelMode && selectedModels.length > 0) {
      let total = 0;
      selectedModels.forEach(model => {
        const basePrice = model.credits || 0;
        total += calculateUserCredits(model, basePrice * numImages);
      });
      setCalculatedPrice(total);
    } else if (selectedModel) {
      let basePrice = selectedModel.credits || 0;
      if (selectedModel.options) {
        Object.entries(selectedOptions).forEach(([key, value]) => {
          const option = selectedModel.options?.[key];
          if (option?.choices) {
            const choice = option.choices.find((c: any) => c.value === value);
            if (choice?.priceMultiplier) {
              basePrice *= choice.priceMultiplier;
            }
          }
        });
      }
      setCalculatedPrice(calculateUserCredits(selectedModel, basePrice * numImages));
    } else {
      setCalculatedPrice(0);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`);
      const data = await response.json();
      
      const grouped: Record<string, Model[]> = { image: [], video: [], chat: [] };
      data.forEach((m: Model) => {
        if (m.type && grouped[m.type]) {
          grouped[m.type].push(m);
        }
      });
      setModels(grouped);
      
      if (grouped.image?.length > 0) {
        setSelectedModel(grouped.image[0]);
      }
    } catch (error) {
      console.error('Failed to fetch models');
    }
  };

  const handleGenerate = async (params?: { modelSettings?: Record<string, Record<string, string>> }) => {
    if (!user) {
      showAuthModal();
      return;
    }

    if (!prompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    const modelsToGenerate = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
    
    if (modelsToGenerate.length === 0) {
      showToast('Please select a model', 'error');
      return;
    }

    // Validate required reference images
    for (const model of modelsToGenerate) {
      if (model.imageInput === 'required' && inputImages.length === 0) {
        showToast(`${model.name} requires a reference image`, 'error');
        return;
      }
    }

    // Check credits
    if (user.credits < calculatedPrice) {
      showToast('Insufficient credits', 'error');
      return;
    }

    const token = localStorage.getItem('userToken');
    const allNewGenerations: Generation[] = [];
    let lastUserCredits = user.credits;

    for (const model of modelsToGenerate) {
      try {
        // Use per-model settings if provided, otherwise use shared selectedOptions
        const options: Record<string, string> = params?.modelSettings?.[model.id] 
          ? { ...params.modelSettings[model.id] }
          : { ...selectedOptions };
        
        // Ensure num_images is set for image type
        if (generationType === 'image' && !options.num_images) {
          options.num_images = String(numImages);
        }

        const response = await fetch(`${API_BASE}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: generationType,
            model: model.id,
            prompt: prompt.trim(),
            options: options,
            inputImages: inputImages,
            workspaceId: activeWorkspace?.id || null, // Always pass workspace ID
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Generation error:', data.error);
          showToast(data.error || 'Generation failed', 'error');
          continue;
        }

        // Handle multiple generations (for multi-image requests)
        const gens = data.generations || [{ id: data.id, visibleId: data.visibleId }];
        const creditsPerGen = (data.credits || 0) / gens.length;
        
        const newGens: Generation[] = gens.map((gen: { id: string; visibleId?: string }) => ({
          id: gen.id,
          type: generationType as 'image' | 'video' | 'chat',
          modelName: model.name,
          prompt: prompt.trim(),
          credits: creditsPerGen,
          status: 'pending' as const,
          startedAt: new Date().toISOString(),
        }));
        
        allNewGenerations.push(...newGens);
        if (data.userCredits !== undefined) {
          lastUserCredits = data.userCredits;
        }
      } catch (err) {
        console.error(`Generation failed for ${model.name}:`, err);
      }
    }
    
    if (allNewGenerations.length > 0) {
      // Add to queue immediately for instant feedback
      setGenerations(prev => [...allNewGenerations, ...prev]);
      updateUserCredits(lastUserCredits);
      setPrompt('');
      setInputImages([]);
      showToast('Generation started!', 'success');
    } else {
      showToast('Generation failed. Please try again.', 'error');
    }
  };

  const handleDeleteGeneration = async (id: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      await fetch(`${API_BASE}/generations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGenerations(generations.filter(g => g.id !== id));
      setSelectedGeneration(null);
      showToast('Generation deleted', 'success');
    } catch (error) {
      console.error('Failed to delete generation');
      showToast('Failed to delete', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const token = localStorage.getItem('userToken');
    if (!token) return;
    
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`${API_BASE}/generations/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      
      setGenerations(generations.filter(g => !selectedIds.has(g.id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      showToast(`Deleted ${selectedIds.size} items`, 'success');
    } catch (error) {
      showToast('Failed to delete some items', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleUseAsReference = (imageUrl: string) => {
    if (imageUrl) {
      setInputImages(prev => [...prev, imageUrl]);
      setSelectedGeneration(null);
      showToast('Image added as reference', 'success');
    }
  };

  const handleRemix = (generation: Generation) => {
    setPrompt(generation.prompt || '');
    setGenerationType(generation.type || 'image');
    // Find and set the model if it exists
    const allModels = [...models.image, ...models.video, ...models.chat];
    const foundModel = allModels.find(m => m.name === generation.modelName);
    if (foundModel) {
      setSelectedModel(foundModel);
    }
    setSelectedGeneration(null);
    showToast('Settings loaded from generation', 'success');
  };

  const handleAnimate = (generation: Generation) => {
    // Switch to video mode with this image as input
    setGenerationType('video');
    if (generation.result) {
      setInputImages([generation.result]);
    }
    setSelectedGeneration(null);
    showToast('Ready to animate! Select a video model.', 'success');
  };

  const handleUpscale = (generation: Generation) => {
    setSelectedGeneration(null);
    setUpscaleGeneration(generation);
  };

  const handleSaveToProject = async (projectId: string) => {
    if (!selectedGeneration) return;
    const token = localStorage.getItem('userToken');
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ generationId: selectedGeneration.id }),
      });
      if (response.ok) {
        showToast('Saved to project!', 'success');
        return { success: true };
      }
    } catch (error) {
      showToast('Failed to save to project', 'error');
    }
    return undefined;
  };

  // Filter generations (must be defined before navigation functions)
  const filteredGenerations = generations.filter(g => {
    // Type filter
    if (galleryFilter !== 'all' && galleryFilter !== 'projects' && g.type !== galleryFilter) return false;
    
    // Date filter
    if (dateFilter !== 'all' && g.startedAt) {
      const genDate = new Date(g.startedAt);
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (genDate < today) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (genDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (genDate < monthAgo) return false;
      }
    }
    
    // Model filter
    if (modelFilter !== 'all' && g.modelName !== modelFilter) return false;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        g.prompt?.toLowerCase().includes(query) ||
        g.modelName?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Navigation for modal (after filteredGenerations is defined)
  const handlePrevGeneration = () => {
    const currentIndex = filteredGenerations.findIndex(g => g.id === selectedGeneration?.id);
    if (currentIndex > 0) {
      setSelectedGeneration(filteredGenerations[currentIndex - 1]);
    }
  };

  const handleNextGeneration = () => {
    const currentIndex = filteredGenerations.findIndex(g => g.id === selectedGeneration?.id);
    if (currentIndex < filteredGenerations.length - 1) {
      setSelectedGeneration(filteredGenerations[currentIndex + 1]);
    }
  };

  // Calculate index for modal navigation
  const selectedGenerationIndex = selectedGeneration ? filteredGenerations.findIndex(g => g.id === selectedGeneration.id) : -1;

  // Separate completed and pending
  const completedGenerations = filteredGenerations.filter(g => g.status === 'completed');
  const pendingGenerations = filteredGenerations.filter(g => g.status === 'pending' || g.status === 'processing');

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg ${
              toast.type === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          {/* Type Filter Buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setGalleryFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                galleryFilter === 'all'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid className="w-4 h-4" />
              All
              <span className="text-xs opacity-60">{generations.length}</span>
            </button>
            {Object.entries(typeInfo).map(([type, info]) => {
              const count = type === 'projects' 
                ? projects.length 
                : generations.filter(g => g.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setGalleryFilter(type);
                    if (type === 'projects') {
                      fetchProjects();
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    galleryFilter === type
                      ? `bg-gradient-to-r ${info.gradient} text-white`
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <info.icon className="w-4 h-4" />
                  {info.label}
                  <span className="text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prompt or model..."
                className="pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-purple-500/50 w-56"
              />
            </div>
            
            {/* Date and Model Filters */}
            <div ref={filterDropdownRef} className="flex items-center gap-3">
            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDateDropdown(!showDateDropdown); setShowModelDropdown(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:border-cyan-500/50 transition-colors"
              >
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                {dateFilterOptions.find(d => d.id === dateFilter)?.label || 'All time'}
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              {showDateDropdown && (
                <div className="absolute top-full mt-1 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                  {dateFilterOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setDateFilter(option.id); setShowDateDropdown(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                        dateFilter === option.id ? 'text-cyan-400' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Model Filter */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowModelDropdown(!showModelDropdown); setShowDateDropdown(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:border-cyan-500/50 transition-colors"
              >
                <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                {modelFilter === 'all' ? 'All models' : modelFilter}
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              {showModelDropdown && (
                <div className="absolute top-full mt-1 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 py-1 min-w-[180px] max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setModelFilter('all'); setShowModelDropdown(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                      modelFilter === 'all' ? 'text-cyan-400' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    All models
                  </button>
                  {uniqueModels.map(model => (
                    <button
                      key={model}
                      onClick={() => { setModelFilter(model || 'all'); setShowModelDropdown(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors truncate ${
                        modelFilter === model ? 'text-cyan-400' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
            
            {/* Selection Mode Toggle */}
            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedIds(new Set());
              }}
              className={`p-2 rounded-lg transition-colors ${
                selectionMode 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
              title="Toggle selection mode"
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            
            {/* Bulk Delete */}
            {selectionMode && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete ({selectedIds.size})
              </button>
            )}

            {/* View Mode */}
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* Refresh */}
            <button
              onClick={fetchGenerations}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Projects View */}
        {galleryFilter === 'projects' ? (
          <div className="space-y-6">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Layers className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No projects yet</p>
                <p className="text-[var(--text-muted)]">Create a project to organize your generations</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projects.map(project => (
                  <motion.div
                    key={project.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-all"
                    onClick={() => {
                      // Could navigate to project detail page
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: project.color + '20' }}
                      >
                        <Layers className="w-5 h-5" style={{ color: project.color }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{project.name}</h3>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* All Generations Grid (pending + completed mixed) */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">No generations yet</p>
            <p className="text-[var(--text-muted)]">Create your first generation using the bar below</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredGenerations.map((gen) => {
              const isSelected = selectedIds.has(gen.id);
              const isPending = gen.status === 'pending' || gen.status === 'processing';
              const canAnimate = gen.status === 'completed' && gen.type === 'image';
              const canUseAsRef = gen.status === 'completed' && gen.result && gen.type !== 'chat';
              
              return (
                <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: selectionMode ? 1 : 1.02 }}
                  className={`relative aspect-square bg-[var(--bg-secondary)] border rounded-xl overflow-hidden cursor-pointer group transition-all ${
                    isPending ? 'border-cyan-500/30' :
                    isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[var(--border-color)] hover:border-cyan-500/50'
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      const newSelected = new Set(selectedIds);
                      if (isSelected) {
                        newSelected.delete(gen.id);
                      } else {
                        newSelected.add(gen.id);
                      }
                      setSelectedIds(newSelected);
                    } else if (!isPending) {
                      setSelectedGeneration(gen);
                    }
                  }}
                >
                  {/* Pending state */}
                  {isPending ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
                      <p className="text-xs text-[var(--text-secondary)] text-center line-clamp-2">{gen.prompt}</p>
                      <p className="text-xs text-cyan-400 mt-1">{gen.modelName}</p>
                    </div>
                  ) : gen.type === 'video' ? (
                    <div className="relative w-full h-full">
                      {gen.thumbnailUrl ? (
                        <img src={gen.thumbnailUrl} alt={gen.prompt || ''} className="w-full h-full object-cover" />
                      ) : gen.result ? (
                        <video src={gen.result} className="w-full h-full object-cover" muted preload="metadata" playsInline />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-600/20">
                          <Video className="w-10 h-10 text-pink-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : gen.type === 'chat' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-600/20 p-4">
                      <MessageSquare className="w-10 h-10 text-emerald-400 mb-2" />
                      <p className="text-xs text-[var(--text-primary)] text-center line-clamp-3">{gen.prompt?.slice(0, 80)}...</p>
                    </div>
                  ) : (
                    <img src={gen.thumbnailUrl || gen.result} alt={gen.prompt || ''} className="w-full h-full object-cover" />
                  )}
                  
                  {/* Type badge */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
                    gen.type === 'video' ? 'bg-pink-500 text-white' : 
                    gen.type === 'image' ? 'bg-cyan-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    {gen.type}
                  </div>
                  
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-purple-500' : 'bg-black/50'
                    }`}>
                      {isSelected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-white" />}
                    </div>
                  )}
                  
                  {/* Model name overlay - always visible at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">{gen.modelName}</p>
                  </div>
                  
                  {/* Hover overlay with action icons */}
                  {!selectionMode && !isPending && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Top-right action buttons (Download, Save to Project, Delete) */}
                      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                        {canUseAsRef && (
                          <a
                            href={gen.result}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-white" />
                          </a>
                        )}
                        {canUseAsRef && (
                          <button
                            onClick={(e) => { e.stopPropagation(); /* TODO: save to project */ }}
                            className="p-1.5 bg-blue-500/60 backdrop-blur-sm rounded-lg hover:bg-blue-500/80 transition-colors"
                            title="Save to Project"
                          >
                            <FolderPlus className="w-4 h-4 text-white" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGeneration(gen.id); }}
                          className="p-1.5 bg-red-500/60 backdrop-blur-sm rounded-lg hover:bg-red-500/80 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Center eye icon */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      
                      {/* Bottom quick action buttons (Use as Ref, Remix, Animate, Upscale) */}
                      {canUseAsRef && (
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUseAsReference(gen.result || ''); }}
                            className="p-2 bg-purple-500/80 text-white rounded-lg hover:bg-purple-500 transition-colors backdrop-blur-sm"
                            title="Use as Reference"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemix(gen); }}
                            className="p-2 bg-emerald-500/80 text-white rounded-lg hover:bg-emerald-500 transition-colors backdrop-blur-sm"
                            title="Remix"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          {canAnimate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAnimate(gen); }}
                              className="p-2 bg-pink-500/80 text-white rounded-lg hover:bg-pink-500 transition-colors backdrop-blur-sm"
                              title="Animate to Video"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpscale(gen); }}
                            className="p-2 bg-sky-500/80 text-white rounded-lg hover:bg-sky-500 transition-colors backdrop-blur-sm"
                            title="Upscale"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {completedGenerations.map((gen) => {
              const Icon = typeInfo[gen.type]?.icon || ImageIcon;
              const isSelected = selectedIds.has(gen.id);
              
              return (
                <motion.div
                  key={gen.id}
                  whileHover={{ scale: 1.01 }}
                  className={`flex items-center gap-4 p-4 bg-[var(--bg-secondary)] border rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[var(--border-color)] hover:border-cyan-500/50'
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      const newSelected = new Set(selectedIds);
                      if (isSelected) {
                        newSelected.delete(gen.id);
                      } else {
                        newSelected.add(gen.id);
                      }
                      setSelectedIds(newSelected);
                    } else {
                      setSelectedGeneration(gen);
                    }
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    {gen.type === 'chat' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-600/20">
                        <MessageSquare className="w-6 h-6 text-emerald-400" />
                      </div>
                    ) : (
                      <img 
                        src={gen.thumbnailUrl || gen.result} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{gen.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        gen.type === 'video' ? 'bg-pink-500/20 text-pink-400' : 
                        gen.type === 'image' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {gen.type}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{gen.modelName}</span>
                    </div>
                  </div>
                  
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-purple-500' : 'bg-[var(--bg-tertiary)]'
                    }`}>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {/* Creator Bar */}
      <CreatorBar
        prompt={prompt}
        setPrompt={setPrompt}
        inputImages={inputImages}
        setInputImages={setInputImages}
        generationType={generationType}
        setGenerationType={setGenerationType}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        multiModelMode={multiModelMode}
        setMultiModelMode={setMultiModelMode}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        numImages={numImages}
        setNumImages={setNumImages}
        calculatedPrice={calculatedPrice}
        models={models}
        user={user}
        activeWorkspace={activeWorkspace}
        onGenerate={handleGenerate}
        showAuthModal={showAuthModal}
        fixed={true}
        generations={generations}
        uploadHistory={[]}
        projects={[]}
      />

      {/* Generation Modal */}
      <AnimatePresence>
        {selectedGeneration && (
          <GenerationModal
            generation={selectedGeneration}
            onClose={() => setSelectedGeneration(null)}
            onDelete={handleDeleteGeneration}
            onUseAsReference={handleUseAsReference}
            onRemix={handleRemix}
            onAnimate={handleAnimate}
            onUpscale={handleUpscale}
            projects={projects}
            onSaveToProject={handleSaveToProject}
            onPrev={handlePrevGeneration}
            onNext={handleNextGeneration}
            hasPrev={selectedGenerationIndex > 0}
            hasNext={selectedGenerationIndex < filteredGenerations.length - 1}
          />
        )}
      </AnimatePresence>

      {/* Upscale Modal */}
      <AnimatePresence>
        {upscaleGeneration && upscaleGeneration.type !== 'chat' && (
          <UpscaleModal
            generation={upscaleGeneration as Generation & { type: 'image' | 'video' }}
            onClose={() => setUpscaleGeneration(null)}
            onUpscaleStart={(data) => {
              // Handle upscale start
              console.log('Upscale started:', data);
              setUpscaleGeneration(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
