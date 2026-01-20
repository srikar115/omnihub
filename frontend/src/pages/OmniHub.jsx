import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Image, Video, MessageSquare,
  ChevronDown, ChevronUp, Send, Loader2, Download,
  X, Wand2, Plus, Play, Eye, Trash2,
  Clock, Grid, Users, Box, CreditCard,
  Check, Filter, LayoutGrid, List, Building2,
  Upload, History, ImagePlus, AlertCircle,
  Search, Tag, DollarSign, ExternalLink,
  RefreshCw, Link2, CheckSquare, Square, Layers,
  Copy, Share2, FolderOpen, FolderPlus, Star,
  Maximize2, Film, ChevronLeft, ChevronRight,
  Pencil, Zap, Share, Bookmark,
} from 'lucide-react';
import axios from 'axios';
import { AppLayout } from '../components/layout';
import { ChatView } from '../components/chat';
import { WorkspaceGallery } from '../components/workspace';
import { CreatorBar, UpscaleModal } from '../components/creator';

const API_BASE = 'http://localhost:3001/api';

const TYPE_ICONS = { image: Image, video: Video, chat: MessageSquare };
const TYPE_COLORS = {
  image: 'from-cyan-500 to-blue-600',
  video: 'from-pink-500 to-rose-600',
  chat: 'from-emerald-500 to-teal-600',
};

export default function OmniHub() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialType = searchParams.get('type') || 'image';
  const initialView = searchParams.get('view') || 'generations';
  const initialFilter = searchParams.get('filter') || null; // Filter for generation type display
  
  // Get pre-filled data from navigation state (from Dashboard)
  const navState = location.state || {};

  return (
    <AppLayout>
      {({ user, updateUserCredits, showAuthModal, loading, workspaces, activeWorkspace, onOpenWorkspaceSettings }) => (
        <OmniHubContent
          user={user}
          updateUserCredits={updateUserCredits}
          showAuthModal={showAuthModal}
          loading={loading}
          initialType={navState.generationType || initialType}
          initialView={initialView}
          initialFilter={initialFilter}
          initialPrompt={navState.prompt || ''}
          initialImages={navState.inputImages || []}
          initialSelectedModelId={navState.selectedModelId}
          initialSelectedModelsIds={navState.selectedModelsIds}
          initialMultiModelMode={navState.multiModelMode}
          initialSelectedOptions={navState.selectedOptions}
          initialNumImages={navState.numImages}
          initialPerModelSettings={navState.perModelSettings}
          autoGenerate={navState.autoGenerate || false}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
        />
      )}
    </AppLayout>
  );
}

// Export OmniHubContent for use in Dashboard
export function OmniHubContent({ 
  user, 
  updateUserCredits, 
  showAuthModal, 
  loading, 
  initialType, 
  initialView, 
  initialFilter = null,
  initialPrompt = '', 
  initialImages = [],
  initialSelectedModelId,
  initialSelectedModelsIds,
  initialMultiModelMode = false,
  initialSelectedOptions = {},
  initialNumImages = 1,
  initialPerModelSettings = null,
  workspaces, 
  activeWorkspace, 
  autoGenerate = false, 
  onAutoGenerateComplete, 
  embedded = false 
}) {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('my-generations');
  const [generationType, setGenerationType] = useState(initialType);
  const [models, setModels] = useState({ image: [], video: [], chat: [] });
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState(initialSelectedOptions);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [pricingSettings, setPricingSettings] = useState({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
  });
  const [prompt, setPrompt] = useState(initialPrompt);
  const [inputImages, setInputImages] = useState(initialImages);
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(autoGenerate);
  const [pendingPerModelSettings, setPendingPerModelSettings] = useState(initialPerModelSettings);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showNumImagesDropdown, setShowNumImagesDropdown] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [numImages, setNumImages] = useState(initialNumImages);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  
  // Multi-model selection state
  const [multiModelMode, setMultiModelMode] = useState(initialMultiModelMode);
  const [selectedModels, setSelectedModels] = useState([]); // Array of models, max 4 - will be populated after models load
  const [showMultiModelSettings, setShowMultiModelSettings] = useState(false);
  
  // Enhance prompt state
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Calculate enhance cost estimate
  const enhanceCostEstimate = useMemo(() => {
    // GPT-4o pricing: input $0.0025/1K, output $0.01/1K
    const promptTokens = Math.ceil((prompt || '').length / 4);
    const imageTokens = inputImages.length * 85 * 4; // ~85 tokens per 512px tile, estimate 4 tiles
    const inputTokens = promptTokens + imageTokens + 200; // 200 for system prompt
    const outputTokens = 250; // estimate
    return ((inputTokens * 0.0025 / 1000) + (outputTokens * 0.01 / 1000)).toFixed(3);
  }, [prompt, inputImages.length]);
  
  // Gallery state
  const [generations, setGenerations] = useState([]);
  const [activeQueue, setActiveQueue] = useState([]);
  const [generationCounts, setGenerationCounts] = useState({ image: 0, video: 0, chat: 0 });
  // Gallery filter is independent from generation type - only for filtering gallery view
  // Initialize with URL filter parameter if provided (e.g., from sidebar "Videos" link)
  const [galleryFilter, setGalleryFilter] = useState(initialFilter || 'all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGeneration, setSelectedGeneration] = useState(null);
  const [upscaleGeneration, setUpscaleGeneration] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Advanced filter state for History
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [modelFilter, setModelFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);
  const [showModelFilterDropdown, setShowModelFilterDropdown] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  
  // Custom date range state
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Upload history and projects state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const promptRef = useRef(null);
  const pollingRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch models and pricing settings on mount
  useEffect(() => {
    fetchModels();
    fetchPricingSettings();
  }, []);

  const fetchPricingSettings = async () => {
    try {
      // Use public pricing settings endpoint (no admin auth required)
      const response = await axios.get(`${API_BASE}/pricing-settings`);
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

  // Define fetchGenerations before useEffect that uses it
  const fetchGenerations = useCallback(async () => {
    // Get the current workspace ID from the closure
    const currentWorkspaceId = activeWorkspace?.id;
    if (!currentWorkspaceId) return; // Don't fetch without workspace ID
    
    try {
      // Always pass workspaceId to filter generations by active workspace
      const workspaceParam = `?workspaceId=${currentWorkspaceId}`;
      const response = await axios.get(`${API_BASE}/generations${workspaceParam}`, getAuthHeaders());
      setGenerations(response.data.generations || []);
      setGenerationCounts(response.data.counts || { image: 0, video: 0, chat: 0 });
      
      const pending = (response.data.generations || []).filter(g => g.status === 'pending');
      setActiveQueue(pending);
    } catch (err) {
      console.error('Failed to fetch generations:', err);
    } finally {
      setDataLoading(false);
    }
  }, [activeWorkspace?.id]);

  // Fetch generations when user or active workspace changes
  useEffect(() => {
    // Only fetch when both user and activeWorkspace are available
    // This prevents fetching with empty workspaceId during initial load
    if (user && activeWorkspace) {
      fetchGenerations();
    } else if (!user) {
      setDataLoading(false);
    }
  }, [user, activeWorkspace, fetchGenerations]);

  // Poll for generation updates
  useEffect(() => {
    if (user && activeQueue.length > 0) {
      pollingRef.current = setInterval(checkQueueStatus, 2000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [user, activeQueue]);

  // Update selected model when type changes (but not on initial load with Dashboard state)
  const hasInitialModelRef = useRef(!!initialSelectedModelId);
  useEffect(() => {
    if (models[generationType]?.length > 0) {
      // Don't override the initial model selection from Dashboard on first load
      if (hasInitialModelRef.current) {
        hasInitialModelRef.current = false;
        return;
      }
      setSelectedModel(models[generationType][0]);
      setSelectedOptions({});
    }
  }, [generationType, models]);

  // Sync generation type with URL type param (when navigating via sidebar)
  useEffect(() => {
    if (initialType && ['image', 'video', 'chat'].includes(initialType)) {
      setGenerationType(initialType);
    }
  }, [initialType]);

  // Sync gallery filter with URL filter param (when navigating via sidebar Images/Videos/Chat)
  useEffect(() => {
    if (initialFilter && ['image', 'video', 'chat'].includes(initialFilter)) {
      setGalleryFilter(initialFilter);
    } else if (initialFilter === null) {
      // Reset to 'all' when no filter specified (e.g., clicking OmniHub in sidebar)
      setGalleryFilter('all');
    }
  }, [initialFilter]);

  // Calculate price when options change
  useEffect(() => {
    if (multiModelMode ? selectedModels.length > 0 : selectedModel) {
      calculateModelPrice();
    } else {
      setCalculatedPrice(0);
    }
  }, [selectedModel, selectedModels, multiModelMode, selectedOptions, numImages, generationType]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelDropdown(false);
      setShowTypeDropdown(false);
      setShowNumImagesDropdown(false);
      setShowDateFilterDropdown(false);
      setShowModelFilterDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-generate effect - triggers generation when coming from Dashboard
  useEffect(() => {
    if (pendingAutoGenerate && !autoGenerateTriggered && selectedModel && prompt.trim() && user) {
      setAutoGenerateTriggered(true);
      setPendingAutoGenerate(false);
      // Small delay to ensure everything is ready
      const timer = setTimeout(async () => {
        await executeGeneration(pendingPerModelSettings);
        setPendingPerModelSettings(null);
        onAutoGenerateComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoGenerate, autoGenerateTriggered, selectedModel, prompt, user]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
  });

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      const modelsByType = { image: [], video: [], chat: [] };
      response.data.forEach(model => {
        if (modelsByType[model.type]) {
          modelsByType[model.type].push(model);
        }
      });
      setModels(modelsByType);
      
      // Handle model selection from Dashboard navigation
      if (initialSelectedModelId) {
        const allModels = [...modelsByType.image, ...modelsByType.video, ...modelsByType.chat];
        const targetModel = allModels.find(m => m.id === initialSelectedModelId);
        if (targetModel) {
          setSelectedModel(targetModel);
        }
      } else if (modelsByType[initialType]?.length > 0) {
        setSelectedModel(modelsByType[initialType][0]);
      }
      
      // Handle multi-model selection from Dashboard navigation
      if (initialSelectedModelsIds && initialSelectedModelsIds.length > 0) {
        const allModels = [...modelsByType.image, ...modelsByType.video, ...modelsByType.chat];
        const targetModels = initialSelectedModelsIds
          .map(id => allModels.find(m => m.id === id))
          .filter(Boolean);
        if (targetModels.length > 0) {
          setSelectedModels(targetModels);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/uploads`, getAuthHeaders());
      setUploadHistory(response.data || []);
    } catch (err) {
      console.error('Failed to fetch upload history:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects`, getAuthHeaders());
      setProjects(response.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const checkQueueStatus = async () => {
    if (activeQueue.length === 0) return;
    
    try {
      const response = await axios.get(`${API_BASE}/generations`, getAuthHeaders());
      setGenerations(response.data.generations || []);
      setGenerationCounts(response.data.counts || { image: 0, video: 0, chat: 0 });
      
      const pending = (response.data.generations || []).filter(g => g.status === 'pending');
      setActiveQueue(pending);
      
      // Update user credits
      const userResponse = await axios.get(`${API_BASE}/auth/me`, getAuthHeaders());
      updateUserCredits(userResponse.data.credits);
    } catch (err) {
      console.error('Failed to check queue:', err);
    }
  };

  const calculateModelPrice = async () => {
    // Get the list of models to price (multi-mode or single)
    const modelsToPrice = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
    if (modelsToPrice.length === 0) {
      setCalculatedPrice(0);
      return;
    }
    
    try {
      // Build options with num_images for image type
      const options = { ...selectedOptions };
      if (generationType === 'image' && numImages > 1) {
        options.num_images = String(numImages);
      }
      
      let totalPrice = 0;
      for (const model of modelsToPrice) {
        try {
          const response = await axios.post(`${API_BASE}/models/${model.id}/price`, {
            options: options
          });
          totalPrice += response.data.price;
        } catch {
          // Fallback: multiply base price by numImages for image type
          const basePrice = model.credits;
          const multiplier = generationType === 'image' ? numImages : 1;
          totalPrice += calculateUserCredits(model, basePrice * multiplier);
        }
      }
      
      setCalculatedPrice(totalPrice);
    } catch (err) {
      // Fallback calculation for all models
      const multiplier = generationType === 'image' ? numImages : 1;
      const totalPrice = modelsToPrice.reduce((sum, model) => sum + calculateUserCredits(model, model.credits * multiplier), 0);
      setCalculatedPrice(totalPrice);
    }
  };

  const handleGenerate = async () => {
    // Get the list of models to generate from (multi-mode or single)
    const modelsToGenerate = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
    
    if (!prompt.trim() || modelsToGenerate.length === 0) return;
    
    if (!user) {
      showAuthModal();
      return;
    }
    
    // Validate required reference images for all selected models
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

    // For multi-model mode, show settings modal first
    if (multiModelMode && selectedModels.length > 1) {
      setShowMultiModelSettings(true);
      return;
    }

    // Single model - generate directly
    await executeGeneration();
  };

  // Execute generation with optional per-model settings
  const executeGeneration = async (perModelSettings = null) => {
    const modelsToGenerate = multiModelMode ? selectedModels : (selectedModel ? [selectedModel] : []);
    
    // Generate for each model
    const allNewGenerations = [];
    let lastUserCredits = user.credits;

    for (const model of modelsToGenerate) {
      try {
        // Use per-model settings if provided, otherwise use shared selectedOptions
        const options = perModelSettings?.[model.id] 
          ? { ...perModelSettings[model.id] }
          : { ...selectedOptions };
        
        // Ensure num_images is set for image type
        if (generationType === 'image' && !options.num_images) {
          options.num_images = String(numImages);
        }

        const response = await axios.post(`${API_BASE}/generate`, {
          type: generationType,
          model: model.id,
          prompt: prompt.trim(),
          options: options,
          inputImages: inputImages,
          workspaceId: activeWorkspace?.id || null, // Always pass workspace ID
        }, getAuthHeaders());

        // Handle multiple generations (for multi-image requests)
        const generations = response.data.generations || [{ id: response.data.id, visibleId: response.data.visibleId }];
        const creditsPerGen = response.data.credits / generations.length;
        
        const newGens = generations.map((gen) => ({
          id: gen.id,
          visibleId: gen.visibleId,
          type: generationType,
          model: model.id,
          modelName: model.name,
          prompt: prompt.trim(),
          credits: creditsPerGen,
          status: 'pending',
          startedAt: new Date().toISOString(),
        }));
        
        allNewGenerations.push(...newGens);
        lastUserCredits = response.data.userCredits;
      } catch (err) {
        console.error(`Generation failed for ${model.name}:`, err);
        // Continue with other models even if one fails
      }
    }
    
    if (allNewGenerations.length > 0) {
      setActiveQueue(prev => [...allNewGenerations, ...prev]);
      setGenerations(prev => [...allNewGenerations, ...prev]);
      updateUserCredits(lastUserCredits);
      setGenerationCounts(prev => ({ ...prev, [generationType]: (prev[generationType] || 0) + allNewGenerations.length }));
    } else {
      alert('All generations failed. Please try again.');
    }
  };

  const handleDeleteGeneration = async (genId) => {
    try {
      await axios.delete(`${API_BASE}/generations/${genId}`, getAuthHeaders());
      setGenerations(prev => prev.filter(g => g.id !== genId));
      setSelectedGeneration(null);
      fetchGenerations();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Save generation to project directly
  const handleSaveToProjectDirect = async (generation, projectId) => {
    // Validate inputs
    if (!generation?.result) {
      showToast('No content to save', 'error');
      return { success: false };
    }
    if (!projectId) {
      showToast('Please select a project', 'error');
      return { success: false };
    }
    
    try {
      const response = await axios.post(`${API_BASE}/projects/${projectId}/assets`, {
        assetUrl: generation.result,
        assetType: generation.type || 'image',
        name: generation.prompt?.substring(0, 50) || 'Untitled'
      }, getAuthHeaders());
      // Refresh projects to update asset counts
      fetchProjects();
      showToast('Saved to project successfully!', 'success');
      return { success: true };
    } catch (err) {
      console.error('Failed to save to project:', err);
      if (err.response?.status === 409 || err.response?.data?.duplicate) {
        showToast('This image is already in this project', 'error');
        return { success: false, duplicate: true };
      }
      showToast(err.response?.data?.error || 'Failed to save to project', 'error');
      return { success: false };
    }
  };

  // Create new project
  const handleCreateProject = async (name) => {
    try {
      const response = await axios.post(`${API_BASE}/projects`, {
        name,
        color: '#8b5cf6'
      }, getAuthHeaders());
      fetchProjects();
      return response.data;
    } catch (err) {
      console.error('Failed to create project:', err);
      showToast('Failed to create project', 'error');
      return null;
    }
  };
  
  // Enhance prompt with GPT-4o Vision
  const handleEnhancePrompt = async () => {
    if (!prompt.trim() && inputImages.length === 0) return;
    
    if (!user) {
      showAuthModal();
      return;
    }
    
    setIsEnhancing(true);
    try {
      const response = await axios.post(`${API_BASE}/enhance-prompt`, {
        prompt: prompt.trim(),
        imageUrls: inputImages,
        variationType: 'enhance'
      }, getAuthHeaders());
      
      setPrompt(response.data.enhancedPrompt);
      updateUserCredits(response.data.remainingCredits);
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
      alert(err.response?.data?.error || 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Bulk selection handlers
  const toggleSelection = (genId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(genId)) {
        newSet.delete(genId);
      } else {
        newSet.add(genId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredGenerations.map(g => g.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    try {
      await axios.post(`${API_BASE}/generations/bulk-delete`, 
        { ids: Array.from(selectedIds) },
        getAuthHeaders()
      );
      
      // Remove deleted generations from state
      setGenerations(prev => prev.filter(g => !selectedIds.has(g.id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      fetchGenerations();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputImages(prev => [...prev.slice(0, 3), event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Filter generations based on gallery filter, date, model, and search
  const filteredGenerations = generations.filter(g => {
    // Type filter
    if (galleryFilter !== 'all' && galleryFilter !== 'projects' && g.type !== galleryFilter) return false;
    
    // Date filter
    if (dateFilter !== 'all') {
      const genDate = new Date(g.createdAt);
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (genDate < startOfDay) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (genDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (genDate < monthAgo) return false;
      } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
        const fromDate = new Date(customDateFrom);
        const toDate = new Date(customDateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end day
        if (genDate < fromDate || genDate > toDate) return false;
      }
    }
    
    // Model filter
    if (modelFilter !== 'all' && g.model !== modelFilter) return false;
    
    // Search query filter (searches prompt)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesPrompt = g.prompt?.toLowerCase().includes(query);
      const matchesModel = g.modelName?.toLowerCase().includes(query);
      if (!matchesPrompt && !matchesModel) return false;
    }
    
    return true;
  });

  // Get unique models from generations for filter dropdown
  // NOTE: This hook must be defined before any conditional returns to follow Rules of Hooks
  const uniqueModels = useMemo(() => {
    const modelMap = new Map();
    generations.forEach(g => {
      if (g.model && g.modelName) {
        modelMap.set(g.model, g.modelName);
      }
    });
    return Array.from(modelMap.entries()).map(([id, name]) => ({ id, name }));
  }, [generations]);

  // If chat mode is selected, show ChatView
  if (generationType === 'chat') {
    return (
      <ChatView 
        user={user}
        updateUserCredits={updateUserCredits}
        showAuthModal={showAuthModal}
      />
    );
  }

  return (
    <div className={`flex flex-col ${embedded ? 'min-h-[600px]' : 'h-[calc(100vh-88px)]'}`}>
      {/* Gallery Area - with padding for floating bar */}
      <div className={`flex-1 overflow-y-auto ${embedded ? 'px-4 py-4 pb-40' : 'px-8 py-6 pb-48'}`}>
        <>
          {/* Filters and Controls */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Top row: Type filters and view controls */}
            <div className="flex items-center justify-between">
              {/* Type filter tabs */}
              <div className="flex items-center gap-2">
                {['all', 'image', 'video', 'chat', 'projects'].map(filter => {
                  const Icon = filter === 'all' ? Grid : filter === 'projects' ? FolderOpen : filter === 'chat' ? MessageSquare : TYPE_ICONS[filter];
                  const count = filter === 'all' 
                    ? (generationCounts.image || 0) + (generationCounts.video || 0) + (generationCounts.chat || 0)
                    : filter === 'projects'
                    ? projects.length
                    : generationCounts[filter] || 0;
                  
                  return (
                    <button
                      key={filter}
                      onClick={() => {
                        setGalleryFilter(filter);
                        if (filter === 'projects') {
                          fetchProjects();
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        galleryFilter === filter
                          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{filter === 'all' ? 'All' : filter === 'projects' ? 'Projects' : filter === 'chat' ? 'Chats' : filter + 's'}</span>
                      <span className="text-xs opacity-60">({count})</span>
                    </button>
                  );
                })}
                {/* 3D Coming Soon */}
                <button
                  disabled
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] cursor-not-allowed opacity-50"
                >
                  <Box className="w-4 h-4" />
                  <span>3D</span>
                  <span className="text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">Soon</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Selection mode toggle */}
                <button
                  onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  className={`p-2 rounded-lg transition-colors ${
                    selectionMode ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title={selectionMode ? 'Exit selection mode' : 'Select multiple'}
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                
                <div className="w-px h-5 bg-[var(--border-color)]" />
                
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Second row: Search and advanced filters */}
            <div className="flex items-center gap-3">
              {/* Search input with model autocomplete */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by prompt or model..."
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-cyan-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Model autocomplete suggestions */}
                {searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50">
                    {uniqueModels
                      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 5)
                      .length > 0 && (
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden">
                        <p className="px-3 py-1.5 text-xs text-[var(--text-muted)] border-b border-[var(--border-color)]">Filter by model</p>
                        {uniqueModels
                          .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 5)
                          .map(model => (
                            <button
                              key={model.id}
                              onClick={() => { setModelFilter(model.id); setSearchQuery(''); }}
                              className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                            >
                              <Wand2 className="w-4 h-4 text-purple-400" />
                              <span>{model.name}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date filter dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDateFilterDropdown(!showDateFilterDropdown); setShowModelFilterDropdown(false); }}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm hover:border-[var(--border-hover)] transition-colors"
                >
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className={dateFilter !== 'all' ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}>
                    {dateFilter === 'all' ? 'All time' : 
                     dateFilter === 'today' ? 'Today' : 
                     dateFilter === 'week' ? 'Last 7 days' : 
                     dateFilter === 'month' ? 'Last 30 days' :
                     dateFilter === 'custom' && customDateFrom && customDateTo ? 
                       `${new Date(customDateFrom).toLocaleDateString()} - ${new Date(customDateTo).toLocaleDateString()}` :
                     'Custom'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
                
                <AnimatePresence>
                  {showDateFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      {[
                        { value: 'all', label: 'All time' },
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'Last 7 days' },
                        { value: 'month', label: 'Last 30 days' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => { setDateFilter(option.value); setShowDateFilterDropdown(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between ${
                            dateFilter === option.value ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <span>{option.label}</span>
                          {dateFilter === option.value && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                      
                      {/* Custom date range */}
                      <div className="border-t border-[var(--border-color)]">
                        <button
                          onClick={() => setDateFilter('custom')}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between ${
                            dateFilter === 'custom' ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <span>Custom Range</span>
                          {dateFilter === 'custom' && <Check className="w-4 h-4" />}
                        </button>
                        
                        {dateFilter === 'custom' && (
                          <div className="p-3 border-t border-[var(--border-color)] space-y-3">
                            <div>
                              <label className="text-xs text-[var(--text-muted)] block mb-1">From</label>
                              <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:border-cyan-500/50"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--text-muted)] block mb-1">To</label>
                              <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:border-cyan-500/50"
                              />
                            </div>
                            <button
                              onClick={() => setShowDateFilterDropdown(false)}
                              disabled={!customDateFrom || !customDateTo}
                              className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] rounded-lg text-sm font-medium transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Model filter dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowModelFilterDropdown(!showModelFilterDropdown); setShowDateFilterDropdown(false); }}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm hover:border-[var(--border-hover)] transition-colors"
                >
                  <Wand2 className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className={modelFilter !== 'all' ? 'text-cyan-400 max-w-[120px] truncate' : 'text-[var(--text-secondary)]'}>
                    {modelFilter === 'all' ? 'All models' : uniqueModels.find(m => m.id === modelFilter)?.name || 'All models'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
                
                <AnimatePresence>
                  {showModelFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      {/* Search input for models */}
                      <div className="p-2 border-b border-[var(--border-color)]">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                          <input
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            placeholder="Search models..."
                            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:border-cyan-500/50 transition-colors"
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setModelFilter('all'); setShowModelFilterDropdown(false); setModelSearchQuery(''); }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between ${
                            modelFilter === 'all' ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          <span>All models</span>
                          {modelFilter === 'all' && <Check className="w-4 h-4" />}
                        </button>
                        <div className="border-t border-[var(--border-color)]" />
                        {uniqueModels
                          .filter(model => model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                          .map(model => (
                            <button
                              key={model.id}
                              onClick={() => { setModelFilter(model.id); setShowModelFilterDropdown(false); setModelSearchQuery(''); }}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between ${
                                modelFilter === model.id ? 'text-cyan-400' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="truncate">{model.name}</span>
                              {modelFilter === model.id && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        {uniqueModels.filter(m => m.name.toLowerCase().includes(modelSearchQuery.toLowerCase())).length === 0 && modelSearchQuery && (
                          <p className="px-4 py-2.5 text-sm text-[var(--text-muted)]">No models found</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Clear filters button - only show when filters are active */}
              {(dateFilter !== 'all' || modelFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setDateFilter('all'); setModelFilter('all'); setSearchQuery(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

            {/* Selection mode action bar */}
            {selectionMode && (
              <div className="flex items-center justify-between mb-4 p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={selectAll}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Select all
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={deselectAll}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Deselect all
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exitSelectionMode}
                    className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0 || bulkDeleting}
                    className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Gallery Grid or Projects View */}
        {galleryFilter === 'projects' ? (
          // Projects View
          <div className="space-y-6">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                  <FolderOpen className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-sm text-[var(--text-muted)] mb-6">Save generations to projects to organize your work</p>
              </div>
            ) : (
              projects.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onRefresh={fetchProjects}
                />
              ))
            )}
          </div>
        ) : dataLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium mb-2">No generations yet</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Start creating with the prompt bar below</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
              : 'grid-cols-1'
          }`}>
            {filteredGenerations.map(gen => (
              <GenerationCard
                key={gen.id}
                generation={gen}
                viewMode={viewMode}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelection(gen.id);
                  } else {
                    setSelectedGeneration(gen);
                    fetchProjects(); // Load projects for "Save to Project" feature
                  }
                }}
                onUseAsReference={(imageUrl) => {
                  setInputImages(prev => [...prev, imageUrl]);
                }}
                onRemix={(generation) => {
                  setInputImages([generation.result]);
                  setPrompt(generation.prompt);
                  const allModels = [...models.image, ...models.video];
                  const originalModel = allModels.find(m => m.id === generation.model);
                  if (originalModel) {
                    setSelectedModel(originalModel);
                    setGenerationType(generation.type);
                  }
                }}
                onAnimate={(imageUrl) => {
                  setInputImages([imageUrl]);
                  setGenerationType('video');
                  const i2vModel = models.video?.find(m => m.imageInput !== 'none');
                  if (i2vModel) {
                    setSelectedModel(i2vModel);
                  }
                }}
                onUpscale={(generation) => setUpscaleGeneration(generation)}
                onSaveToProject={(generation) => {
                  setSelectedGeneration(generation);
                  fetchProjects();
                }}
                projects={projects}
                onSaveToProjectDirect={handleSaveToProjectDirect}
                onLoadProjects={fetchProjects}
                onCreateProject={handleCreateProject}
                onDelete={handleDeleteGeneration}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(gen.id)}
                onToggleSelect={() => toggleSelection(gen.id)}
              />
            ))}
          </div>
        )}
        </>
      </div>

      {/* Bottom Creator Bar */}
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
        onGenerate={(perModelSettings) => executeGeneration(perModelSettings)}
        showAuthModal={showAuthModal}
        fixed={true}
        generations={generations}
        uploadHistory={uploadHistory}
        projects={projects}
        onLoadProjects={() => {
          fetchUploadHistory();
          fetchProjects();
        }}
        onCreateProject={fetchProjects}
      />

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Generation Detail Modal */}
      <AnimatePresence>
        {selectedGeneration && (() => {
          const currentIndex = filteredGenerations.findIndex(g => g.id === selectedGeneration.id);
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex < filteredGenerations.length - 1;
          
          return (
            <GenerationModal
              generation={selectedGeneration}
              onClose={() => setSelectedGeneration(null)}
              onDelete={handleDeleteGeneration}
              models={models}
              onUseAsReference={(imageUrl) => {
                setInputImages(prev => [...prev, imageUrl]);
                setSelectedGeneration(null);
              }}
onRemix={(generation) => {
              // Add image as reference
              setInputImages([generation.result]);
              // Set the prompt (could be enhanced for variations)
              setPrompt(generation.prompt);
              // Find and select the model
              const allModels = [...models.image, ...models.video];
              const originalModel = allModels.find(m => m.id === generation.model);
              if (originalModel) {
                setSelectedModel(originalModel);
                setGenerationType(generation.type);
              }
              // Close modal
              setSelectedGeneration(null);
              // Scroll to and focus the omni bar
              setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                // Focus the prompt input if available
                const promptInput = document.querySelector('textarea[placeholder*="Describe"]');
                if (promptInput) promptInput.focus();
              }, 100);
            }}
              onAnimate={(imageUrl) => {
                // Set image as reference for video generation
                setInputImages([imageUrl]);
                setGenerationType('video');
                // Find an image-to-video model
                const i2vModel = models.video?.find(m => m.imageInput !== 'none');
                if (i2vModel) {
                  setSelectedModel(i2vModel);
                }
                setSelectedGeneration(null);
              }}
              onUpscale={(generation) => {
                setSelectedGeneration(null);
                setUpscaleGeneration(generation);
              }}
              projects={projects}
              onSaveToProject={async (projectId) => {
                const result = await handleSaveToProjectDirect(selectedGeneration, projectId);
                if (result?.success) {
                  setSelectedGeneration(null); // Close modal on success
                }
                return result;
              }}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={() => hasPrev && setSelectedGeneration(filteredGenerations[currentIndex - 1])}
              onNext={() => hasNext && setSelectedGeneration(filteredGenerations[currentIndex + 1])}
            />
          );
        })()}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-green-500/90 text-white' 
                : 'bg-red-500/90 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upscale Modal */}
      <AnimatePresence>
        {upscaleGeneration && (
          <UpscaleModal
            generation={upscaleGeneration}
            onClose={() => setUpscaleGeneration(null)}
            onUpscaleStart={(result) => {
              // Add to pending generations and refresh
              setToast({ type: 'success', message: 'Upscale started! Check queue for progress.' });
              fetchGenerations();
            }}
            authToken={user?.token}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Queue Card Component
function QueueCard({ generation }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(generation.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [generation.startedAt]);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 animate-pulse" />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
        <div className="flex items-center gap-1 text-sm font-mono">
          <Clock className="w-3 h-3 text-[var(--text-muted)]" />
          <span>{elapsed}s</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
        <p className="text-xs text-white/70 truncate text-center">{generation.modelName}</p>
      </div>
    </div>
  );
}

// Generation Card Component
function GenerationCard({ generation, viewMode, onClick, onUseAsReference, onRemix, onDelete, onAnimate, onUpscale, onSaveToProject, selectionMode, isSelected, onToggleSelect, projects = [], onSaveToProjectDirect, onLoadProjects, onCreateProject }) {
  const Icon = TYPE_ICONS[generation.type];
  const canUseAsRef = generation.status === 'completed' && generation.result && generation.type !== 'chat';
  const canDownload = generation.status === 'completed' && generation.result && generation.type !== 'chat';
  const canAnimate = generation.status === 'completed' && generation.result && generation.type === 'image';
  const canUpscale = generation.status === 'completed' && generation.result && (generation.type === 'image' || generation.type === 'video');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [savingToProject, setSavingToProject] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className={`flex items-center gap-4 p-4 bg-[var(--bg-secondary)] border rounded-xl cursor-pointer hover:border-[var(--border-color)] transition-all group ${
          isSelected ? 'border-cyan-500 bg-cyan-500/5' : 'border-[var(--border-color)]'
        }`}
      >
        {/* Selection checkbox */}
        {selectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            className="flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-cyan-400" />
            ) : (
              <Square className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
            )}
          </button>
        )}
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-tertiary)] relative">
          {generation.status === 'completed' && generation.result && generation.type === 'image' && (
            <img 
              src={generation.thumbnailUrl || generation.result} 
              alt="" 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {generation.status === 'completed' && generation.result && generation.type === 'video' && (
            <video 
              src={generation.thumbnailUrl || generation.result} 
              className="w-full h-full object-cover" 
              muted
              preload="metadata"
            />
          )}
          {generation.type === 'chat' && (
            <div className="w-full h-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
          )}
          {generation.status === 'pending' && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs bg-gradient-to-r ${TYPE_COLORS[generation.type]} text-white`}>
              {generation.type}
            </span>
            <span className="text-sm font-medium">{generation.modelName}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] truncate">{generation.prompt}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {new Date(generation.startedAt).toLocaleString()}
          </p>
        </div>

        {/* Quick Actions (visible on hover) */}
        <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canDownload && (
            <a
              href={generation.result}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)] transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {canUseAsRef && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onUseAsReference?.(generation.result); }}
                className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                title="Use as Reference"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemix?.(generation); }}
                className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                title="Remix"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(generation.id); }}
            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {generation.status === 'completed' && (
            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Completed</span>
          )}
          {generation.status === 'pending' && (
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </span>
          )}
          {generation.status === 'failed' && (
            <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs" title={generation.error}>
              {generation.errorType === 'content_violation' ? 'Content violation' :
               generation.errorType === 'timeout' ? 'Timed out' :
               'Failed'}
            </span>
          )}
          {generation.status === 'cancelled' && (
            <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">Cancelled</span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e); }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] border group cursor-pointer ${
        isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-[var(--border-color)]'
      }`}
    >
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            className="p-1 bg-black/50 rounded-lg backdrop-blur-sm"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-cyan-400" />
            ) : (
              <Square className="w-5 h-5 text-white/70 hover:text-[var(--text-primary)]" />
            )}
          </button>
        </div>
      )}

      {generation.status === 'completed' && generation.result && generation.type === 'image' && (
        <img 
          src={generation.thumbnailUrl || generation.result} 
          alt="" 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
      {generation.status === 'completed' && generation.result && generation.type === 'video' && (
        <div className="relative w-full h-full">
          <video 
            src={generation.thumbnailUrl || generation.result} 
            className="w-full h-full object-cover" 
            muted 
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
      )}
      {generation.status === 'completed' && generation.type === 'chat' && (
        <div className="w-full h-full p-4 flex flex-col">
          <MessageSquare className="w-8 h-8 text-emerald-400 mb-2" />
          <p className="text-xs text-[var(--text-muted)] line-clamp-4 text-left">{generation.result}</p>
        </div>
      )}
      {generation.status === 'pending' && (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400 relative z-10" />
          <span className="text-xs text-[var(--text-secondary)] mt-2 relative z-10">Generating...</span>
        </div>
      )}
      {generation.status === 'failed' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10 p-3">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-xs text-red-300 text-center line-clamp-2">
            {generation.errorType === 'content_violation' ? 'Content violation' :
             generation.errorType === 'timeout' ? 'Timed out' :
             generation.errorType === 'cancelled' ? 'Cancelled' :
             generation.errorType === 'rate_limit' ? 'Rate limited' :
             generation.errorType === 'api_error' ? 'API error' :
             'Failed'}
          </p>
          <p className="text-[10px] text-red-400/60 mt-1">Credits refunded</p>
        </div>
      )}
      {generation.status === 'cancelled' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-500/10 p-3">
          <X className="w-8 h-8 text-yellow-400 mb-2" />
          <p className="text-xs text-yellow-300 text-center">Cancelled</p>
          <p className="text-[10px] text-yellow-400/60 mt-1">Credits refunded</p>
        </div>
      )}

      {/* Model name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="text-xs font-medium text-white/90 truncate">{generation.modelName}</p>
      </div>

      {/* Hover overlay with quick actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Top-right action buttons (Download, Project, Delete) */}
        <div className="absolute top-2 right-2 flex gap-1.5 z-10">
          {canDownload && (
            <a
              href={generation.result}
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
            <div className="relative">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!showProjectDropdown) {
                    onLoadProjects?.();
                  }
                  setShowProjectDropdown(!showProjectDropdown);
                }}
                className="p-1.5 bg-blue-500/60 backdrop-blur-sm rounded-lg hover:bg-blue-500/80 transition-colors"
                title="Save to Project"
              >
                <FolderPlus className="w-4 h-4 text-white" />
              </button>
              {/* Project dropdown */}
              {showProjectDropdown && (
                <div 
                  className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-30 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] font-medium">Save to Project</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {projects.length > 0 ? (
                      projects.map(project => (
                        <button
                          key={project.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSavingToProject(true);
                            const result = await onSaveToProjectDirect?.(generation, project.id);
                            setSavingToProject(false);
                            if (result?.success) {
                              setShowProjectDropdown(false);
                            }
                          }}
                          disabled={savingToProject}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                        >
                          <FolderOpen className="w-4 h-4 text-cyan-400" />
                          <span className="truncate flex-1">{project.name}</span>
                          {savingToProject && <Loader2 className="w-3 h-3 animate-spin" />}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No projects yet</p>
                    )}
                  </div>
                  <div className="p-2 border-t border-[var(--border-color)]">
                    {showNewProjectInput ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Project name..."
                          className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm outline-none focus:border-cyan-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newProjectName.trim()) {
                              e.preventDefault();
                              (async () => {
                                setCreatingProject(true);
                                const project = await onCreateProject?.(newProjectName.trim());
                                if (project) {
                                  const result = await onSaveToProjectDirect?.(generation, project.id);
                                  if (result?.success) {
                                    setShowProjectDropdown(false);
                                    setShowNewProjectInput(false);
                                    setNewProjectName('');
                                  }
                                }
                                setCreatingProject(false);
                              })();
                            } else if (e.key === 'Escape') {
                              setShowNewProjectInput(false);
                              setNewProjectName('');
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowNewProjectInput(false);
                              setNewProjectName('');
                            }}
                            className="flex-1 px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!newProjectName.trim()) return;
                              setCreatingProject(true);
                              const project = await onCreateProject?.(newProjectName.trim());
                              if (project) {
                                const result = await onSaveToProjectDirect?.(generation, project.id);
                                if (result?.success) {
                                  setShowProjectDropdown(false);
                                  setShowNewProjectInput(false);
                                  setNewProjectName('');
                                }
                              }
                              setCreatingProject(false);
                            }}
                            disabled={!newProjectName.trim() || creatingProject}
                            className="flex-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {creatingProject ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Create & Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewProjectInput(true);
                        }}
                        className="w-full px-3 py-2 text-sm text-cyan-400 hover:bg-[var(--bg-tertiary)] rounded-lg flex items-center gap-2"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Create New Project
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(generation.id); }}
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
        {canUseAsRef && !selectionMode && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onUseAsReference?.(generation.result); }}
              className="p-2 bg-purple-500/80 text-white rounded-lg hover:bg-purple-500 transition-colors backdrop-blur-sm"
              title="Use as Reference"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemix?.(generation); }}
              className="p-2 bg-emerald-500/80 text-white rounded-lg hover:bg-emerald-500 transition-colors backdrop-blur-sm"
              title="Remix"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {canAnimate && (
              <button
                onClick={(e) => { e.stopPropagation(); onAnimate?.(generation.result); }}
                className="p-2 bg-pink-500/80 text-white rounded-lg hover:bg-pink-500 transition-colors backdrop-blur-sm"
                title="Animate to Video"
              >
                <Film className="w-4 h-4" />
              </button>
            )}
            {canUpscale && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpscale?.(generation); }}
                className="p-2 bg-sky-500/80 text-white rounded-lg hover:bg-sky-500 transition-colors backdrop-blur-sm"
                title="Upscale"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Collapsible Section Component
function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-[var(--border-color)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Project Card Component with Tag Filtering
function ProjectCard({ project, onRefresh }) {
  const [selectedTag, setSelectedTag] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingAsset, setEditingAsset] = useState(null);
  const [newTag, setNewTag] = useState('');
  
  // Get unique tags from assets
  const tags = useMemo(() => {
    const tagSet = new Set();
    project.assets?.forEach(asset => {
      if (asset.tag) tagSet.add(asset.tag);
    });
    return Array.from(tagSet);
  }, [project.assets]);
  
  // Filter assets by selected tag
  const filteredAssets = useMemo(() => {
    if (!selectedTag) return project.assets || [];
    return (project.assets || []).filter(asset => asset.tag === selectedTag);
  }, [project.assets, selectedTag]);

  const handleUpdateTag = async (assetId, tag) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`${API_BASE}/projects/${project.id}/assets/${assetId}`, {
        tag: tag || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh?.();
      setEditingAsset(null);
      setNewTag('');
    } catch (err) {
      console.error('Failed to update tag:', err);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div 
        className="p-4 border-b border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-tertiary)]/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium">{project.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{project.assets?.length || 0} items</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      
      {isExpanded && (
        <>
          {/* Tags filter */}
          {tags.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-[var(--text-muted)]" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  !selectedTag ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All
              </button>
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                    selectedTag === tag ? 'bg-purple-500/20 text-purple-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          
          {filteredAssets.length > 0 ? (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-primary)]"
                >
                  <img
                    src={asset.assetUrl}
                    alt={asset.name || ''}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => window.open(asset.assetUrl, '_blank')}
                  />
                  
                  {/* Tag badge */}
                  {asset.tag && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500/80 rounded text-xs">
                      {asset.tag}
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAsset(asset.id);
                        setNewTag(asset.tag || '');
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="Add/Edit Tag"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <a
                      href={asset.assetUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {/* Tag edit modal */}
                  {editingAsset === asset.id && (
                    <div 
                      className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Enter tag..."
                        className="w-full px-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm outline-none focus:border-cyan-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateTag(asset.id, newTag.trim());
                          } else if (e.key === 'Escape') {
                            setEditingAsset(null);
                            setNewTag('');
                          }
                        }}
                      />
                      <div className="flex gap-1 mt-2 w-full">
                        <button
                          onClick={() => {
                            setEditingAsset(null);
                            setNewTag('');
                          }}
                          className="flex-1 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateTag(asset.id, newTag.trim())}
                          className="flex-1 px-2 py-1 bg-cyan-500 hover:bg-cyan-600 rounded text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              {selectedTag ? `No assets with tag "${selectedTag}"` : 'No assets in this project yet'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Generation Modal Component - Split Panel Layout
// Category options for publishing
const PUBLISH_CATEGORIES = [
  { id: 'anime', label: 'Anime' },
  { id: 'realistic', label: 'Realistic' },
  { id: 'game', label: 'Game/Fantasy' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'nature', label: 'Nature' },
  { id: 'scifi', label: 'Sci-Fi' },
  { id: 'art', label: 'Art' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'food', label: 'Food' },
  { id: 'other', label: 'Other' }
];

function GenerationModal({ generation, onClose, onDelete, onUseAsReference, onRemix, onAnimate, onUpscale, models, projects = [], onSaveToProject, onPrev, onNext, hasPrev = false, hasNext = false }) {
  const [copied, setCopied] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [savingToProject, setSavingToProject] = useState(false);
  
  const canUpscale = generation?.status === 'completed' && generation?.result && (generation?.type === 'image' || generation?.type === 'video');
  
  // Publish state
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishCategory, setPublishCategory] = useState('');
  const [publishNsfw, setPublishNsfw] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  
  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Variation state
  const [isCreatingVariation, setIsCreatingVariation] = useState(false);
  const [variationType, setVariationType] = useState(null);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        onPrev?.();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);
  
  // Auto-detect category from prompt
  const detectCategory = (prompt) => {
    if (!prompt) return 'other';
    const lower = prompt.toLowerCase();
    const categoryKeywords = {
      anime: ['anime', 'manga', 'chibi', 'waifu', 'kawaii'],
      realistic: ['realistic', 'photorealistic', 'photography', 'portrait', 'cinematic'],
      game: ['game', 'rpg', 'fantasy', 'character design', 'concept art'],
      abstract: ['abstract', 'surreal', 'psychedelic', 'geometric'],
      nature: ['landscape', 'nature', 'forest', 'ocean', 'mountains'],
      scifi: ['sci-fi', 'cyberpunk', 'futuristic', 'robot', 'spaceship'],
      art: ['oil painting', 'watercolor', 'digital art', 'illustration'],
      portrait: ['portrait', 'headshot', 'face', 'person'],
      architecture: ['building', 'architecture', 'city', 'urban'],
      food: ['food', 'dish', 'meal', 'cuisine']
    };
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => lower.includes(kw))) return cat;
    }
    return 'other';
  };
  
  // Initialize publish category when dialog opens
  const openPublishDialog = () => {
    setPublishCategory(detectCategory(generation.prompt));
    setPublishTitle('');
    setPublishNsfw(false);
    setPublishSuccess(false);
    setShowPublishDialog(true);
  };
  
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const token = localStorage.getItem('userToken');
      await axios.post(`${API_BASE}/community/publish`, {
        generationId: generation.id,
        title: publishTitle || null,
        category: publishCategory,
        isNsfw: publishNsfw
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPublishSuccess(true);
      setTimeout(() => {
        setShowPublishDialog(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to publish:', err);
      alert(err.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };
  
  const handleSaveToProject = async (projectId) => {
    setSavingToProject(true);
    try {
      const result = await onSaveToProject?.(projectId);
      if (result?.success) {
        setShowProjectSelect(false);
      }
    } catch (err) {
      console.error('Failed to save to project:', err);
    } finally {
      setSavingToProject(false);
    }
  };
  
  // Share handlers
  const handleOpenShareDialog = () => {
    setShareData(null);
    setShareAllowDownload(true);
    setShareCopied(false);
    setShowShareDialog(true);
  };
  
  const handleCreateShare = async () => {
    setShareLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(`${API_BASE}/share`, {
        generationId: generation.id,
        allowDownload: shareAllowDownload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareData(response.data);
    } catch (err) {
      console.error('Failed to create share:', err);
      alert(err.response?.data?.error || 'Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };
  
  const handleCopyShareLink = () => {
    if (shareData?.shareUrl) {
      const shareUrl = `${window.location.origin}/share/${shareData.shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };
  
  // Create variation with GPT-4o
  const handleCreateVariation = async (type) => {
    setIsCreatingVariation(true);
    setVariationType(type);
    
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(`${API_BASE}/enhance-prompt`, {
        prompt: generation.prompt,
        imageUrls: [generation.result],
        variationType: type === 'subtle' ? 'slight_variation' : 'strong_variation'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Set up the variation - this will be passed back to parent
      if (onRemix) {
        // Use enhanced prompt with original image as reference
        onRemix({
          ...generation,
          prompt: response.data.enhancedPrompt
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert(err.response?.data?.error || 'Failed to create variation');
    } finally {
      setIsCreatingVariation(false);
      setVariationType(null);
    }
  };
  
  // Parse options from generation
  const options = (() => {
    try {
      return typeof generation.options === 'string' ? JSON.parse(generation.options) : (generation.options || {});
    } catch {
      return {};
    }
  })();
  
  // Calculate generation time
  const generationTime = (() => {
    if (generation.startedAt && generation.completedAt) {
      const start = new Date(generation.startedAt);
      const end = new Date(generation.completedAt);
      const diffMs = end - start;
      if (diffMs < 1000) return `${diffMs}ms`;
      if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
      return `${Math.floor(diffMs / 60000)}m ${Math.round((diffMs % 60000) / 1000)}s`;
    }
    return null;
  })();
  
  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generation.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleAnimate = () => {
    if (onAnimate) {
      onAnimate(generation.result);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - top right of modal */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-30 p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-colors backdrop-blur-sm"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            className="absolute right-[400px] top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-colors backdrop-blur-sm"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        
        {/* Left Panel - Media Display */}
        <div className="flex-1 relative bg-black flex items-center justify-center min-w-0">
          
          {/* Media content */}
          {generation.status === 'completed' && generation.result && (
            <>
              {generation.type === 'image' && (
                <img 
                  src={generation.result} 
                  alt="" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {generation.type === 'video' && (
                <video 
                  src={generation.result} 
                  controls 
                  autoPlay 
                  loop 
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {generation.type === 'chat' && (
                <div className="bg-[var(--bg-primary)] rounded-xl p-6 m-4 max-w-2xl max-h-full overflow-y-auto whitespace-pre-wrap">
                  {generation.result}
                </div>
              )}
            </>
          )}
          
          {generation.status === 'pending' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
              <p className="text-[var(--text-muted)]">Generating...</p>
            </div>
          )}
          
          {generation.status === 'failed' && (
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div>
                <p className="text-red-400 font-medium text-lg mb-2">
                  {generation.errorType === 'content_violation' ? 'Content Policy Violation' :
                   generation.errorType === 'timeout' ? 'Generation Timed Out' :
                   generation.errorType === 'rate_limit' ? 'Rate Limit Exceeded' :
                   'Generation Failed'}
                </p>
                <p className="text-[var(--text-muted)] text-sm">{generation.error || 'An error occurred'}</p>
                <p className="text-green-400 text-xs mt-3">Credits have been refunded</p>
              </div>
            </div>
          )}
          
        </div>
        
        {/* Right Panel - Details & Actions */}
        <div className="w-[380px] border-l border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs bg-gradient-to-r ${TYPE_COLORS[generation.type]} text-white`}>
                {generation.type}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                generation.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                generation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {generation.status}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{new Date(generation.startedAt).toLocaleString()}</p>
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Save & Share Section */}
            <CollapsibleSection title="Save & Share" icon={Share2} defaultOpen={true}>
              <div className="space-y-3">
                {/* Save to Project */}
                <div className="relative">
                  <button 
                    onClick={() => setShowProjectSelect(!showProjectSelect)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FolderPlus className="w-4 h-4" />
                      Save to Project
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showProjectSelect ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showProjectSelect && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
                      >
                        {projects.length > 0 ? (
                          projects.map(project => (
                            <button
                              key={project.id}
                              onClick={() => handleSaveToProject(project.id)}
                              disabled={savingToProject}
                              className="w-full px-3 py-2 hover:bg-[var(--card-hover)] text-left text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: project.color }}
                              />
                              {project.name}
                              {savingToProject && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No projects yet</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={generation.result}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button 
                    onClick={handleOpenShareDialog}
                    className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {canUpscale && (
                    <button 
                      onClick={() => onUpscale?.(generation)}
                      className="px-3 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Upscale
                    </button>
                  )}
                  {generation.type === 'image' && (
                    <>
                      <button 
                        onClick={handleAnimate}
                        className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Film className="w-4 h-4" />
                        Animate
                      </button>
                      <button 
                        onClick={openPublishDialog}
                        className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CollapsibleSection>
            
            {/* Generation Details Section */}
            <CollapsibleSection title="Generation Details" icon={Sparkles} defaultOpen={true}>
              <div className="space-y-4">
                {/* Quick actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onRemix?.(generation)}
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reuse Settings
                  </button>
                  <button
                    onClick={() => onUseAsReference?.(generation.result)}
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Use Image
                  </button>
                </div>
                
                {/* Model */}
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Model</p>
                  <p className="text-cyan-400 font-medium">{generation.modelName}</p>
                </div>
                
                {/* Prompt with copy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[var(--text-muted)]">Prompt</p>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Copy prompt"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    </button>
                  </div>
                  <p className="text-sm bg-[var(--bg-primary)] rounded-lg p-3 line-clamp-3">{generation.prompt}</p>
                  {generation.prompt.length > 150 && (
                    <button className="text-xs text-cyan-400 mt-1 hover:underline">Show more</button>
                  )}
                </div>
                
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {options.seed && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Seed</p>
                      <p className="font-mono">{options.seed}</p>
                    </div>
                  )}
                  {(options.width || options.image_size) && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Size</p>
                      <p className="font-mono">{options.width ? `${options.width}×${options.height}` : options.image_size}</p>
                    </div>
                  )}
                  {options.aspect_ratio && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Aspect Ratio</p>
                      <p className="font-mono">{options.aspect_ratio}</p>
                    </div>
                  )}
                  {generationTime && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Generation Time</p>
                      <p className="font-mono">{generationTime}</p>
                    </div>
                  )}
                  <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                    <p className="text-xs text-[var(--text-muted)]">Credits</p>
                    <p className="font-mono text-cyan-400">${generation.credits?.toFixed(4)}</p>
                  </div>
                </div>
                
                {/* Show all options toggle */}
                {Object.keys(options).length > 4 && (
                  <button
                    onClick={() => setShowAllOptions(!showAllOptions)}
                    className="w-full py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-muted)] transition-colors"
                  >
                    {showAllOptions ? 'Hide Options' : 'Show All Options'}
                  </button>
                )}
                
                {showAllOptions && (
                  <div className="bg-[var(--bg-primary)] rounded-lg p-3 text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(options, null, 2)}</pre>
                  </div>
                )}
              </div>
            </CollapsibleSection>
            
            {/* Reference Images Section */}
            {options.inputImages && options.inputImages.length > 0 && (
              <CollapsibleSection title="Reference Images" icon={ImagePlus} defaultOpen={true}>
                <div className="grid grid-cols-3 gap-2">
                  {options.inputImages.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Reference ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-[var(--border-color)]"
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}
            
            {/* Upscale Section - Images only */}
            {generation.type === 'image' && generation.status === 'completed' && (
              <CollapsibleSection title="Upscale" icon={Maximize2} defaultOpen={false}>
                <div className="space-y-3">
                  <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500">
                    <option value="">Choose Upscale Mode</option>
                    <option value="2x">2x Upscale</option>
                    <option value="4x">4x Upscale</option>
                    <option value="creative">Creative Upscale</option>
                  </select>
                  <button className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border border-[var(--border-color)]">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Ultimate Upscale
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                </div>
              </CollapsibleSection>
            )}
            
            {/* Create Variations Section - Images only */}
            {generation.type === 'image' && generation.status === 'completed' && (
              <CollapsibleSection title="Create Variations" icon={Wand2} defaultOpen={false}>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Use GPT-4o Vision to generate a variation prompt based on this image. (~0.01 credits)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCreateVariation('subtle')}
                    disabled={isCreatingVariation}
                    className="px-3 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors border border-[var(--border-color)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingVariation && variationType === 'subtle' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Subtle Variation
                  </button>
                  <button
                    onClick={() => handleCreateVariation('strong')}
                    disabled={isCreatingVariation}
                    className="px-3 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors border border-[var(--border-color)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingVariation && variationType === 'strong' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Strong Variation
                  </button>
                </div>
              </CollapsibleSection>
            )}
          </div>
          
          {/* Bottom action bar */}
          <div className="p-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => onDelete(generation.id)}
              className="w-full py-2.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Generation
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Publish Dialog */}
      <AnimatePresence>
        {showPublishDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
            onClick={() => setShowPublishDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {publishSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Published!</h3>
                  <p className="text-[var(--text-muted)]">Your creation is now live in the community gallery</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Publish to Community
                    </h3>
                    <button
                      onClick={() => setShowPublishDialog(false)}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Preview */}
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={generation.thumbnailUrl || generation.result}
                      alt=""
                      className="w-full aspect-video object-cover"
                    />
                  </div>
                  
                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Title (optional)</label>
                    <input
                      type="text"
                      value={publishTitle}
                      onChange={(e) => setPublishTitle(e.target.value)}
                      placeholder="Give your creation a title..."
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  
                  {/* Category */}
                  <div className="mb-4">
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PUBLISH_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setPublishCategory(cat.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            publishCategory === cat.id
                              ? 'bg-purple-500 text-white'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* NSFW toggle */}
                  <div className="mb-6 flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Contains mature content</p>
                      <p className="text-xs text-[var(--text-muted)]">Mark as NSFW if applicable</p>
                    </div>
                    <button
                      onClick={() => setPublishNsfw(!publishNsfw)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        publishNsfw ? 'bg-red-500' : 'bg-[var(--border-color)]'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        publishNsfw ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                  
                  {/* Privacy notice */}
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-300">
                      Your anonymous nickname will be shown. Your real name and email are never displayed.
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPublishDialog(false)}
                      className="flex-1 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {publishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Publish
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Share Dialog */}
      <AnimatePresence>
        {showShareDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
            onClick={() => setShowShareDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                Share Generation
              </h3>
              
              {/* Preview */}
              <div className="rounded-xl overflow-hidden mb-4 bg-[var(--bg-primary)]">
                {generation.type === 'image' ? (
                  <img 
                    src={generation.thumbnailUrl || generation.result} 
                    alt="" 
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <video 
                    src={generation.result} 
                    className="w-full aspect-video object-cover" 
                    controls 
                  />
                )}
              </div>
              
              {!shareData ? (
                <>
                  {/* Options */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-xl">
                      <div>
                        <p className="font-medium text-sm">Allow Download</p>
                        <p className="text-xs text-[var(--text-muted)]">Viewers can download the original file</p>
                      </div>
                      <button
                        onClick={() => setShareAllowDownload(!shareAllowDownload)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          shareAllowDownload ? 'bg-cyan-500' : 'bg-[var(--border-color)]'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          shareAllowDownload ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowShareDialog(false)}
                      className="flex-1 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateShare}
                      disabled={shareLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {shareLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="w-5 h-5" />
                          Create Link
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Share link generated */}
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--bg-primary)] rounded-xl">
                      <p className="text-xs text-[var(--text-muted)] mb-2">Share Link</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/share/${shareData.shareToken}`}
                          className="flex-1 bg-transparent text-sm font-mono truncate outline-none"
                        />
                        <button
                          onClick={handleCopyShareLink}
                          className="p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg transition-colors"
                        >
                          {shareCopied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[var(--text-muted)] text-center">
                      {shareData.allowDownload 
                        ? 'Anyone with the link can view and download' 
                        : 'Anyone with the link can view (no download)'}
                    </p>
                    
                    <button
                      onClick={() => setShowShareDialog(false)}
                      className="w-full py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
