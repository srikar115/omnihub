import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Layers, LayoutDashboard, Users, CreditCard, Settings,
  TrendingUp, DollarSign, Zap, Image, Video, MessageSquare,
  ChevronRight, LogOut, Save, Plus, Trash2, Edit2, Check, X,
  BarChart3, Activity, Clock, Globe, ToggleLeft, ToggleRight,
  Eye, Calculator, ChevronDown, ChevronUp, Info, Sparkles,
  ExternalLink, RefreshCw, AlertTriangle, Calendar, ArrowUp, ArrowDown,
  Heart, ImageIcon, Star
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_BASE = 'http://localhost:3001/api';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'rate-limits', label: 'Rate Limits', icon: Activity },
  { id: 'models', label: 'Model Pricing', icon: Settings },
  { id: 'feature-flags', label: 'Feature Flags', icon: ToggleRight },
  { id: 'ai-tools', label: 'AI Tools', icon: Zap },
  { id: 'landing-featured', label: 'Featured Content', icon: Sparkles },
  { id: 'community-gallery', label: 'Community Gallery', icon: Image },
  { id: 'landing-models', label: 'Landing Models', icon: Globe },
  { id: 'announcements', label: 'Announcements', icon: Globe },
  { id: 'audit-logs', label: 'Audit Logs', icon: Clock },
  { id: 'error-logs', label: 'Error Logs', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    openrouterApiKey: '',
    falApiKey: '',
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    freeCredits: 100,
    creditPrice: 1.00,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, modelsRes, usersRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/models`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/users`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/settings`, getAuthHeaders()),
      ]);
      
      setStats(statsRes.data);
      setModels(modelsRes.data);
      setUsers(usersRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put(`${API_BASE}/admin/settings`, settings, getAuthHeaders());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleUpdateModel = async (modelId, updates) => {
    try {
      await axios.put(`${API_BASE}/admin/models/${modelId}`, updates, getAuthHeaders());
      setModels(models.map(m => m.id === modelId ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('Failed to update model:', err);
    }
  };

  const handleUpdateUserCredits = async (userId, credits) => {
    try {
      await axios.put(`${API_BASE}/admin/users/${userId}/credits`, { credits }, getAuthHeaders());
      setUsers(users.map(u => u.id === userId ? { ...u, credits } : u));
    } catch (err) {
      console.error('Failed to update user credits:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-omni-accent/30 border-t-omni-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 glass-strong border-r border-omni-border/50 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b border-omni-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 p-[2px]">
                <div className="w-full h-full rounded-xl bg-omni-deep flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold gradient-text">OmniHub</h1>
              <p className="text-xs text-omni-muted">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-gradient-to-r from-omni-accent/20 to-transparent text-white border-l-2 border-omni-accent' 
                    : 'text-omni-muted hover:text-white hover:bg-omni-surface/50'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-omni-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-omni-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardTab key="dashboard" stats={stats} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab key="analytics" />
            )}
            {activeTab === 'models' && (
              <ModelsTab key="models" models={models} onUpdate={handleUpdateModel} />
            )}
            {activeTab === 'users' && (
              <UsersTab key="users" users={users} onUpdateCredits={handleUpdateUserCredits} />
            )}
            {activeTab === 'subscriptions' && (
              <SubscriptionsTab key="subscriptions" />
            )}
            {activeTab === 'rate-limits' && (
              <RateLimitsTab key="rate-limits" />
            )}
            {activeTab === 'feature-flags' && (
              <FeatureFlagsTab key="feature-flags" />
            )}
            {activeTab === 'ai-tools' && (
              <AiToolsTab key="ai-tools" />
            )}
            {activeTab === 'landing-featured' && (
              <LandingFeaturedTab key="landing-featured" />
            )}
            {activeTab === 'community-gallery' && (
              <CommunityGalleryTab key="community-gallery" />
            )}
            {activeTab === 'landing-models' && (
              <LandingModelsTab key="landing-models" />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsTab key="announcements" />
            )}
            {activeTab === 'audit-logs' && (
              <AuditLogsTab key="audit-logs" />
            )}
            {activeTab === 'error-logs' && (
              <ErrorLogsTab key="error-logs" />
            )}
            {activeTab === 'settings' && (
              <SettingsTab 
                key="settings" 
                settings={settings} 
                setSettings={setSettings}
                onSave={handleSaveSettings}
                saveStatus={saveStatus}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DashboardTab({ stats }) {
  const statCards = [
    { label: 'Total Revenue', value: `$${stats?.revenue?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Generations', value: stats?.totalGenerations || 0, icon: Activity, color: 'from-purple-500 to-violet-500' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: Users, color: 'from-cyan-500 to-blue-500' },
    { label: 'Credits Used', value: stats?.creditsUsed || 0, icon: Zap, color: 'from-yellow-500 to-orange-500' },
  ];

  const generationStats = [
    { label: 'Images', value: stats?.imageGenerations || 0, icon: Image, color: 'text-cyan-400' },
    { label: 'Videos', value: stats?.videoGenerations || 0, icon: Video, color: 'text-pink-400' },
    { label: 'Chats', value: stats?.chatGenerations || 0, icon: MessageSquare, color: 'text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
        <p className="text-omni-muted">Monitor your platform's performance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-display font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-omni-muted">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Generation breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-display font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-omni-accent" />
            Generation Breakdown
          </h3>
          <div className="space-y-4">
            {generationStats.map((stat) => {
              const Icon = stat.icon;
              const total = (stats?.imageGenerations || 0) + (stats?.videoGenerations || 0) + (stats?.chatGenerations || 0);
              const percentage = total > 0 ? (stat.value / total) * 100 : 0;
              
              return (
                <div key={stat.label} className="flex items-center gap-4">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stat.label}</span>
                      <span className="text-sm text-omni-muted">{stat.value}</span>
                    </div>
                    <div className="h-2 bg-omni-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className={`h-full rounded-full bg-gradient-to-r ${
                          stat.label === 'Images' ? 'from-cyan-500 to-blue-500' :
                          stat.label === 'Videos' ? 'from-pink-500 to-rose-500' :
                          'from-emerald-500 to-teal-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-display font-semibold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-omni-accent" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {stats?.recentActivity?.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-omni-surface/30 rounded-xl">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === 'image' ? 'bg-cyan-500/20 text-cyan-400' :
                    activity.type === 'video' ? 'bg-pink-500/20 text-pink-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {activity.type === 'image' ? <Image className="w-4 h-4" /> :
                     activity.type === 'video' ? <Video className="w-4 h-4" /> :
                     <MessageSquare className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.model}</p>
                    <p className="text-xs text-omni-muted">{activity.time}</p>
                  </div>
                  <span className="text-sm text-omni-muted">{activity.credits} credits</span>
                </div>
              ))
            ) : (
              <p className="text-omni-muted text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ModelsTab({ models, onUpdate }) {
  const [activeModelType, setActiveModelType] = useState('image');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [expandedModel, setExpandedModel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pricingStatus, setPricingStatus] = useState(null);
  const [refreshResult, setRefreshResult] = useState(null);
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);
  const [calculatorModel, setCalculatorModel] = useState(null);
  
  // Profit margin settings state
  const [profitSettings, setProfitSettings] = useState({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
    freeCredits: 10,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState(null);

  // Fetch pricing status and settings on mount
  useEffect(() => {
    fetchPricingStatus();
    fetchProfitSettings();
  }, []);

  const fetchProfitSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setProfitSettings({
        profitMargin: response.data.profitMargin || 0,
        profitMarginImage: response.data.profitMarginImage || 0,
        profitMarginVideo: response.data.profitMarginVideo || 0,
        profitMarginChat: response.data.profitMarginChat || 0,
        creditPrice: response.data.creditPrice || 1,
        freeCredits: response.data.freeCredits || 10,
      });
    } catch (err) {
      console.error('Failed to fetch profit settings:', err);
    }
  };

  const saveProfitSettings = async () => {
    setSavingSettings(true);
    setSettingsSaveStatus(null);
    try {
      await axios.put(`${API_BASE}/admin/settings`, profitSettings, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setSettingsSaveStatus('success');
      setTimeout(() => setSettingsSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save profit settings:', err);
      setSettingsSaveStatus('error');
      setTimeout(() => setSettingsSaveStatus(null), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchPricingStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/pricing-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setPricingStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch pricing status:', err);
    }
  };

  const handleRefreshPricing = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const response = await axios.post(`${API_BASE}/admin/refresh-pricing`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setRefreshResult({ success: true, message: response.data.message });
      fetchPricingStatus();
      // Trigger parent to refetch models
      if (onUpdate) {
        onUpdate(null, { _refresh: true });
      }
    } catch (err) {
      setRefreshResult({ success: false, message: err.response?.data?.error || 'Failed to refresh' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartEdit = (model, e) => {
    e.stopPropagation();
    setEditingId(model.id);
    setEditValue(model.credits.toString());
  };

  const handleSaveEdit = (modelId, e) => {
    e.stopPropagation();
    onUpdate(modelId, { credits: parseFloat(editValue) });
    setEditingId(null);
  };

  const handleToggleEnabled = (model, e) => {
    e.stopPropagation();
    onUpdate(model.id, { enabled: model.enabled ? 0 : 1 });
  };

  // Calculate user-facing credits with profit margin and credit conversion
  const calculateUserCredits = (model) => {
    const baseCost = model.baseCost || model.credits || 0;
    
    // Get the appropriate margin (type-specific or universal)
    let margin = profitSettings.profitMargin || 0;
    if (model.type === 'image' && profitSettings.profitMarginImage > 0) {
      margin = profitSettings.profitMarginImage;
    } else if (model.type === 'video' && profitSettings.profitMarginVideo > 0) {
      margin = profitSettings.profitMarginVideo;
    } else if (model.type === 'chat' && profitSettings.profitMarginChat > 0) {
      margin = profitSettings.profitMarginChat;
    }
    
    // Calculate final USD price with margin
    const finalUSD = baseCost * (1 + margin / 100);
    
    // Convert to credits (creditPrice is USD per credit, so divide)
    const creditPrice = profitSettings.creditPrice || 1;
    const userCredits = finalUSD / creditPrice;
    
    return {
      baseCost,
      margin,
      finalUSD,
      userCredits,
      creditPrice
    };
  };

  const groupedModels = {
    image: models.filter(m => m.type === 'image'),
    video: models.filter(m => m.type === 'video'),
    chat: models.filter(m => m.type === 'chat'),
  };

  const typeLabels = {
    image: { label: 'Image', icon: Image, color: 'from-cyan-500 to-blue-500', bgColor: 'bg-cyan-500' },
    video: { label: 'Video', icon: Video, color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-500' },
    chat: { label: 'Chat', icon: MessageSquare, color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-500' },
  };

  const currentModels = groupedModels[activeModelType] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Model Pricing</h1>
          <p className="text-omni-muted">Configure credit costs, enable/disable models, and view pricing details</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfitCalculator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-medium hover:from-green-400 hover:to-emerald-500 transition-all"
            >
              <Calculator className="w-4 h-4" />
              Profit Calculator
            </button>
            <button
              onClick={handleRefreshPricing}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-medium hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Pricing'}
            </button>
          </div>
          {pricingStatus?.lastGlobalCheck && (
            <p className="text-xs text-omni-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last checked: {new Date(pricingStatus.lastGlobalCheck).toLocaleDateString()} {new Date(pricingStatus.lastGlobalCheck).toLocaleTimeString()}
            </p>
          )}
          {refreshResult && (
            <p className={`text-xs flex items-center gap-1 ${refreshResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {refreshResult.success ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {refreshResult.message}
            </p>
          )}
        </div>
      </div>

      {/* Profit Margin Settings */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">Profit Margins</h3>
              <p className="text-xs text-gray-400">Configure your markup on API costs</p>
            </div>
          </div>
          <button
            onClick={saveProfitSettings}
            disabled={savingSettings}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              settingsSaveStatus === 'success' ? 'bg-green-500 text-white' :
              settingsSaveStatus === 'error' ? 'bg-red-500 text-white' :
              'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
            } disabled:opacity-50`}
          >
            {savingSettings ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : settingsSaveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : settingsSaveStatus === 'error' ? (
              <X className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savingSettings ? 'Saving...' : settingsSaveStatus === 'success' ? 'Saved!' : settingsSaveStatus === 'error' ? 'Failed' : 'Save'}
          </button>
        </div>
        
        <div className="grid grid-cols-6 gap-4">
          {/* Universal Margin */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Universal Margin (%)</label>
            <input
              type="number"
              value={profitSettings.profitMargin}
              onChange={(e) => setProfitSettings({ ...profitSettings, profitMargin: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-lg py-2 px-3 text-white font-mono text-center focus:border-green-500 outline-none transition-all"
              placeholder="0"
            />
          </div>
          
          {/* Image Margin */}
          <div>
            <label className="block text-xs font-medium text-cyan-400 mb-1.5 flex items-center gap-1">
              <Image className="w-3 h-3" /> Image
            </label>
            <input
              type="number"
              value={profitSettings.profitMarginImage}
              onChange={(e) => setProfitSettings({ ...profitSettings, profitMarginImage: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#1a1a25]/50 border border-cyan-500/30 rounded-lg py-2 px-3 text-white font-mono text-center focus:border-cyan-500 outline-none transition-all"
              placeholder="0"
            />
          </div>
          
          {/* Video Margin */}
          <div>
            <label className="block text-xs font-medium text-pink-400 mb-1.5 flex items-center gap-1">
              <Video className="w-3 h-3" /> Video
            </label>
            <input
              type="number"
              value={profitSettings.profitMarginVideo}
              onChange={(e) => setProfitSettings({ ...profitSettings, profitMarginVideo: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#1a1a25]/50 border border-pink-500/30 rounded-lg py-2 px-3 text-white font-mono text-center focus:border-pink-500 outline-none transition-all"
              placeholder="0"
            />
          </div>
          
          {/* Chat Margin */}
          <div>
            <label className="block text-xs font-medium text-emerald-400 mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Chat
            </label>
            <input
              type="number"
              value={profitSettings.profitMarginChat}
              onChange={(e) => setProfitSettings({ ...profitSettings, profitMarginChat: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#1a1a25]/50 border border-emerald-500/30 rounded-lg py-2 px-3 text-white font-mono text-center focus:border-emerald-500 outline-none transition-all"
              placeholder="0"
            />
          </div>
          
          {/* Credit Price */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-purple-400 mb-1.5">
              1 USD = how many credits?
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">$1 =</span>
              <input
                type="text"
                inputMode="decimal"
                value={profitSettings.creditPrice === 1 ? '1' : (1 / profitSettings.creditPrice).toFixed(0)}
                onChange={(e) => {
                  const credits = parseFloat(e.target.value);
                  if (!isNaN(credits) && credits > 0) {
                    setProfitSettings({ ...profitSettings, creditPrice: 1 / credits });
                  }
                }}
                className="w-20 bg-[#1a1a25]/50 border border-purple-500/30 rounded-lg py-2 px-3 text-white font-mono text-center focus:border-purple-500 outline-none transition-all"
                placeholder="1000"
              />
              <span className="text-gray-400 text-sm">credits</span>
              <span className="text-xs text-gray-500 ml-2">
                (1 credit = ${profitSettings.creditPrice?.toFixed(4) || '1.0000'})
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          <span className="text-cyan-400">Formula:</span> User Price = API Cost × (1 + Margin%/100) | 
          <span className="text-gray-400 ml-1">Type-specific margins override universal. Leave at 0 to use universal.</span>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 p-1 bg-omni-surface/50 rounded-xl w-fit">
        {Object.entries(typeLabels).map(([type, { label, icon: Icon, color }]) => {
          const isActive = activeModelType === type;
          const count = groupedModels[type]?.length || 0;
          const enabledCount = groupedModels[type]?.filter(m => m.enabled).length || 0;
          
          return (
            <button
              key={type}
              onClick={() => setActiveModelType(type)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all
                ${isActive 
                  ? `bg-gradient-to-r ${color} text-white shadow-lg` 
                  : 'text-omni-muted hover:text-white hover:bg-omni-surface'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-omni-surface'}`}>
                {enabledCount}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Models List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className={`px-6 py-4 bg-gradient-to-r ${typeLabels[activeModelType].color} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = typeLabels[activeModelType].icon;
              return <Icon className="w-5 h-5 text-white" />;
            })()}
            <h3 className="font-display font-semibold text-white">
              {typeLabels[activeModelType].label} Models
            </h3>
          </div>
          <span className="text-white/80 text-sm">
            {currentModels.filter(m => m.enabled).length} of {currentModels.length} enabled
          </span>
        </div>
        
        <div className="divide-y divide-omni-border/30">
          {currentModels.map((model) => (
            <div key={model.id}>
              {/* Model Row */}
              <div 
                className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-omni-surface/30 transition-colors ${!model.enabled ? 'opacity-50' : ''}`}
                onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={(e) => handleToggleEnabled(model, e)}
                    className={`p-1 rounded-lg transition-all ${model.enabled ? 'text-green-400 hover:bg-green-400/10' : 'text-gray-500 hover:bg-gray-500/10'}`}
                    title={model.enabled ? 'Disable model' : 'Enable model'}
                  >
                    {model.enabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                  
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {model.name}
                      {model.docUrl && (
                        <a
                          href={model.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-omni-muted hover:text-cyan-400 transition-colors"
                          title="View documentation"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {!model.enabled && <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">Disabled</span>}
                    </p>
                    <p className="text-sm text-omni-muted">{model.provider}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Base Cost */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Base:</span>
                    <span className="font-mono text-sm bg-gray-700/50 text-gray-200 px-2 py-1 rounded">
                      ${model.baseCost?.toFixed(4) || '0.0000'}
                    </span>
                  </div>
                  
                  {/* User Credits (calculated with margin) */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Credits:</span>
                    {editingId === model.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="0.0001"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 text-center font-mono text-white outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={(e) => handleSaveEdit(model.id, e)}
                          className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const calc = calculateUserCredits(model);
                          return (
                            <span 
                              className="font-mono bg-green-500/20 text-green-400 px-3 py-1 rounded-lg"
                              title={`Base: $${calc.baseCost.toFixed(4)} + ${calc.margin}% margin = $${calc.finalUSD.toFixed(4)} → ${calc.userCredits.toFixed(2)} credits`}
                            >
                              {calc.userCredits.toFixed(2)}
                            </span>
                          );
                        })()}
                        <button
                          onClick={(e) => handleStartEdit(model, e)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                          title="Edit base credits"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCalculatorModel(model); setShowProfitCalculator(true); }}
                          className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Calculate profit for this model"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand Button */}
                  <button className="p-1.5 text-omni-muted hover:text-white transition-colors">
                    {expandedModel === model.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Pricing Details */}
              <AnimatePresence>
                {expandedModel === model.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ModelPricingDetails model={model} modelType={activeModelType} onUpdate={onUpdate} profitSettings={profitSettings} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {currentModels.length === 0 && (
          <div className="py-12 text-center text-omni-muted">
            No {activeModelType} models found
          </div>
        )}
      </div>

      {/* Profit Calculator Modal */}
      <AnimatePresence>
        {showProfitCalculator && (
          <ProfitCalculatorModal 
            onClose={() => { setShowProfitCalculator(false); setCalculatorModel(null); }} 
            model={calculatorModel}
            profitSettings={profitSettings}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Profit Calculator Modal
function ProfitCalculatorModal({ onClose, model = null, profitSettings = {} }) {
  const [apiCost, setApiCost] = useState(model?.baseCost || 0.04);
  const [profitMargin, setProfitMargin] = useState(() => {
    if (model?.type === 'image' && profitSettings.profitMarginImage > 0) return profitSettings.profitMarginImage;
    if (model?.type === 'video' && profitSettings.profitMarginVideo > 0) return profitSettings.profitMarginVideo;
    if (model?.type === 'chat' && profitSettings.profitMarginChat > 0) return profitSettings.profitMarginChat;
    return profitSettings.profitMargin || 25;
  });
  const [creditPrice, setCreditPrice] = useState(profitSettings.creditPrice || 1);

  const finalPrice = apiCost * (1 + profitMargin / 100);
  const creditsCharged = finalPrice / creditPrice;
  const profitPerGeneration = finalPrice - apiCost;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#12121a] border border-[#2a2a3d] rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a3d] bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">
                  {model ? model.name : 'Profit Calculator'}
                </h2>
                <p className="text-sm text-gray-400">
                  {model ? (
                    <span className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        model.type === 'image' ? 'bg-cyan-500/20 text-cyan-400' :
                        model.type === 'video' ? 'bg-pink-500/20 text-pink-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>{model.type}</span>
                      <span>{model.provider}</span>
                    </span>
                  ) : 'Calculate pricing and margins'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Calculator Body */}
        <div className="p-6 space-y-6">
          {/* Input Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                API Cost ($)
              </label>
              <input
                type="number"
                step="0.001"
                value={apiCost}
                onChange={(e) => setApiCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1a1a25] border border-[#2a2a3d] rounded-xl py-3 px-4 text-white font-mono text-center focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Profit Margin (%)
              </label>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1a1a25] border border-[#2a2a3d] rounded-xl py-3 px-4 text-white font-mono text-center focus:border-green-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                $1 USD = Credits
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={creditPrice === 1 ? '1' : Math.round(1 / creditPrice)}
                onChange={(e) => {
                  const credits = parseFloat(e.target.value);
                  if (!isNaN(credits) && credits > 0) {
                    setCreditPrice(1 / credits);
                  }
                }}
                className="w-full bg-[#1a1a25] border border-[#2a2a3d] rounded-xl py-3 px-4 text-white font-mono text-center focus:border-green-500 outline-none transition-all"
                placeholder="1000"
              />
            </div>
          </div>

          {/* Formula Display */}
          <div className="bg-[#1a1a25]/50 p-4 rounded-xl border border-[#2a2a3d]">
            <p className="text-sm text-gray-400 mb-2">Formula:</p>
            <p className="font-mono text-cyan-400">
              Final Price = API Cost × (1 + Margin/100)
            </p>
            <p className="font-mono text-cyan-400 mt-1">
              ${apiCost.toFixed(4)} × (1 + {profitMargin}/100) = <span className="text-green-400 font-bold">${finalPrice.toFixed(4)}</span>
            </p>
          </div>

          {/* Results */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border border-cyan-500/20 text-center">
              <p className="text-xs text-gray-400 mb-1">User Pays</p>
              <p className="text-2xl font-bold text-cyan-400">${finalPrice.toFixed(4)}</p>
              <p className="text-xs text-gray-500 mt-1">{creditsCharged.toFixed(4)} credits</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/20 text-center">
              <p className="text-xs text-gray-400 mb-1">Your Profit</p>
              <p className="text-2xl font-bold text-green-400">${profitPerGeneration.toFixed(4)}</p>
              <p className="text-xs text-gray-500 mt-1">per generation</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-purple-500/20 text-center">
              <p className="text-xs text-gray-400 mb-1">Margin</p>
              <p className="text-2xl font-bold text-purple-400">{profitMargin}%</p>
              <p className="text-xs text-gray-500 mt-1">markup</p>
            </div>
          </div>

          {/* Bulk Calculations */}
          <div className="bg-[#1a1a25]/50 p-4 rounded-xl border border-[#2a2a3d]">
            <p className="text-sm font-medium text-white mb-3">Profit at Scale:</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[100, 1000, 10000, 100000].map((qty) => (
                <div key={qty} className="bg-[#12121a] p-3 rounded-lg">
                  <p className="text-xs text-gray-500">{qty.toLocaleString()} gens</p>
                  <p className="text-sm font-bold text-green-400">${(profitPerGeneration * qty).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Examples */}
          <div>
            <p className="text-sm font-medium text-gray-400 mb-3">Quick Examples:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'FLUX Schnell', cost: 0.003, margin: 25 },
                { name: 'FLUX Pro', cost: 0.04, margin: 25 },
                { name: 'Kling Video', cost: 0.07, margin: 30 },
                { name: 'GPT-4o', cost: 0.005, margin: 20 },
              ].map((example) => (
                <button
                  key={example.name}
                  onClick={() => {
                    setApiCost(example.cost);
                    setProfitMargin(example.margin);
                  }}
                  className="text-left p-3 bg-[#1a1a25] hover:bg-[#2a2a3d] rounded-lg transition-colors border border-transparent hover:border-cyan-500/30"
                >
                  <p className="text-sm font-medium text-white">{example.name}</p>
                  <p className="text-xs text-gray-500">${example.cost} @ {example.margin}%</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a2a3d] bg-[#1a1a25]/50">
          <p className="text-xs text-gray-500 text-center">
            Set your profit margins in <span className="text-cyan-400">Settings → Pricing & Profits</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Pricing Details Component for expanded view
function ModelPricingDetails({ model, modelType, onUpdate, profitSettings = {} }) {
  // Safely parse tags - handle both array and string formats
  const parseTags = (tagsData) => {
    if (Array.isArray(tagsData)) return tagsData;
    if (typeof tagsData === 'string') {
      try {
        const parsed = JSON.parse(tagsData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Calculate user credits with profit margin and credit conversion
  const getMarginForType = (type) => {
    let margin = profitSettings.profitMargin || 0;
    if (type === 'image' && profitSettings.profitMarginImage > 0) {
      margin = profitSettings.profitMarginImage;
    } else if (type === 'video' && profitSettings.profitMarginVideo > 0) {
      margin = profitSettings.profitMarginVideo;
    } else if (type === 'chat' && profitSettings.profitMarginChat > 0) {
      margin = profitSettings.profitMarginChat;
    }
    return margin;
  };

  const calculateUserCredits = (baseCredits) => {
    const margin = getMarginForType(model.type);
    const finalUSD = baseCredits * (1 + margin / 100);
    const creditPrice = profitSettings.creditPrice || 1;
    return finalUSD / creditPrice;
  };

  const [selectedOptions, setSelectedOptions] = useState({});
  const [thumbnail, setThumbnail] = useState(model.thumbnail || '');
  const [logoUrl, setLogoUrl] = useState(model.logoUrl || '');
  const [heading, setHeading] = useState(model.heading || '');
  const [subheading, setSubheading] = useState(model.subheading || '');
  const [tags, setTags] = useState(parseTags(model.tags));
  const [displayOrder, setDisplayOrder] = useState(model.displayOrder || 100);
  const [category, setCategory] = useState(model.category || 'text-to-image');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Safely get options - handle potential parsing issues
  const options = (() => {
    if (!model.options) return {};
    if (typeof model.options === 'object') return model.options;
    try {
      return JSON.parse(model.options);
    } catch {
      return {};
    }
  })();

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      await onUpdate(model.id, { thumbnail, logoUrl, heading, subheading, tags, displayOrder, category });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Initialize with default values
  useEffect(() => {
    const defaults = {};
    Object.entries(options).forEach(([key, opt]) => {
      if (opt.default !== undefined) {
        defaults[key] = opt.default;
      } else if (opt.choices?.length > 0) {
        defaults[key] = opt.choices[0].value;
      }
    });
    setSelectedOptions(defaults);
  }, [model.id]);

  // Calculate base price based on selected options
  const calculateBasePrice = () => {
    let multiplier = 1;
    Object.entries(selectedOptions).forEach(([key, value]) => {
      const opt = options[key];
      if (opt?.choices) {
        const choice = opt.choices.find(c => String(c.value) === String(value));
        if (choice?.priceMultiplier) {
          multiplier *= choice.priceMultiplier;
        }
      }
    });
    return model.credits * multiplier;
  };

  // Calculate user-facing credits with profit margin
  const calculatePrice = () => {
    const basePrice = calculateBasePrice();
    return calculateUserCredits(basePrice).toFixed(2);
  };

  // Get base price for display
  const getBasePriceDisplay = () => {
    return calculateBasePrice().toFixed(4);
  };

  // Generate all price combinations for the pricing matrix
  const generatePricingMatrix = () => {
    const optionKeys = Object.keys(options).filter(key => options[key].choices?.length > 0);
    if (optionKeys.length === 0) return [];

    const combinations = [];
    
    const generateCombinations = (index, current) => {
      if (index === optionKeys.length) {
        let multiplier = 1;
        Object.entries(current).forEach(([key, value]) => {
          const choice = options[key].choices.find(c => String(c.value) === String(value));
          if (choice?.priceMultiplier) multiplier *= choice.priceMultiplier;
        });
        const basePrice = model.credits * multiplier;
        const userCredits = calculateUserCredits(basePrice);
        combinations.push({
          options: { ...current },
          basePrice: basePrice.toFixed(4),
          price: userCredits.toFixed(2),
          multiplier
        });
        return;
      }
      
      const key = optionKeys[index];
      const opt = options[key];
      opt.choices.forEach(choice => {
        current[key] = choice.value;
        generateCombinations(index + 1, current);
      });
    };
    
    generateCombinations(0, {});
    return combinations;
  };

  const pricingMatrix = generatePricingMatrix();
  const hasOptions = Object.keys(options).length > 0;

  return (
    <div className="px-6 py-6 bg-omni-surface/20 border-t border-omni-border/30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Model Info & Calculator */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-omni-accent" />
            <h4 className="font-display font-semibold">Price Calculator</h4>
          </div>

          {/* Base Pricing Info */}
          <div className="bg-omni-surface/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-omni-muted">Base Price (USD)</span>
              <span className="font-mono text-lg">${model.baseCost?.toFixed(4) || '0.0000'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-omni-muted">Profit Margin</span>
              <span className="font-mono text-lg text-yellow-400">{getMarginForType(model.type)}%</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-700 pt-3 mt-2">
              <span className="text-white font-medium">User Pays</span>
              <span className="font-mono text-xl text-green-400 font-bold">{calculateUserCredits(model.credits).toFixed(2)} credits</span>
            </div>
            {model.pricingLastChecked && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-omni-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pricing Verified
                </span>
                <span className="text-omni-muted">
                  {new Date(model.pricingLastChecked).toLocaleDateString()}
                </span>
              </div>
            )}
            {model.docUrl && (
              <div className="pt-2 border-t border-omni-border/30">
                <a
                  href={model.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Official Pricing & Documentation
                </a>
              </div>
            )}
            
            {/* Chat model specific: Token costs */}
            {modelType === 'chat' && (model.inputCost || model.outputCost) && (
              <>
                <div className="border-t border-omni-border/30 pt-3 mt-3">
                  <p className="text-sm text-omni-muted mb-2">Token Pricing (per 1K tokens)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-omni-deep/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-omni-muted">Input</p>
                      <p className="font-mono text-green-400">${model.inputCost?.toFixed(5) || '0.00000'}</p>
                    </div>
                    <div className="bg-omni-deep/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-omni-muted">Output</p>
                      <p className="font-mono text-pink-400">${model.outputCost?.toFixed(5) || '0.00000'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Option Selectors */}
          {hasOptions && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-omni-muted">Configure Options</p>
              {Object.entries(options).map(([key, opt]) => {
                if (!opt.choices) return null;
                return (
                  <div key={key} className="flex items-center justify-between bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-sm">{opt.label || key}</label>
                    <select
                      value={selectedOptions[key] || ''}
                      onChange={(e) => setSelectedOptions({ ...selectedOptions, [key]: e.target.value })}
                      className="border border-omni-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-omni-accent"
                      style={{ backgroundColor: '#0d0e14', color: '#ffffff' }}
                    >
                      {opt.choices.map((choice) => (
                        <option 
                          key={choice.value} 
                          value={choice.value} 
                          style={{ backgroundColor: '#1a1a25', color: '#ffffff' }}
                        >
                          {choice.label} {choice.priceMultiplier !== 1 && `(${choice.priceMultiplier}x)`}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              {/* Calculated Price */}
              <div className="bg-gradient-to-r from-omni-accent/20 to-purple-500/20 rounded-xl p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Calculated Credits</span>
                  <span className="font-mono text-2xl text-omni-accent">{calculatePrice()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Capabilities for Chat Models */}
          {modelType === 'chat' && model.capabilities && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-omni-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Capabilities
              </p>
              <div className="flex flex-wrap gap-2">
                {model.capabilities.vision && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-lg">Vision</span>
                )}
                {model.capabilities.streaming && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">Streaming</span>
                )}
                {model.capabilities.webSearch && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-lg">Web Search</span>
                )}
                {model.capabilities.maxContext && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg">
                    {(model.capabilities.maxContext / 1000).toFixed(0)}K Context
                  </span>
                )}
                {model.capabilities.maxOutput && (
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg">
                    {(model.capabilities.maxOutput / 1000).toFixed(0)}K Max Output
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Metadata Configuration */}
          <div className="bg-omni-surface/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-omni-accent" />
              <h5 className="font-medium text-sm">Model Metadata</h5>
            </div>
            
            {/* Heading */}
            <div>
              <label className="text-xs text-omni-muted block mb-1">Custom Heading (optional)</label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="e.g., Best for Photorealism"
                className="w-full bg-omni-deep border border-omni-border rounded-lg px-3 py-2 text-sm outline-none focus:border-omni-accent"
              />
            </div>

            {/* Subheading */}
            <div>
              <label className="text-xs text-omni-muted block mb-1">Subheading / Description (optional)</label>
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                placeholder="e.g., Ultra-fast generation with stunning detail"
                className="w-full bg-omni-deep border border-omni-border rounded-lg px-3 py-2 text-sm outline-none focus:border-omni-accent"
              />
            </div>
            
            {/* Image URLs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Thumbnail URL */}
              <div>
                <label className="text-xs text-omni-muted block mb-1">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-omni-deep border border-omni-border rounded-lg px-3 py-2 text-sm outline-none focus:border-omni-accent"
                />
                {thumbnail && (
                  <img src={thumbnail} alt="Thumbnail" className="mt-2 w-20 h-14 rounded-lg object-cover border border-omni-border" />
                )}
              </div>

              {/* Logo URL */}
              <div>
                <label className="text-xs text-omni-muted block mb-1">Provider Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-omni-deep border border-omni-border rounded-lg px-3 py-2 text-sm outline-none focus:border-omni-accent"
                />
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="mt-2 w-8 h-8 rounded-lg object-contain bg-white/10 p-1" />
                )}
              </div>
            </div>

            {/* Category & Display Order */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  style={{ backgroundColor: '#1f2937', color: '#ffffff' }}
                >
                  <option value="text-to-image" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Text to Image</option>
                  <option value="image-to-image" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Image to Image</option>
                  <option value="both" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Both (T2I + I2I)</option>
                  <option value="text-to-video" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Text to Video</option>
                  <option value="image-to-video" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Image to Video</option>
                </select>
              </div>

              {/* Display Order */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Display Order</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-omni-muted block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 bg-omni-deep border border-omni-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-omni-accent"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveMetadata}
              disabled={isSaving}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-medium text-sm hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save All Metadata'}
            </button>
          </div>
        </div>

        {/* Right: Pricing Source & Calculation */}
        <div className="space-y-6">
          {/* Pricing Source */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h4 className="font-display font-semibold">Pricing Source & Calculation</h4>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20 space-y-4">
              {/* Source Info */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Provider</span>
                  <span className="text-sm font-medium text-white">{model.provider || 'Fal.ai'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">API Endpoint</span>
                  <span className="text-xs font-mono text-cyan-400 truncate max-w-48" title={model.apiEndpoint}>
                    {model.apiEndpoint?.split('/').slice(-2).join('/') || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Base Cost (USD)</span>
                  <span className="font-mono text-lg text-white">${model.baseCost?.toFixed(4) || '0.0000'}</span>
                </div>
              </div>
              
              {/* Calculation Breakdown */}
              <div className="border-t border-yellow-500/20 pt-3 space-y-2">
                <p className="text-xs text-yellow-400 font-medium mb-2">Calculation Formula</p>
                <div className="bg-black/30 rounded-lg p-3 space-y-1 text-xs font-mono">
                  <p className="text-gray-400">Base Cost: <span className="text-white">${model.baseCost?.toFixed(4)}</span></p>
                  <p className="text-gray-400">+ Margin ({getMarginForType(model.type)}%): <span className="text-green-400">+${((model.baseCost || 0) * getMarginForType(model.type) / 100).toFixed(4)}</span></p>
                  <p className="text-gray-400">= Final USD: <span className="text-cyan-400">${((model.baseCost || 0) * (1 + getMarginForType(model.type) / 100)).toFixed(4)}</span></p>
                  <div className="border-t border-gray-700 my-2"></div>
                  <p className="text-gray-400">Credit Rate: <span className="text-purple-400">$1 = {Math.round(1 / (profitSettings.creditPrice || 1))} credits</span></p>
                  <p className="text-gray-400">User Pays: <span className="text-yellow-400 text-sm">{calculateUserCredits(model.credits).toFixed(2)} credits</span></p>
                </div>
              </div>
              
              {/* Your Profit */}
              <div className="border-t border-yellow-500/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Your Profit per Generation</span>
                  <span className="font-mono text-lg text-green-400">
                    ${((model.baseCost || 0) * getMarginForType(model.type) / 100).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Matrix */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-omni-accent" />
              <h4 className="font-display font-semibold">Pricing Matrix</h4>
            </div>

            {pricingMatrix.length > 0 ? (
              <div className="bg-omni-surface/50 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-omni-deep/50 sticky top-0">
                    <tr>
                      {Object.keys(options).filter(k => options[k].choices).map(key => (
                        <th key={key} className="px-3 py-2 text-left text-omni-muted font-medium">
                          {options[key].label || key}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-omni-muted font-medium">Base $</th>
                      <th className="px-3 py-2 text-right text-omni-muted font-medium">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-omni-border/20">
                    {pricingMatrix.map((combo, idx) => (
                      <tr key={idx} className="hover:bg-omni-surface/30">
                        {Object.keys(options).filter(k => options[k].choices).map(key => {
                          const choice = options[key].choices.find(c => String(c.value) === String(combo.options[key]));
                          return (
                            <td key={key} className="px-3 py-2 text-omni-muted">
                              {choice?.label || combo.options[key]}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-xs text-gray-500">
                            ${combo.basePrice}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-mono ${combo.multiplier === 1 ? 'text-green-400' : combo.multiplier > 1 ? 'text-orange-400' : 'text-green-400'}`}>
                            {combo.price}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-omni-surface/50 rounded-xl p-6 text-center text-omni-muted">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No variable pricing options</p>
                <p className="text-xs mt-1">Flat rate: <span className="text-green-400 font-mono">{calculateUserCredits(model.credits).toFixed(2)} credits</span></p>
              </div>
            )}

            {/* Pricing Type Info */}
            <div className="mt-3 p-3 bg-omni-deep/30 rounded-lg text-xs text-omni-muted">
              <p className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                {modelType === 'image' && 'Image pricing varies by resolution, aspect ratio, and number of images'}
                {modelType === 'video' && 'Video pricing varies by duration, resolution, and aspect ratio'}
                {modelType === 'chat' && 'Chat pricing is based on input/output token usage'}
              </p>
            </div>
          </div>

          {/* Option Multipliers Reference */}
          {hasOptions && Object.keys(options).some(k => options[k].choices?.some(c => c.priceMultiplier && c.priceMultiplier !== 1)) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-purple-400" />
                <h5 className="text-sm font-medium text-gray-300">Price Multipliers</h5>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 space-y-3">
                {Object.entries(options).map(([key, opt]) => {
                  if (!opt.choices?.some(c => c.priceMultiplier && c.priceMultiplier !== 1)) return null;
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-xs text-purple-400 font-medium">{opt.label || key}</p>
                      <div className="flex flex-wrap gap-1">
                        {opt.choices.map(choice => (
                          <span 
                            key={choice.value}
                            className={`text-xs px-2 py-0.5 rounded ${
                              choice.priceMultiplier === 1 
                                ? 'bg-gray-700/50 text-gray-400' 
                                : choice.priceMultiplier > 1 
                                  ? 'bg-orange-500/20 text-orange-400' 
                                  : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {choice.label}: {choice.priceMultiplier || 1}x
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, onUpdateCredits }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChange, setStatusChange] = useState({ status: '', reason: '' });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/users/${userId}`, getAuthHeaders());
      setUserDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    fetchUserDetails(user.id);
  };

  const handleStatusChange = async () => {
    try {
      await axios.put(
        `${API_BASE}/admin/users/${selectedUser.id}/status`,
        statusChange,
        getAuthHeaders()
      );
      setShowStatusModal(false);
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveNotes = async (notes) => {
    try {
      await axios.put(
        `${API_BASE}/admin/users/${selectedUser.id}/notes`,
        { notes },
        getAuthHeaders()
      );
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400',
      suspended: 'bg-yellow-500/20 text-yellow-400',
      banned: 'bg-red-500/20 text-red-400'
    };
    return styles[status] || styles.active;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Users</h1>
          <p className="text-[#6b7280]">Manage user accounts, credits, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1c25]">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Email</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Credits</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Generations</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Joined</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-[#6b7280]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c25]">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-[#1a1c25]/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium">{user.name || 'Anonymous'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#9ca3af]">{user.email || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusBadge(user.status)}`}>
                    {user.status || 'active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-1 font-mono outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => {
                          onUpdateCredits(user.id, parseFloat(editValue));
                          setEditingId(null);
                        }}
                        className="p-1.5 bg-green-500/20 text-green-400 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-red-500/20 text-red-400 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="font-mono">{user.credits?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-[#9ca3af] font-mono">{user.generations || 0}</td>
                <td className="px-6 py-4 text-[#9ca3af] text-sm">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="p-2 text-[#6b7280] hover:text-white hover:bg-[#1a1c25] rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(user.id);
                        setEditValue(user.credits?.toString() || '0');
                      }}
                      className="p-2 text-[#6b7280] hover:text-white hover:bg-[#1a1c25] rounded-lg transition-colors"
                      title="Edit Credits"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            No users found
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setSelectedUser(null); setUserDetails(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0e14] border border-[#1a1c25] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#1a1c25] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold">
                    {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedUser.name || 'Anonymous'}</h2>
                    <p className="text-[#6b7280]">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserDetails(null); }}
                  className="p-2 text-[#6b7280] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                </div>
              ) : userDetails && (
                <div className="p-6 space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#12131a] rounded-xl p-4">
                      <div className="text-2xl font-bold text-cyan-400">{userDetails.credits?.toFixed(2)}</div>
                      <div className="text-sm text-[#6b7280]">Credits</div>
                    </div>
                    <div className="bg-[#12131a] rounded-xl p-4">
                      <div className="text-2xl font-bold text-purple-400">{userDetails.totalGenerations || 0}</div>
                      <div className="text-sm text-[#6b7280]">Generations</div>
                    </div>
                    <div className="bg-[#12131a] rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-400">₹{userDetails.totalPaid || 0}</div>
                      <div className="text-sm text-[#6b7280]">Total Paid</div>
                    </div>
                    <div className="bg-[#12131a] rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusBadge(userDetails.status)}`}>
                          {userDetails.status || 'active'}
                        </span>
                      </div>
                      <div className="text-sm text-[#6b7280] mt-2">Status</div>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="bg-[#12131a] rounded-xl p-4">
                    <h3 className="font-semibold mb-4">User Actions</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setStatusChange({ status: 'active', reason: '' });
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => {
                          setStatusChange({ status: 'suspended', reason: '' });
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => {
                          setStatusChange({ status: 'banned', reason: '' });
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                      >
                        Ban
                      </button>
                    </div>
                    {userDetails.statusReason && (
                      <p className="mt-3 text-sm text-[#6b7280]">
                        <strong>Reason:</strong> {userDetails.statusReason}
                      </p>
                    )}
                  </div>

                  {/* Subscription */}
                  {userDetails.subscription && (
                    <div className="bg-[#12131a] rounded-xl p-4">
                      <h3 className="font-semibold mb-2">Subscription</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-cyan-400 font-medium">{userDetails.subscription.planName}</span>
                        <span className="text-[#6b7280]">{userDetails.subscription.billingCycle}</span>
                        <span className="text-[#6b7280]">
                          Expires: {new Date(userDetails.subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div className="bg-[#12131a] rounded-xl p-4">
                    <h3 className="font-semibold mb-2">Admin Notes</h3>
                    <textarea
                      defaultValue={userDetails.adminNotes || ''}
                      onBlur={(e) => handleSaveNotes(e.target.value)}
                      placeholder="Add notes about this user..."
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-xl p-3 text-sm outline-none focus:border-cyan-500 resize-none h-24"
                    />
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-[#12131a] rounded-xl p-4">
                    <h3 className="font-semibold mb-4">Recent Generations</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userDetails.recentGenerations?.map((gen) => (
                        <div key={gen.id} className="flex items-center justify-between text-sm py-2 border-b border-[#1a1c25] last:border-0">
                          <div className="flex items-center gap-3">
                            {gen.type === 'image' && <Image className="w-4 h-4 text-purple-400" />}
                            {gen.type === 'video' && <Video className="w-4 h-4 text-cyan-400" />}
                            {gen.type === 'chat' && <MessageSquare className="w-4 h-4 text-green-400" />}
                            <span className="text-[#9ca3af] truncate max-w-xs">{gen.prompt?.slice(0, 50)}...</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[#6b7280]">{gen.credits?.toFixed(4)} cr</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              gen.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {gen.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!userDetails.recentGenerations || userDetails.recentGenerations.length === 0) && (
                        <p className="text-[#6b7280] text-center py-4">No recent generations</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Change Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0e14] border border-[#1a1c25] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {statusChange.status === 'active' && 'Activate User'}
                {statusChange.status === 'suspended' && 'Suspend User'}
                {statusChange.status === 'banned' && 'Ban User'}
              </h3>
              <div className="mb-4">
                <label className="block text-sm text-[#6b7280] mb-2">Reason (optional)</label>
                <textarea
                  value={statusChange.reason}
                  onChange={(e) => setStatusChange({ ...statusChange, reason: e.target.value })}
                  placeholder="Enter reason for this action..."
                  className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl p-3 text-sm outline-none focus:border-cyan-500 resize-none h-24"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-[#6b7280] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    statusChange.status === 'active' ? 'bg-green-500 text-white' :
                    statusChange.status === 'suspended' ? 'bg-yellow-500 text-black' :
                    'bg-red-500 text-white'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ ANALYTICS TAB ============
function AnalyticsTab() {
  const [signupsData, setSignupsData] = useState({ data: [], stats: {} });
  const [revenueData, setRevenueData] = useState({ data: [], stats: {} });
  const [usageData, setUsageData] = useState({ data: [], stats: {}, popularModels: [] });
  const [activeUsers, setActiveUsers] = useState({ dau: 0, wau: 0, mau: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [signups, revenue, usage, active] = await Promise.all([
        axios.get(`${API_BASE}/admin/analytics/signups?period=${period}`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/analytics/revenue?period=${period}`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/analytics/usage?period=${period}`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/analytics/active-users`, getAuthHeaders())
      ]);
      setSignupsData(signups.data);
      setRevenueData(revenue.data);
      setUsageData(usage.data);
      setActiveUsers(active.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `₹${(value || 0).toLocaleString()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Analytics</h1>
          <p className="text-[#6b7280]">Platform metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 bg-[#1a1c25] rounded-xl hover:bg-[#252830]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6b7280]">Total Users</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold">{signupsData.stats?.total?.toLocaleString() || 0}</div>
          <div className="text-sm text-green-400 flex items-center gap-1 mt-1">
            <ArrowUp className="w-3 h-3" />
            +{signupsData.stats?.thisMonth || 0} this month
          </div>
        </div>
        
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6b7280]">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold">{formatCurrency(revenueData.stats?.totalRevenue)}</div>
          <div className={`text-sm flex items-center gap-1 mt-1 ${
            parseFloat(revenueData.stats?.growth) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {parseFloat(revenueData.stats?.growth) >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {revenueData.stats?.growth || 0}% vs last month
          </div>
        </div>
        
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6b7280]">MRR</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold">{formatCurrency(revenueData.stats?.mrr)}</div>
          <div className="text-sm text-[#6b7280] mt-1">Monthly recurring revenue</div>
        </div>
        
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6b7280]">Active Users</span>
            <Activity className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold">{activeUsers.dau}</div>
          <div className="text-sm text-[#6b7280] mt-1">
            WAU: {activeUsers.wau} | MAU: {activeUsers.mau}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Signups Chart */}
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <h3 className="font-semibold mb-4">User Signups</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupsData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1c25" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12131a', border: '1px solid #1a1c25', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <h3 className="font-semibold mb-4">Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1c25" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12131a', border: '1px solid #1a1c25', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <h3 className="font-semibold mb-4">Generations by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1c25" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12131a', border: '1px solid #1a1c25', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="images" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="videos" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="chats" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Models */}
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
          <h3 className="font-semibold mb-4">Popular Models</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {usageData.popularModels?.map((model, idx) => (
              <div key={model.model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#6b7280] text-sm w-4">{idx + 1}.</span>
                  <span className="text-sm truncate max-w-[150px]">{model.modelName || model.model}</span>
                </div>
                <span className="text-sm text-cyan-400 font-mono">{model.count}</span>
              </div>
            ))}
            {(!usageData.popularModels || usageData.popularModels.length === 0) && (
              <p className="text-[#6b7280] text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-purple-400" />
            <span className="text-[#6b7280] text-sm">Images</span>
          </div>
          <div className="text-2xl font-bold">{usageData.stats?.images?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <span className="text-[#6b7280] text-sm">Videos</span>
          </div>
          <div className="text-2xl font-bold">{usageData.stats?.videos?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span className="text-[#6b7280] text-sm">Chats</span>
          </div>
          <div className="text-2xl font-bold">{usageData.stats?.chats?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-[#6b7280] text-sm">Credits Used</span>
          </div>
          <div className="text-2xl font-bold">{usageData.stats?.creditsUsed?.toFixed(2) || 0}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ SUBSCRIPTIONS TAB ============
function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueStats, setRevenueStats] = useState(null);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, paymentsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/subscriptions`, getAuthHeaders()),
        axios.get(`${API_BASE}/subscription-plans`),
        axios.get(`${API_BASE}/admin/payments`, getAuthHeaders())
      ]);
      setSubscriptions(subsRes.data.subscriptions || []);
      setPlans(plansRes.data);
      setRevenueStats(paymentsRes.data.revenueStats);
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Subscriptions</h1>
        <p className="text-[#6b7280]">Manage subscription plans and user subscriptions</p>
      </div>

      {/* Revenue Stats */}
      {revenueStats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400">₹{(revenueStats.totalRevenue || 0).toLocaleString()}</div>
            <div className="text-[#6b7280]">Total Revenue</div>
          </div>
          <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
            <div className="text-3xl font-bold text-cyan-400">₹{(revenueStats.last30Days || 0).toLocaleString()}</div>
            <div className="text-[#6b7280]">Last 30 Days</div>
          </div>
          <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">₹{(revenueStats.last7Days || 0).toLocaleString()}</div>
            <div className="text-[#6b7280]">Last 7 Days</div>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1c25]">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Plan</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Billing</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c25]">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-[#1a1c25]/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{sub.name || 'Anonymous'}</div>
                    <div className="text-sm text-[#6b7280]">{sub.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-cyan-400">{sub.planName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    sub.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    sub.status === 'cancelled' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#9ca3af]">{sub.billingCycle}</td>
                <td className="px-6 py-4 text-[#9ca3af] text-sm">
                  {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscriptions.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            {loading ? 'Loading...' : 'No subscriptions found'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ RATE LIMITS TAB ============
function RateLimitsTab() {
  const [rateLimits, setRateLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLimit, setNewLimit] = useState({
    name: '',
    type: 'global',
    targetId: '',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    enabled: true
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchRateLimits();
  }, []);

  const fetchRateLimits = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/rate-limits`, getAuthHeaders());
      setRateLimits(response.data);
    } catch (err) {
      console.error('Failed to fetch rate limits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post(`${API_BASE}/admin/rate-limits`, newLimit, getAuthHeaders());
      setShowCreateModal(false);
      setNewLimit({
        name: '',
        type: 'global',
        targetId: '',
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        enabled: true
      });
      fetchRateLimits();
    } catch (err) {
      console.error('Failed to create rate limit:', err);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await axios.put(`${API_BASE}/admin/rate-limits/${id}`, updates, getAuthHeaders());
      fetchRateLimits();
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update rate limit:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rate limit?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/rate-limits/${id}`, getAuthHeaders());
      fetchRateLimits();
    } catch (err) {
      console.error('Failed to delete rate limit:', err);
    }
  };

  const handleToggle = async (limit) => {
    await handleUpdate(limit.id, { ...limit, enabled: !limit.enabled });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Rate Limits</h1>
          <p className="text-[#6b7280]">Configure API rate limiting for users and models</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Rate Limit
        </button>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1c25]">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Type</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Per Minute</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Per Hour</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Per Day</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Enabled</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-[#6b7280]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c25]">
            {rateLimits.map((limit) => (
              <tr key={limit.id} className="hover:bg-[#1a1c25]/50 transition-colors">
                <td className="px-6 py-4 font-medium">{limit.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    limit.type === 'global' ? 'bg-purple-500/20 text-purple-400' :
                    limit.type === 'tier' ? 'bg-cyan-500/20 text-cyan-400' :
                    limit.type === 'model' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {limit.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-[#9ca3af]">{limit.requestsPerMinute}</td>
                <td className="px-6 py-4 font-mono text-[#9ca3af]">{limit.requestsPerHour}</td>
                <td className="px-6 py-4 font-mono text-[#9ca3af]">{limit.requestsPerDay}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggle(limit)}>
                    {limit.enabled ? (
                      <ToggleRight className="w-6 h-6 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-[#6b7280]" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(limit.id)}
                    className="p-2 text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rateLimits.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            {loading ? 'Loading...' : 'No rate limits configured'}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0e14] border border-[#1a1c25] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Create Rate Limit</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#6b7280] mb-2">Name</label>
                  <input
                    type="text"
                    value={newLimit.name}
                    onChange={(e) => setNewLimit({ ...newLimit, name: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500"
                    placeholder="e.g., Premium Users"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#6b7280] mb-2">Type</label>
                  <select
                    value={newLimit.type}
                    onChange={(e) => setNewLimit({ ...newLimit, type: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none"
                  >
                    <option value="global">Global</option>
                    <option value="tier">Tier</option>
                    <option value="model">Model</option>
                    <option value="user">User</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-2">Per Min</label>
                    <input
                      type="number"
                      value={newLimit.requestsPerMinute}
                      onChange={(e) => setNewLimit({ ...newLimit, requestsPerMinute: parseInt(e.target.value) })}
                      className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-2">Per Hour</label>
                    <input
                      type="number"
                      value={newLimit.requestsPerHour}
                      onChange={(e) => setNewLimit({ ...newLimit, requestsPerHour: parseInt(e.target.value) })}
                      className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-2">Per Day</label>
                    <input
                      type="number"
                      value={newLimit.requestsPerDay}
                      onChange={(e) => setNewLimit({ ...newLimit, requestsPerDay: parseInt(e.target.value) })}
                      className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[#6b7280] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ ERROR LOGS TAB ============
function ErrorLogsTab() {
  const [errorLogs, setErrorLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', severity: 'all' });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/error-logs`, getAuthHeaders()),
        axios.get(`${API_BASE}/admin/error-stats`, getAuthHeaders())
      ]);
      setErrorLogs(logsRes.data.logs || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch error data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (logId) => {
    try {
      await axios.put(`${API_BASE}/admin/error-logs/${logId}/resolve`, {}, getAuthHeaders());
      fetchData();
      setSelectedLog(null);
    } catch (err) {
      console.error('Failed to resolve error:', err);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await axios.delete(`${API_BASE}/admin/error-logs/${logId}`, getAuthHeaders());
      fetchData();
      setSelectedLog(null);
    } catch (err) {
      console.error('Failed to delete error:', err);
    }
  };

  const filteredLogs = errorLogs.filter(log => {
    if (filters.type !== 'all' && log.type !== filters.type) return false;
    if (filters.severity !== 'all' && log.severity !== filters.severity) return false;
    return true;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'error': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'generation': return 'bg-purple-500/20 text-purple-400';
      case 'upscale': return 'bg-pink-500/20 text-pink-400';
      case 'chat': return 'bg-emerald-500/20 text-emerald-400';
      case 'timeout': return 'bg-amber-500/20 text-amber-400';
      case 'auth': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Error Monitoring</h1>
          <p className="text-omni-muted">Track and resolve generation failures across all models</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-omni-surface hover:bg-omni-surface/80 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unresolved}</p>
                <p className="text-xs text-omni-muted">Unresolved Errors</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-omni-muted">Today's Errors</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-omni-muted">Total Logged</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.bySeverity?.find(s => s.severity === 'critical')?.count || 0}
                </p>
                <p className="text-xs text-omni-muted">Critical Issues</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Breakdown */}
      {stats && (stats.byType?.length > 0 || stats.byModel?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* By Type */}
          {stats.byType?.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-omni-muted mb-3">Errors by Type</h3>
              <div className="space-y-2">
                {stats.byType.map(item => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                    <span className="font-mono text-sm">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* By Model */}
          {stats.byModel?.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-omni-muted mb-3">Top Failing Models</h3>
              <div className="space-y-2">
                {stats.byModel.slice(0, 5).map(item => (
                  <div key={item.modelName} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[200px]">{item.modelName || 'Unknown'}</span>
                    <span className="font-mono text-sm text-red-400">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="bg-omni-surface border border-omni-border rounded-xl px-4 py-2 text-sm outline-none focus:border-omni-accent"
        >
          <option value="all">All Types</option>
          <option value="generation">Generation</option>
          <option value="upscale">Upscale</option>
          <option value="chat">Chat</option>
          <option value="timeout">Timeout</option>
          <option value="auth">Auth</option>
        </select>
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="bg-omni-surface border border-omni-border rounded-xl px-4 py-2 text-sm outline-none focus:border-omni-accent"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <span className="text-sm text-omni-muted ml-auto">
          Showing {filteredLogs.length} of {errorLogs.length} errors
        </span>
      </div>

      {/* Error Logs Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-omni-border/30 bg-omni-surface/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Error</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Model</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-omni-muted uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-omni-border/20">
            {filteredLogs.map((log) => (
              <tr 
                key={log.id} 
                className="hover:bg-omni-surface/30 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                    {log.severity || 'error'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(log.type)}`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-sm text-red-400">{log.errorCode}</div>
                  <div className="text-xs text-omni-muted truncate max-w-xs">{log.errorMessage}</div>
                </td>
                <td className="px-4 py-3 text-sm text-omni-muted">
                  {log.metadata?.modelName || log.endpoint?.split('/').pop() || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-omni-muted">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3">
                  {log.resolved ? (
                    <span className="text-xs text-green-400">Resolved</span>
                  ) : (
                    <span className="text-xs text-yellow-400">Open</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-omni-muted">
            {loading ? 'Loading...' : 'No error logs found - all systems operational!'}
          </div>
        )}
      </div>

      {/* Error Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass border border-omni-border rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getSeverityColor(selectedLog.severity)}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Error Details</h3>
                    <p className="text-sm text-omni-muted">{selectedLog.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 text-omni-muted hover:text-white rounded-lg hover:bg-omni-surface">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">Type</label>
                    <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(selectedLog.type)}`}>
                      {selectedLog.type}
                    </span>
                  </div>
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">Severity</label>
                    <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(selectedLog.severity)}`}>
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">Error Code</label>
                    <span className="font-mono text-sm text-red-400">{selectedLog.errorCode}</span>
                  </div>
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">Time</label>
                    <span className="text-sm">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Endpoint & User */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">API Endpoint</label>
                    <span className="font-mono text-sm break-all">{selectedLog.endpoint || '-'}</span>
                  </div>
                  <div className="bg-omni-surface/50 rounded-lg p-3">
                    <label className="text-xs text-omni-muted block mb-1">User ID</label>
                    <span className="font-mono text-sm">{selectedLog.userId || '-'}</span>
                  </div>
                </div>
                
                {/* Error Message */}
                <div>
                  <label className="text-xs text-omni-muted block mb-2">Error Message</label>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg font-mono text-sm text-red-400">
                    {selectedLog.errorMessage}
                  </div>
                </div>

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-xs text-omni-muted block mb-2">Additional Context</label>
                    <div className="p-4 bg-omni-surface/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedLog.metadata.modelName && (
                          <div>
                            <span className="text-omni-muted">Model:</span>
                            <span className="ml-2">{selectedLog.metadata.modelName}</span>
                          </div>
                        )}
                        {selectedLog.metadata.modelId && (
                          <div>
                            <span className="text-omni-muted">Model ID:</span>
                            <span className="ml-2 font-mono text-xs">{selectedLog.metadata.modelId}</span>
                          </div>
                        )}
                        {selectedLog.metadata.responseStatus && (
                          <div>
                            <span className="text-omni-muted">HTTP Status:</span>
                            <span className="ml-2 text-red-400">{selectedLog.metadata.responseStatus}</span>
                          </div>
                        )}
                        {selectedLog.metadata.prompt && (
                          <div className="col-span-2">
                            <span className="text-omni-muted">Prompt:</span>
                            <p className="mt-1 text-xs bg-omni-deep rounded p-2 max-h-20 overflow-y-auto">
                              {selectedLog.metadata.prompt}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Stack Trace */}
                {selectedLog.stackTrace && (
                  <div>
                    <label className="text-xs text-omni-muted block mb-2">Stack Trace</label>
                    <pre className="p-4 bg-omni-deep rounded-lg font-mono text-xs text-omni-muted overflow-x-auto max-h-40">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-omni-border/30">
                  {!selectedLog.resolved && (
                    <button
                      onClick={() => handleResolve(selectedLog.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedLog.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  {selectedLog.generationId && (
                    <span className="ml-auto text-xs text-omni-muted">
                      Generation: <span className="font-mono">{selectedLog.generationId.slice(0, 8)}...</span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ FEATURE FLAGS TAB ============
function FeatureFlagsTab() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/feature-flags`, getAuthHeaders());
      setFlags(response.data);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (flag) => {
    try {
      await axios.put(`${API_BASE}/admin/feature-flags/${flag.id}`, {
        ...flag,
        enabled: !flag.enabled
      }, getAuthHeaders());
      fetchFlags();
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Feature Flags</h1>
        <p className="text-[#6b7280]">Toggle features on and off across the platform</p>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[#1a1c25]">
          {flags.map((flag) => (
            <div key={flag.id} className="p-6 flex items-center justify-between hover:bg-[#1a1c25]/50">
              <div>
                <div className="font-medium font-mono">{flag.name}</div>
                <div className="text-sm text-[#6b7280] mt-1">{flag.description}</div>
              </div>
              <button onClick={() => handleToggle(flag)}>
                {flag.enabled ? (
                  <ToggleRight className="w-10 h-10 text-green-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-[#6b7280]" />
                )}
              </button>
            </div>
          ))}
        </div>
        {flags.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            {loading ? 'Loading...' : 'No feature flags configured'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ AI TOOLS TAB ============
function AiToolsTab() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Sparkles',
    color: 'from-cyan-500 to-blue-500',
    backgroundImage: '',
    badge: '',
    route: '',
    showOnLanding: false,
    showOnDashboard: true,
  });

  const iconOptions = ['Sparkles', 'Wand2', 'Video', 'Image', 'MessageSquare', 'Mic', 'Subtitles', 'ImagePlus', 'Palette', 'Eraser', 'Layers', 'Zap'];
  const colorOptions = [
    { value: 'from-purple-500 to-indigo-600', label: 'Purple' },
    { value: 'from-cyan-500 to-blue-600', label: 'Cyan' },
    { value: 'from-pink-500 to-rose-600', label: 'Pink' },
    { value: 'from-orange-500 to-red-600', label: 'Orange' },
    { value: 'from-teal-500 to-cyan-600', label: 'Teal' },
    { value: 'from-green-500 to-emerald-600', label: 'Green' },
    { value: 'from-amber-500 to-orange-600', label: 'Amber' },
    { value: 'from-violet-500 to-purple-600', label: 'Violet' },
  ];

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/ai-tools`, getAuthHeaders());
      setTools(response.data);
    } catch (err) {
      console.error('Failed to fetch AI tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await axios.put(`${API_BASE}/admin/ai-tools/${editItem.id}`, formData, getAuthHeaders());
      } else {
        await axios.post(`${API_BASE}/admin/ai-tools`, formData, getAuthHeaders());
      }
      fetchTools();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save AI tool:', err);
      alert('Failed to save AI tool');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/ai-tools/${id}`, getAuthHeaders());
      fetchTools();
    } catch (err) {
      console.error('Failed to delete AI tool:', err);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      icon: item.icon || 'Sparkles',
      color: item.color || 'from-cyan-500 to-blue-500',
      backgroundImage: item.backgroundImage || '',
      badge: item.badge || '',
      route: item.route || '',
      showOnLanding: item.showOnLanding === 1,
      showOnDashboard: item.showOnDashboard === 1,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditItem(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Sparkles',
      color: 'from-cyan-500 to-blue-500',
      backgroundImage: '',
      badge: '',
      route: '',
      showOnLanding: false,
      showOnDashboard: true,
    });
  };

  const toggleVisibility = async (tool, field) => {
    const newValue = tool[field] === 1 ? 0 : 1;
    const updatedTools = tools.map(t => 
      t.id === tool.id ? { ...t, [field]: newValue } : t
    );
    setTools(updatedTools);

    try {
      await axios.put(`${API_BASE}/admin/ai-tools/${tool.id}`, {
        [field]: newValue === 1
      }, getAuthHeaders());
    } catch (err) {
      console.error('Failed to update tool:', err);
      fetchTools();
    }
  };

  const moveItem = async (index, direction) => {
    const newTools = [...tools];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTools.length) return;
    
    [newTools[index], newTools[targetIndex]] = [newTools[targetIndex], newTools[index]];
    setTools(newTools);
    
    try {
      await axios.post(`${API_BASE}/admin/ai-tools/reorder`, {
        items: newTools.map((item, i) => ({ id: item.id, displayOrder: i }))
      }, getAuthHeaders());
    } catch (err) {
      console.error('Failed to reorder:', err);
      fetchTools();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">AI Tools</h1>
          <p className="text-omni-muted">Manage AI tools shown on dashboard and landing page</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Tool
        </button>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[#6b7280]">Loading...</div>
        ) : tools.length === 0 ? (
          <div className="py-12 text-center text-[#6b7280]">No AI tools configured</div>
        ) : (
          <div className="divide-y divide-[#1a1c25]">
            {tools.map((tool, idx) => (
              <div key={tool.id} className="flex items-center gap-4 p-4 hover:bg-[#1a1c25]/50">
                {/* Preview */}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-2xl text-white">
                    {tool.icon === 'Wand2' ? '✨' : 
                     tool.icon === 'Video' ? '🎬' : 
                     tool.icon === 'Image' ? '🖼️' : 
                     tool.icon === 'MessageSquare' ? '💬' : 
                     tool.icon === 'Mic' ? '🎤' : '⚡'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{tool.name}</h3>
                    {tool.badge && (
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        tool.badge === 'New' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#6b7280] truncate">{tool.description}</p>
                </div>

                {/* Visibility Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(tool, 'showOnDashboard')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tool.showOnDashboard === 1 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-[#1a1c25] text-[#6b7280] border border-[#252730]'
                    }`}
                    title="Show on Dashboard"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => toggleVisibility(tool, 'showOnLanding')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tool.showOnLanding === 1 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : 'bg-[#1a1c25] text-[#6b7280] border border-[#252730]'
                    }`}
                    title="Show on Landing"
                  >
                    Landing
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-2 hover:bg-[#252730] rounded-lg disabled:opacity-30">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveItem(idx, 'down')} disabled={idx === tools.length - 1} className="p-2 hover:bg-[#252730] rounded-lg disabled:opacity-30">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(tool)} className="p-2 hover:bg-[#252730] rounded-lg text-cyan-400">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(tool.id)} className="p-2 hover:bg-[#252730] rounded-lg text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12131a] border border-[#1a1c25] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#1a1c25]">
                <h2 className="text-xl font-bold">{editItem ? 'Edit AI Tool' : 'Add AI Tool'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none resize-none h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Icon</label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Color</label>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    >
                      {colorOptions.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Background Image URL</label>
                  <input
                    type="url"
                    value={formData.backgroundImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundImage: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Badge</label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                      placeholder="New, Save, Pro..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Route</label>
                    <input
                      type="text"
                      value={formData.route}
                      onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                      placeholder="/tools/my-tool"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showOnDashboard}
                      onChange={(e) => setFormData(prev => ({ ...prev, showOnDashboard: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Show on Dashboard</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showOnLanding}
                      onChange={(e) => setFormData(prev => ({ ...prev, showOnLanding: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Show on Landing Page</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-[#1a1c25] rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium">
                    {editItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ LANDING FEATURED TAB ============
function LandingFeaturedTab() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    type: 'announcement',
    title: '',
    description: '',
    mediaUrl: '',
    mediaType: 'image',
    linkUrl: '',
    linkText: '',
    isActive: true,
    expiresAt: '',
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/landing/featured`, getAuthHeaders());
      setFeatured(response.data);
    } catch (err) {
      console.error('Failed to fetch featured items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await axios.put(`${API_BASE}/admin/landing/featured/${editItem.id}`, formData, getAuthHeaders());
      } else {
        await axios.post(`${API_BASE}/admin/landing/featured`, formData, getAuthHeaders());
      }
      fetchFeatured();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save featured item:', err);
      alert('Failed to save featured item');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/landing/featured/${id}`, getAuthHeaders());
      fetchFeatured();
    } catch (err) {
      console.error('Failed to delete featured item:', err);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      type: item.type || 'announcement',
      title: item.title || '',
      description: item.description || '',
      mediaUrl: item.mediaUrl || '',
      mediaType: item.mediaType || 'image',
      linkUrl: item.linkUrl || '',
      linkText: item.linkText || '',
      isActive: item.isActive === 1,
      expiresAt: item.expiresAt || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditItem(null);
    setFormData({
      type: 'announcement',
      title: '',
      description: '',
      mediaUrl: '',
      mediaType: 'image',
      linkUrl: '',
      linkText: '',
      isActive: true,
      expiresAt: '',
    });
  };

  const moveItem = async (index, direction) => {
    const newFeatured = [...featured];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFeatured.length) return;
    
    [newFeatured[index], newFeatured[targetIndex]] = [newFeatured[targetIndex], newFeatured[index]];
    setFeatured(newFeatured);
    
    try {
      await axios.post(`${API_BASE}/admin/landing/featured/reorder`, {
        items: newFeatured.map((item, i) => ({ id: item.id, displayOrder: i }))
      }, getAuthHeaders());
    } catch (err) {
      console.error('Failed to reorder:', err);
      fetchFeatured();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Featured Content</h1>
          <p className="text-omni-muted">Manage "What's New" section on landing page</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Featured
        </button>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[#6b7280]">Loading...</div>
        ) : featured.length === 0 ? (
          <div className="py-12 text-center text-[#6b7280]">No featured items yet</div>
        ) : (
          <div className="divide-y divide-[#1a1c25]">
            {featured.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-[#1a1c25]/50">
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#0a0b0f] flex-shrink-0">
                  {item.mediaUrl ? (
                    <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
                      <Globe className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      item.type === 'model_launch' ? 'bg-cyan-500/20 text-cyan-400' :
                      item.type === 'feature' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.type}
                    </span>
                    {!item.isActive && <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Inactive</span>}
                  </div>
                  <h3 className="font-medium truncate mt-1">{item.title}</h3>
                  <p className="text-sm text-[#6b7280] truncate">{item.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-2 hover:bg-[#252730] rounded-lg disabled:opacity-30">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveItem(idx, 'down')} disabled={idx === featured.length - 1} className="p-2 hover:bg-[#252730] rounded-lg disabled:opacity-30">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(item)} className="p-2 hover:bg-[#252730] rounded-lg text-cyan-400">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-[#252730] rounded-lg text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12131a] border border-[#1a1c25] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#1a1c25]">
                <h2 className="text-xl font-bold">{editItem ? 'Edit Featured' : 'Add Featured'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="model_launch">Model Launch</option>
                    <option value="feature">Feature</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6b7280] mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none resize-none h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Media URL</label>
                    <input
                      type="url"
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Media Type</label>
                    <select
                      value={formData.mediaType}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediaType: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Link URL</label>
                    <input
                      type="text"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#6b7280] mb-1">Link Text</label>
                    <input
                      type="text"
                      value={formData.linkText}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkText: e.target.value }))}
                      className="w-full bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 outline-none"
                      placeholder="Try Now"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-[#1a1c25] rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium">
                    {editItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ COMMUNITY GALLERY TAB ============
function CommunityGalleryTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, image, video
  const [sort, setSort] = useState('popular'); // popular, latest

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchCommunityPosts();
  }, [filter, sort]);

  const fetchCommunityPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ sort, limit: 50 });
      if (filter !== 'all') params.append('category', filter);
      
      const response = await axios.get(`${API_BASE}/community?${params.toString()}`);
      setPosts(response.data.posts || response.data || []);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (postId) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this community post?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/community/${postId}`, getAuthHeaders());
      fetchCommunityPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post. The endpoint may not exist yet.');
    }
  };

  const handleFeaturePost = async (post) => {
    try {
      await axios.post(`${API_BASE}/admin/landing/featured`, {
        type: 'community',
        title: post.title || 'Community Creation',
        description: `By ${post.nickname || 'Anonymous'} using ${post.modelName || 'AI'}`,
        mediaUrl: post.thumbnailUrl || post.imageUrl,
        mediaType: 'image',
        linkUrl: `/community/${post.id}`,
        linkText: 'View in Gallery',
        isActive: true,
      }, getAuthHeaders());
      alert('Post featured successfully!');
    } catch (err) {
      console.error('Failed to feature post:', err);
      alert('Failed to feature post');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Community Gallery</h1>
          <p className="text-[var(--text-muted)]">Manage community posts shown on landing page</p>
        </div>
        <button
          onClick={fetchCommunityPosts}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl font-medium hover:bg-[var(--card-hover)]"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm"
          >
            <option value="all">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm"
          >
            <option value="popular">Most Popular</option>
            <option value="latest">Latest</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-[var(--text-muted)]">
          {posts.length} posts
        </div>
      </div>

      {/* Posts Grid */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[var(--text-muted)]">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)]">No community posts yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`relative group rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border-2 transition-all ${
                  selectedPosts.has(post.id) ? 'border-cyan-500' : 'border-transparent'
                }`}
              >
                {/* Image */}
                <div className="aspect-square">
                  <img
                    src={post.thumbnailUrl || post.imageUrl || '/placeholder.jpg'}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="12">No Image</text></svg>';
                    }}
                  />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  {/* Top actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggleSelect(post.id)}
                      className={`p-1.5 rounded-lg ${selectedPosts.has(post.id) ? 'bg-cyan-500' : 'bg-white/20'}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeaturePost(post)}
                      className="p-1.5 bg-yellow-500/80 hover:bg-yellow-500 rounded-lg"
                      title="Feature on landing page"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom info */}
                  <div>
                    <div className="text-xs text-white/80 truncate mb-1">
                      @{post.nickname || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.viewCount || 0}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => window.open(post.imageUrl, '_blank')}
                        className="flex-1 py-1 text-xs bg-white/20 hover:bg-white/30 rounded"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="py-1 px-2 text-xs bg-red-500/50 hover:bg-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    post.category === 'video' 
                      ? 'bg-pink-500/80 text-white' 
                      : 'bg-purple-500/80 text-white'
                  }`}>
                    {post.category || 'image'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ LANDING MODELS TAB ============
function LandingModelsTab() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/landing/models`, getAuthHeaders());
      setModels(response.data);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (model) => {
    const newVisibility = model.isVisible === 1 ? 0 : 1;
    const updatedModels = models.map(m => 
      m.id === model.id ? { ...m, isVisible: newVisibility } : m
    );
    setModels(updatedModels);

    try {
      await axios.put(`${API_BASE}/admin/landing/models`, {
        models: [{ modelId: model.id, isVisible: newVisibility === 1, category: model.category || 'featured', displayOrder: model.displayOrder || 0 }]
      }, getAuthHeaders());
    } catch (err) {
      console.error('Failed to update model:', err);
      fetchModels();
    }
  };

  const updateCategory = async (model, category) => {
    const updatedModels = models.map(m => 
      m.id === model.id ? { ...m, category } : m
    );
    setModels(updatedModels);

    try {
      await axios.put(`${API_BASE}/admin/landing/models`, {
        models: [{ modelId: model.id, isVisible: model.isVisible === 1, category, displayOrder: model.displayOrder || 0 }]
      }, getAuthHeaders());
    } catch (err) {
      console.error('Failed to update model:', err);
      fetchModels();
    }
  };

  const filteredModels = models.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleCount = models.filter(m => m.isVisible === 1).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Landing Page Models</h1>
        <p className="text-omni-muted">Configure which models appear on the landing page ({visibleCount} visible)</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          {['all', 'image', 'video', 'chat'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type ? 'bg-cyan-500 text-white' : 'bg-[#1a1c25] text-[#6b7280] hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[#6b7280]">Loading...</div>
        ) : filteredModels.length === 0 ? (
          <div className="py-12 text-center text-[#6b7280]">No models found</div>
        ) : (
          <div className="divide-y divide-[#1a1c25]">
            {filteredModels.map(model => (
              <div key={model.id} className="flex items-center gap-4 p-4 hover:bg-[#1a1c25]/50">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  model.type === 'image' ? 'bg-purple-500/20 text-purple-400' :
                  model.type === 'video' ? 'bg-cyan-500/20 text-cyan-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {model.type === 'image' ? <Image className="w-5 h-5" /> :
                   model.type === 'video' ? <Video className="w-5 h-5" /> :
                   <MessageSquare className="w-5 h-5" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{model.name}</h3>
                  <p className="text-sm text-[#6b7280]">{model.providerName} • ${model.credits?.toFixed(3)}</p>
                </div>

                {/* Category */}
                <select
                  value={model.category || 'featured'}
                  onChange={(e) => updateCategory(model, e.target.value)}
                  className="bg-[#0a0b0f] border border-[#1a1c25] rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="trending">Trending</option>
                  <option value="new">New</option>
                </select>

                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleVisibility(model)}
                  className={`p-2 rounded-lg transition-colors ${
                    model.isVisible === 1 ? 'bg-green-500/20 text-green-400' : 'bg-[#1a1c25] text-[#6b7280]'
                  }`}
                  title={model.isVisible === 1 ? 'Visible on landing' : 'Hidden from landing'}
                >
                  {model.isVisible === 1 ? <Eye className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ ANNOUNCEMENTS TAB ============
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 0,
    dismissible: true
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/announcements`, getAuthHeaders());
      setAnnouncements(response.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post(`${API_BASE}/admin/announcements`, newAnnouncement, getAuthHeaders());
      setShowCreateModal(false);
      setNewAnnouncement({ title: '', message: '', type: 'info', priority: 0, dismissible: true });
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
    }
  };

  const handleToggleActive = async (announcement) => {
    try {
      await axios.put(`${API_BASE}/admin/announcements/${announcement.id}`, {
        ...announcement,
        active: !announcement.active
      }, getAuthHeaders());
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/announcements/${id}`, getAuthHeaders());
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Announcements</h1>
          <p className="text-[#6b7280]">Manage platform-wide announcements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1c25]">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Title</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Type</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Created</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-[#6b7280]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c25]">
            {announcements.map((ann) => (
              <tr key={ann.id} className="hover:bg-[#1a1c25]/50">
                <td className="px-6 py-4">
                  <div className="font-medium">{ann.title}</div>
                  <div className="text-sm text-[#6b7280] truncate max-w-xs">{ann.message}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    ann.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                    ann.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    ann.type === 'success' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {ann.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActive(ann)}>
                    {ann.active ? (
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-[#1a1c25] text-[#6b7280]">Inactive</span>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-[#9ca3af] text-sm">
                  {new Date(ann.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {announcements.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            {loading ? 'Loading...' : 'No announcements'}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0e14] border border-[#1a1c25] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#6b7280] mb-2">Title</label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#6b7280] mb-2">Message</label>
                  <textarea
                    value={newAnnouncement.message}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none focus:border-cyan-500 resize-none h-24"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#6b7280] mb-2">Type</label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#1a1c25] rounded-xl px-4 py-2 outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[#6b7280] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ AUDIT LOGS TAB ============
function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', targetType: '' });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.targetType) params.append('targetType', filters.targetType);
      
      const response = await axios.get(`${API_BASE}/admin/audit-logs?${params.toString()}`, getAuthHeaders());
      setLogs(response.data.logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      window.open(`${API_BASE}/admin/export/${type}?token=${localStorage.getItem('adminToken')}`, '_blank');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Audit Logs</h1>
          <p className="text-[#6b7280]">Track all admin actions on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('users')}
            className="px-4 py-2 bg-[#1a1c25] rounded-xl text-sm hover:bg-[#252830]"
          >
            Export Users
          </button>
          <button
            onClick={() => handleExport('generations')}
            className="px-4 py-2 bg-[#1a1c25] rounded-xl text-sm hover:bg-[#252830]"
          >
            Export Generations
          </button>
          <button
            onClick={() => handleExport('payments')}
            className="px-4 py-2 bg-[#1a1c25] rounded-xl text-sm hover:bg-[#252830]"
          >
            Export Payments
          </button>
        </div>
      </div>

      <div className="bg-[#12131a] border border-[#1a1c25] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1c25]">
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Admin</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Action</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Target</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Details</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[#6b7280]">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c25]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#1a1c25]/50">
                <td className="px-6 py-4 font-medium">{log.adminUsername || 'System'}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[#9ca3af]">{log.targetType}</span>
                  <span className="text-[#6b7280] text-xs ml-2">{log.targetId?.slice(0, 8)}...</span>
                </td>
                <td className="px-6 py-4 text-[#9ca3af] text-sm">
                  <code className="bg-[#0a0b0f] px-2 py-1 rounded text-xs">
                    {JSON.stringify(log.details).slice(0, 50)}...
                  </code>
                </td>
                <td className="px-6 py-4 text-[#9ca3af] text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="py-12 text-center text-[#6b7280]">
            {loading ? 'Loading...' : 'No audit logs found'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SettingsTab({ settings, setSettings, onSave, saveStatus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
        <p className="text-[#6b6b8a]">Configure your platform settings</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* OpenRouter API Configuration */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold">OpenRouter API</h3>
              <p className="text-sm text-[#6b6b8a]">For chat/text models (GPT-4, Claude, Llama, etc.)</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={settings.openrouterApiKey || ''}
                onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="sk-or-..."
              />
              <p className="mt-2 text-xs text-[#6b6b8a]">
                Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">openrouter.ai/keys</a>
              </p>
            </div>
          </div>
        </div>

        {/* Fal.ai API Configuration */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Image className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Fal.ai API</h3>
              <p className="text-sm text-[#6b6b8a]">For image & video models (FLUX, Kling, Runway, etc.)</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                Fal.ai API Key
              </label>
              <input
                type="password"
                value={settings.falApiKey || ''}
                onChange={(e) => setSettings({ ...settings, falApiKey: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="Enter your Fal.ai API key"
              />
              <p className="mt-2 text-xs text-[#6b6b8a]">
                Get your API key from <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">fal.ai/dashboard/keys</a>
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Configuration */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Pricing & Profits</h3>
              <p className="text-sm text-[#6b6b8a]">Configure credit pricing and margins</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Row 1: Credit Conversion & Free Credits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-400 mb-2">
                  Credit Conversion Rate
                </label>
                <div className="flex items-center gap-3 bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4">
                  <span className="text-gray-400">$1 USD =</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={settings.creditPrice === 1 ? '1' : Math.round(1 / (settings.creditPrice || 1))}
                    onChange={(e) => {
                      const credits = parseFloat(e.target.value);
                      if (!isNaN(credits) && credits > 0) {
                        setSettings({ ...settings, creditPrice: 1 / credits });
                      }
                    }}
                    className="w-24 bg-transparent outline-none font-mono text-white text-center"
                    placeholder="1000"
                  />
                  <span className="text-gray-400">credits</span>
                </div>
                <p className="text-xs text-[#6b6b8a] mt-1">
                  1 credit = ${(settings.creditPrice || 1).toFixed(4)} USD
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                  Free Credits for New Users
                </label>
                <input
                  type="number"
                  value={settings.freeCredits || 100}
                  onChange={(e) => setSettings({ ...settings, freeCredits: parseInt(e.target.value) })}
                  className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono text-white"
                />
                <p className="text-xs text-[#6b6b8a] mt-1">Credits given when user signs up</p>
              </div>
            </div>
            
            {/* Universal Profit Margin */}
            <div className="pt-4 border-t border-[#2a2a3d]">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-green-400" />
                <h4 className="font-medium text-white">Profit Margins</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                  Universal Profit Margin (%)
                </label>
                <input
                  type="number"
                  value={settings.profitMargin || 0}
                  onChange={(e) => setSettings({ ...settings, profitMargin: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-green-500 input-glow transition-all font-mono text-white"
                  placeholder="e.g., 20 for 20% markup"
                />
                <p className="text-xs text-[#6b6b8a] mt-1">
                  This margin is applied to all API costs. For example, if API cost is $0.10 and margin is 20%, user pays $0.12.
                </p>
              </div>
            </div>
            
            {/* Per-Type Profit Margins */}
            <div className="pt-4 border-t border-[#2a2a3d]">
              <label className="block text-sm font-medium text-white mb-2">
                Type-Specific Profit Margins (%)
              </label>
              <p className="text-xs text-[#6b6b8a] mb-4">
                Override the universal margin for specific model types. Leave at 0 to use universal margin.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1a25]/30 p-4 rounded-xl border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-cyan-400" />
                    <label className="text-sm font-medium text-cyan-400">Image Models</label>
                  </div>
                  <input
                    type="number"
                    value={settings.profitMarginImage || 0}
                    onChange={(e) => setSettings({ ...settings, profitMarginImage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-2 px-3 text-sm outline-none focus:border-cyan-500 input-glow transition-all font-mono text-white"
                    placeholder="0"
                  />
                  <p className="text-xs text-[#6b6b8a] mt-1">FLUX, DALL-E, etc.</p>
                </div>
                
                <div className="bg-[#1a1a25]/30 p-4 rounded-xl border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-pink-400" />
                    <label className="text-sm font-medium text-pink-400">Video Models</label>
                  </div>
                  <input
                    type="number"
                    value={settings.profitMarginVideo || 0}
                    onChange={(e) => setSettings({ ...settings, profitMarginVideo: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-2 px-3 text-sm outline-none focus:border-pink-500 input-glow transition-all font-mono text-white"
                    placeholder="0"
                  />
                  <p className="text-xs text-[#6b6b8a] mt-1">Kling, Runway, etc.</p>
                </div>
                
                <div className="bg-[#1a1a25]/30 p-4 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <label className="text-sm font-medium text-emerald-400">Chat Models</label>
                  </div>
                  <input
                    type="number"
                    value={settings.profitMarginChat || 0}
                    onChange={(e) => setSettings({ ...settings, profitMarginChat: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 input-glow transition-all font-mono text-white"
                    placeholder="0"
                  />
                  <p className="text-xs text-[#6b6b8a] mt-1">GPT-4, Claude, etc.</p>
                </div>
              </div>
            </div>
            
            {/* Pricing Example */}
            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 p-4 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">How Pricing Works</span>
              </div>
              <div className="text-xs text-[#6b6b8a] space-y-2">
                <p><strong className="text-white">Step 1:</strong> API Cost × (1 + Profit Margin%) = Final USD Price</p>
                <p><strong className="text-white">Step 2:</strong> Final USD Price ÷ Credit Price = Credits Charged</p>
                <div className="mt-3 p-3 bg-[#1a1a25]/50 rounded-lg">
                  <p className="text-white mb-1">Example with your settings:</p>
                  <p>• FLUX Pro API cost: <span className="text-cyan-400">$0.04</span></p>
                  <p>• With {settings.profitMargin || 0}% margin: $0.04 × {(1 + (settings.profitMargin || 0) / 100).toFixed(2)} = <span className="text-green-400">${(0.04 * (1 + (settings.profitMargin || 0) / 100)).toFixed(4)}</span></p>
                  <p>• Credits charged: ${(0.04 * (1 + (settings.profitMargin || 0) / 100)).toFixed(4)} ÷ ${(settings.creditPrice || 1).toFixed(4)} = <span className="text-yellow-400 font-mono">{((0.04 * (1 + (settings.profitMargin || 0) / 100)) / (settings.creditPrice || 1)).toFixed(2)} credits</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Razorpay Configuration */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Razorpay Payments</h3>
              <p className="text-sm text-[#6b6b8a]">Configure payment gateway for subscriptions</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={settings.razorpayKeyId || ''}
                onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="rzp_live_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                value={settings.razorpayKeySecret || ''}
                onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="Enter your Razorpay secret key"
              />
              <p className="mt-2 text-xs text-[#6b6b8a]">
                Get your API keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">dashboard.razorpay.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Google OAuth Configuration */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Google OAuth</h3>
              <p className="text-sm text-[#6b6b8a]">Enable Google sign-in for users</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                Google Client ID
              </label>
              <input
                type="text"
                value={settings.googleClientId || ''}
                onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="xxx.apps.googleusercontent.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6b6b8a] mb-2">
                Google Client Secret
              </label>
              <input
                type="password"
                value={settings.googleClientSecret || ''}
                onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                className="w-full bg-[#1a1a25]/50 border border-[#2a2a3d] rounded-xl py-3 px-4 outline-none focus:border-purple-500 input-glow transition-all font-mono"
                placeholder="Enter your Google client secret"
              />
              <p className="mt-2 text-xs text-[#6b6b8a]">
                Configure OAuth in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google Cloud Console</a>
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <motion.button
          onClick={onSave}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`w-full btn-primary flex items-center justify-center gap-2 ${
            saveStatus === 'success' ? 'bg-green-500' : 
            saveStatus === 'error' ? 'bg-red-500' : ''
          }`}
        >
          {saveStatus === 'success' ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <X className="w-5 h-5" />
              Error saving
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
