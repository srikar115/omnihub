'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Video,
  MessageSquare,
  ChevronRight,
  Wand2,
  Mic,
  Subtitles,
  ImagePlus,
  Palette,
  Image,
  Clock,
  TrendingUp,
  Zap,
  Play,
  Loader2,
  Eraser,
  Layers,
} from 'lucide-react';
import { useDashboard } from './layout';
import { CreatorBar } from '@/components/creator';
import { GenerationModal } from '@/components/shared';

const TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  chat: MessageSquare,
};

// Helper to safely convert to number (handles strings from PostgreSQL DECIMAL)
const toNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

const API_BASE = '/api';

interface AiTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  backgroundImage?: string;
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
  imageInput?: 'optional' | 'required' | 'none';
  options?: Record<string, any>;
}

// Import Generation type from shared component
import type { Generation } from '@/components/shared/GenerationCard';

interface Stats {
  totalGenerations: number;
  totalImages: number;
  totalVideos: number;
  totalChats: number;
}

interface WeekStats {
  totalRequests: number;
  tokensUsed: number;
  creditsUsed: number;
}

interface ModelUsage {
  name: string;
  count: number;
}

const defaultAiTools: AiTool[] = [
  { 
    id: 'chat-arena', 
    name: 'Chat Arena', 
    description: 'Compare responses from multiple AI models side by side', 
    icon: 'MessageSquare', 
    color: 'from-purple-500 to-indigo-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop',
  },
  { 
    id: 'chat-edit-image', 
    name: 'Chat To Edit Image', 
    description: 'Use natural language to edit and transform your images', 
    icon: 'Wand2', 
    color: 'from-cyan-500 to-blue-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=200&fit=crop',
  },
  { 
    id: 'chat-edit-video', 
    name: 'Chat To Edit Video', 
    description: 'Edit videos using conversational AI commands', 
    icon: 'Video', 
    color: 'from-pink-500 to-rose-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=200&fit=crop',
  },
  { 
    id: 'lip-sync', 
    name: 'Lip Sync', 
    description: 'Sync lips to any audio track automatically', 
    icon: 'Mic', 
    color: 'from-orange-500 to-red-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=200&fit=crop',
  },
  { 
    id: 'video-bg-remove', 
    name: 'Video Background...', 
    description: 'Remove or replace video backgrounds instantly', 
    icon: 'Eraser', 
    color: 'from-teal-500 to-cyan-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=200&fit=crop',
  },
  { 
    id: 'auto-subtitle', 
    name: 'Auto Subtitle', 
    description: 'Generate accurate subtitles automatically', 
    icon: 'Subtitles', 
    color: 'from-green-500 to-emerald-600', 
    badge: 'New',
    backgroundImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=200&fit=crop',
  },
  { 
    id: 'old-photo', 
    name: 'Old Photo Restoration', 
    description: 'Turn old, worn-out photos into crisp, clear, high-quality images', 
    icon: 'Palette', 
    color: 'from-amber-500 to-orange-600', 
    badge: 'Save',
    backgroundImage: 'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=400&h=200&fit=crop',
  },
  { 
    id: 'image-upscale', 
    name: 'Image Upscale', 
    description: 'Transform low or medium resolution images into high resolution', 
    icon: 'ImagePlus', 
    color: 'from-violet-500 to-purple-600', 
    badge: 'Save',
    backgroundImage: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=400&h=200&fit=crop',
  },
];

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Wand2,
  Video,
  Mic,
  Subtitles,
  ImagePlus,
  Palette,
  Eraser,
  Image,
  Layers,
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, updateUserCredits, showAuthModal, activeWorkspace } = useDashboard();

  // Creator bar state
  const [prompt, setPrompt] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [generationType, setGenerationType] = useState('image');
  const [models, setModels] = useState<Record<string, Model[]>>({ image: [], video: [], chat: [] });
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [multiModelMode, setMultiModelMode] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [numImages, setNumImages] = useState(1);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [pricingSettings, setPricingSettings] = useState({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
  });
  
  // Dashboard data state
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalGenerations: 0,
    totalImages: 0,
    totalVideos: 0,
    totalChats: 0,
  });
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [aiTools] = useState<AiTool[]>(defaultAiTools);
  const [weekStats, setWeekStats] = useState<WeekStats>({
    totalRequests: 0,
    tokensUsed: 0,
    creditsUsed: 0,
  });

  useEffect(() => {
    fetchModels();
    fetchPricingSettings();
  }, []);

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

  // Define fetch functions before useEffect that uses them
  const fetchRecentGenerations = useCallback(async () => {
    const currentWorkspaceId = activeWorkspace?.id;
    if (!currentWorkspaceId) return; // Don't fetch without workspace ID
    
    setLoadingGenerations(true);
    try {
      // Always pass workspaceId to filter by active workspace
      const workspaceParam = `&workspaceId=${currentWorkspaceId}`;
      const response = await fetch(`${API_BASE}/generations?limit=8${workspaceParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` },
      });
      const data = await response.json();
      const generations = Array.isArray(data) ? data : (data.generations || []);
      setRecentGenerations(generations);
    } catch (err) {
      console.error('Failed to fetch recent generations:', err);
      setRecentGenerations([]);
    } finally {
      setLoadingGenerations(false);
    }
  }, [activeWorkspace?.id]);

  const fetchStats = useCallback(async () => {
    const currentWorkspaceId = activeWorkspace?.id;
    if (!currentWorkspaceId) return; // Don't fetch without workspace ID
    
    try {
      // Always pass workspaceId to filter by active workspace
      const workspaceParam = `&workspaceId=${currentWorkspaceId}`;
      const response = await fetch(`${API_BASE}/generations?limit=1000${workspaceParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` },
      });
      
      const data = await response.json();
      const generations = Array.isArray(data) ? data : (data.generations || []);
      const counts = data.counts || {};
      
      const totalImages = counts.image || generations.filter((g: Generation) => g.type === 'image').length;
      const totalVideos = counts.video || generations.filter((g: Generation) => g.type === 'video').length;
      const totalChats = counts.chat || generations.filter((g: Generation) => g.type === 'chat').length;
      
      setStats({
        totalGenerations: generations.length,
        totalImages,
        totalVideos,
        totalChats,
      });
      
      const modelCounts: Record<string, number> = {};
      generations.forEach((g: Generation) => {
        const modelName = g.modelName || 'Unknown';
        modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
      });
      const sortedModels = Object.entries(modelCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setModelUsage(sortedModels);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekGenerations = generations.filter((g: Generation) => {
        const genDate = new Date(g.startedAt || '');
        return genDate > oneWeekAgo;
      });
      
      const creditsUsed = weekGenerations.reduce((sum: number, g: Generation) => sum + (g.credits || 0), 0);
      
      setWeekStats({
        totalRequests: weekGenerations.length,
        tokensUsed: 0,
        creditsUsed: creditsUsed,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [activeWorkspace?.id]);
  
  useEffect(() => {
    // Only fetch when both user and activeWorkspace are available
    if (user && activeWorkspace) {
      fetchRecentGenerations();
      fetchStats();
    }
  }, [user, activeWorkspace, fetchRecentGenerations, fetchStats]);

  useEffect(() => {
    if (models[generationType]?.length > 0) {
      setSelectedModel(models[generationType][0]);
      setSelectedOptions({});
    }
  }, [generationType, models]);

  useEffect(() => {
    if (multiModelMode ? selectedModels.length > 0 : selectedModel) {
      calculateModelPrice();
    } else {
      setCalculatedPrice(0);
    }
  }, [selectedModel, selectedModels, multiModelMode, selectedOptions, numImages, generationType, pricingSettings]);

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`);
      const data = await response.json();
      const modelsByType: Record<string, Model[]> = { image: [], video: [], chat: [] };
      data.forEach((model: Model) => {
        if (modelsByType[model.type]) {
          modelsByType[model.type].push(model);
        }
      });
      setModels(modelsByType);
      if (modelsByType.image?.length > 0) {
        setSelectedModel(modelsByType.image[0]);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const calculateModelPrice = () => {
    if (multiModelMode) {
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
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      showAuthModal();
      return;
    }

    if (!prompt.trim() && generationType !== 'chat') {
      alert('Please enter a prompt');
      return;
    }

    const token = localStorage.getItem('userToken');
    
    try {
      const payload = {
        prompt: prompt.trim(),
        modelId: multiModelMode 
          ? selectedModels.map(m => m.id)
          : selectedModel?.id,
        type: generationType,
        options: { [selectedModel?.id || '']: selectedOptions },
        numImages: generationType === 'image' ? numImages : 1,
        inputImages: inputImages,
        workspaceId: activeWorkspace?.id,
      };

      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.newCredits !== undefined) {
        updateUserCredits(data.newCredits);
      }

      router.push('/dashboard/generate');
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Generation failed');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Greeting */}
        <div className="px-8 pt-6 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Creator'} 👋
            </h1>
            {user && (
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                <span className="text-cyan-400 font-medium">{toNumber(user.credits).toFixed(2)}</span> credits remaining
              </p>
            )}
          </motion.div>
        </div>

        {/* Creator Bar */}
        <div className="px-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
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
              onGenerate={handleGenerate}
              showAuthModal={showAuthModal}
              fixed={false}
              generations={[]}
              uploadHistory={[]}
              projects={[]}
            />
          </motion.div>
        </div>

        {/* Top AI Tools */}
        <div className="px-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Top AI Tools</h3>
              </div>
              <button 
                onClick={() => router.push('/tools')}
                className="text-sm text-[var(--text-secondary)] hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {aiTools.slice(0, 8).map((tool, index) => {
                const IconComponent = iconMap[tool.icon] || Sparkles;
                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="flex-shrink-0 w-[180px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden cursor-pointer group hover:border-cyan-500/50 transition-all"
                    onClick={() => router.push(`/tools/${tool.id}`)}
                  >
                    <div className="h-28 relative overflow-hidden">
                      {tool.backgroundImage ? (
                        <img 
                          src={tool.backgroundImage} 
                          alt={tool.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${tool.color}`} />
                      )}
                      
                      <div className={`absolute inset-0 bg-gradient-to-t ${tool.color} opacity-60`} />
                      
                      {tool.badge && (
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                          tool.badge === 'New' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                      
                      <div className="absolute bottom-3 left-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="flex items-center gap-1">
                        <IconComponent className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{tool.name}</p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">{tool.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Stats Cards Row */}
        {user && (
          <div className="px-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalGenerations}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Total Generations</p>
                </div>
              </div>
              
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                  <Image className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalImages}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Images Created</p>
                </div>
              </div>
              
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center">
                  <Video className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalVideos}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Videos Created</p>
                </div>
              </div>
              
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalChats}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Chat Sessions</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Most Used Models */}
        {user && modelUsage.length > 0 && (
          <div className="px-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Most Used Models</h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {modelUsage.slice(0, 4).map((model, index) => (
                  <div
                    key={model.name}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 hover:border-cyan-500/50 transition-all cursor-pointer"
                    onClick={() => router.push('/dashboard/generate')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium truncate flex-1 text-[var(--text-primary)]">{model.name}</p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{model.count} generations</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Recent Generations */}
        {user && (
          <div className="px-8 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Generations</h3>
                </div>
                <button 
                  onClick={() => router.push('/dashboard/generate')}
                  className="text-sm text-[var(--text-secondary)] hover:text-cyan-400 flex items-center gap-1 transition-colors"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {loadingGenerations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : recentGenerations.length === 0 ? (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center">
                  <Sparkles className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)] mb-2">No generations yet</p>
                  <p className="text-sm text-[var(--text-muted)]">Create your first AI masterpiece above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {recentGenerations.map((generation) => {
                    const Icon = TYPE_ICONS[generation.type] || Image;
                    const isCompleted = generation.status === 'completed';
                    const hasImageResult = generation.type === 'image' 
                      ? (generation.thumbnailUrl || generation.result)
                      : generation.thumbnailUrl;
                    const hasResult = isCompleted && (hasImageResult || generation.result);
                    
                    return (
                      <motion.div
                        key={generation.id}
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-square bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden cursor-pointer group hover:border-cyan-500/50 transition-all"
                        onClick={() => {
                          if (isCompleted && hasResult) {
                            setSelectedGeneration(generation);
                          } else {
                            router.push('/dashboard/generate');
                          }
                        }}
                      >
                        {hasResult ? (
                          <>
                            {generation.type === 'video' ? (
                              <div className="relative w-full h-full">
                                {generation.thumbnailUrl ? (
                                  <img 
                                    src={generation.thumbnailUrl} 
                                    alt={generation.prompt || ''}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-600/20">
                                    <Video className="w-12 h-12 text-pink-400 mb-2" />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Play className="w-5 h-5 text-white fill-white" />
                                  </div>
                                </div>
                              </div>
                            ) : generation.type === 'chat' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-600/20 p-4">
                                <MessageSquare className="w-10 h-10 text-emerald-400 mb-2" />
                                <p className="text-xs text-[var(--text-primary)] text-center line-clamp-3">{generation.prompt?.slice(0, 80)}...</p>
                              </div>
                            ) : (
                              <img 
                                src={generation.thumbnailUrl || generation.result} 
                                alt={generation.prompt || ''}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
                              generation.type === 'video' ? 'bg-pink-500 text-white' : 
                              generation.type === 'image' ? 'bg-purple-500 text-white' :
                              'bg-green-500 text-white'
                            }`}>
                              {generation.type}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white text-xs line-clamp-2">{generation.prompt}</p>
                                <p className="text-white/60 text-xs mt-1">{generation.modelName}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-tertiary)]">
                            {generation.status === 'pending' || generation.status === 'processing' ? (
                              <>
                                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
                                <p className="text-xs text-[var(--text-secondary)]">Generating...</p>
                              </>
                            ) : generation.status === 'failed' ? (
                              <>
                                <Icon className="w-8 h-8 text-red-400 mb-2" />
                                <p className="text-xs text-red-400">Failed</p>
                              </>
                            ) : (
                              <>
                                <Icon className="w-8 h-8 text-[var(--text-secondary)] mb-2" />
                                <p className="text-xs text-[var(--text-secondary)]">{generation.status}</p>
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Stats */}
      {user && (
        <div className="hidden xl:block w-72 border-l border-[var(--border-color)] bg-[var(--bg-primary)] p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* This Week Stats */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">This Week</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Total Requests</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{weekStats.totalRequests}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Images Created</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalImages}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Videos Created</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalVideos}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-color)]" />

            {/* Top Models */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Top Models</h4>
              </div>
              
              {modelUsage.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {modelUsage.slice(0, 4).map((model, index) => (
                    <div key={model.name} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                        'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{model.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{model.count} generations</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-color)]" />

            {/* Credits Used */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Credits Used</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">This Week</p>
                  <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((weekStats.creditsUsed / Math.max(user?.credits || 100, 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-lg font-bold text-cyan-400 mt-2">{toNumber(weekStats.creditsUsed).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Remaining Balance</p>
                  <p className="text-lg font-bold text-green-400">{toNumber(user?.credits).toFixed(2)} credits</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4">
              <button
                onClick={() => router.push('/dashboard/generate')}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Create New
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Generation Modal */}
      <AnimatePresence>
        {selectedGeneration && (
          <GenerationModal
            generation={selectedGeneration}
            onClose={() => setSelectedGeneration(null)}
            onDelete={async (id) => {
              try {
                const token = localStorage.getItem('userToken');
                await fetch(`${API_BASE}/generations/${id}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                });
                setRecentGenerations(prev => prev.filter(g => g.id !== id));
                setSelectedGeneration(null);
              } catch (err) {
                console.error('Delete failed:', err);
              }
            }}
            hasPrev={recentGenerations.findIndex(g => g.id === selectedGeneration.id) > 0}
            hasNext={recentGenerations.findIndex(g => g.id === selectedGeneration.id) < recentGenerations.length - 1}
            onPrev={() => {
              const idx = recentGenerations.findIndex(g => g.id === selectedGeneration.id);
              if (idx > 0) setSelectedGeneration(recentGenerations[idx - 1]);
            }}
            onNext={() => {
              const idx = recentGenerations.findIndex(g => g.id === selectedGeneration.id);
              if (idx < recentGenerations.length - 1) setSelectedGeneration(recentGenerations[idx + 1]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
