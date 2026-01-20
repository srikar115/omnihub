'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, LayoutDashboard, Users, CreditCard, Settings,
  TrendingUp, DollarSign, Zap, Image, Video, MessageSquare,
  ChevronRight, LogOut, Save, Plus, Trash2, Edit2, Check, X,
  BarChart3, Activity, Clock, Globe, ToggleLeft, ToggleRight,
  Eye, Calculator, ChevronDown, ChevronUp, Info, Sparkles,
  ExternalLink, RefreshCw, AlertTriangle, Calendar, ArrowUp, ArrowDown,
  Heart, Star, Loader2, Search, Filter
} from 'lucide-react';

const API_BASE = '/api';

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

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  revenue: number;
  activeUsers: number;
  creditsUsed: number;
  imageGenerations: number;
  videoGenerations: number;
  chatGenerations: number;
  recentActivity?: { type: string; model: string; time: string; credits: number }[];
}

interface Model {
  id: string;
  name: string;
  type: string;
  credits: number;
  baseCost?: number;
  enabled?: boolean | number;
  provider?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  createdAt: string;
  subscriptionTier?: string;
}

interface AdminSettings {
  openrouterApiKey?: string;
  falApiKey?: string;
  profitMargin: number;
  profitMarginImage: number;
  profitMarginVideo: number;
  profitMarginChat: number;
  freeCredits: number;
  creditPrice: number;
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    freeCredits: 100,
    creditPrice: 1.00,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchData();
  }, [router]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, modelsRes, usersRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/admin/models`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/admin/settings`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => ({})),
      ]);
      
      setStats(statsRes);
      setModels(Array.isArray(modelsRes) ? modelsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSettings({ ...settings, ...settingsRes });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(settings),
      });
      setSaveStatus(response.ok ? 'success' : 'error');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleUpdateModel = async (modelId: string, updates: Partial<Model>) => {
    try {
      await fetch(`${API_BASE}/admin/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates),
      });
      setModels(models.map(m => m.id === modelId ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('Failed to update model:', err);
    }
  };

  const handleUpdateUserCredits = async (userId: string, credits: number) => {
    try {
      await fetch(`${API_BASE}/admin/users/${userId}/credits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ credits }),
      });
      setUsers(users.map(u => u.id === userId ? { ...u, credits } : u));
    } catch (err) {
      console.error('Failed to update user credits:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col overflow-y-auto"
      >
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">OmniHub</h1>
              <p className="text-xs text-[var(--text-muted)]">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                  isActive 
                    ? 'bg-purple-500/20 text-white border-l-2 border-purple-500' 
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardTab key="dashboard" stats={stats} />}
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
          {activeTab === 'users' && <UsersTab key="users" users={users} onUpdateCredits={handleUpdateUserCredits} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab key="subscriptions" />}
          {activeTab === 'rate-limits' && <RateLimitsTab key="rate-limits" />}
          {activeTab === 'models' && <ModelsTab key="models" models={models} onUpdate={handleUpdateModel} />}
          {activeTab === 'feature-flags' && <FeatureFlagsTab key="feature-flags" />}
          {activeTab === 'ai-tools' && <AiToolsTab key="ai-tools" />}
          {activeTab === 'landing-featured' && <LandingFeaturedTab key="landing-featured" />}
          {activeTab === 'community-gallery' && <CommunityGalleryTab key="community-gallery" />}
          {activeTab === 'landing-models' && <LandingModelsTab key="landing-models" />}
          {activeTab === 'announcements' && <AnnouncementsTab key="announcements" />}
          {activeTab === 'audit-logs' && <AuditLogsTab key="audit-logs" />}
          {activeTab === 'error-logs' && <ErrorLogsTab key="error-logs" />}
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
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab({ stats }: { stats: Stats | null }) {
  const statCards = [
    { label: 'Total Revenue', value: `$${stats?.revenue?.toFixed(2) || '0.00'}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Generations', value: stats?.totalGenerations || 0, icon: Activity, color: 'from-purple-500 to-violet-500' },
    { label: 'Active Users', value: stats?.activeUsers || stats?.totalUsers || 0, icon: Users, color: 'from-cyan-500 to-blue-500' },
    { label: 'Credits Used', value: (parseFloat(String(stats?.creditsUsed)) || 0).toFixed(2), icon: Zap, color: 'from-yellow-500 to-orange-500' },
  ];

  const generationStats = [
    { label: 'Images', value: stats?.imageGenerations || 0, icon: Image, color: 'text-cyan-400', bg: 'from-cyan-500 to-blue-500' },
    { label: 'Videos', value: stats?.videoGenerations || 0, icon: Video, color: 'text-pink-400', bg: 'from-pink-500 to-rose-500' },
    { label: 'Chats', value: stats?.chatGenerations || 0, icon: MessageSquare, color: 'text-emerald-400', bg: 'from-emerald-500 to-teal-500' },
  ];

  const total = (stats?.imageGenerations || 0) + (stats?.videoGenerations || 0) + (stats?.chatGenerations || 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-muted)]">Monitor your platform's performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold mb-1 text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Generation Breakdown
          </h3>
          <div className="space-y-4">
            {generationStats.map((stat) => {
              const Icon = stat.icon;
              const percentage = total > 0 ? (stat.value / total) * 100 : 0;
              return (
                <div key={stat.label} className="flex items-center gap-4">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{stat.label}</span>
                      <span className="text-sm text-[var(--text-muted)]">{stat.value}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className={`h-full rounded-full bg-gradient-to-r ${stat.bg}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
            <Clock className="w-5 h-5 text-purple-400" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl">
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
                    <p className="text-sm font-medium truncate text-[var(--text-primary)]">{activity.model}</p>
                    <p className="text-xs text-[var(--text-muted)]">{activity.time}</p>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">{activity.credits} credits</span>
                </div>
              ))
            ) : (
              <p className="text-[var(--text-muted)] text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/analytics?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.log('Analytics endpoint not available');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Analytics</h1>
          <p className="text-[var(--text-muted)]">Track platform growth and usage</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Revenue Over Time</h3>
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              <p>Chart data available when analytics API is connected</p>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Generations Over Time</h3>
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              <p>Chart data available when analytics API is connected</p>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">User Growth</h3>
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              <p>Chart data available when analytics API is connected</p>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Model Usage</h3>
            <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
              <p>Chart data available when analytics API is connected</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Users Tab
function UsersTab({ users, onUpdateCredits }: { users: User[]; onUpdateCredits: (id: string, credits: number) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState('');

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">User Management</h1>
          <p className="text-[var(--text-muted)]">{users.length} total users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--bg-tertiary)]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Email</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Credits</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Joined</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {filteredUsers.slice(0, 50).map(user => (
              <tr key={user.id} className="hover:bg-[var(--bg-tertiary)]">
                <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{user.email}</td>
                <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{user.name || '-'}</td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editCredits}
                        onChange={(e) => setEditCredits(e.target.value)}
                        className="w-24 px-2 py-1 bg-[var(--bg-primary)] border border-purple-500 rounded text-sm text-[var(--text-primary)]"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdateCredits(user.id, parseFloat(editCredits));
                          setEditingId(null);
                        }}
                        className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-cyan-400 font-mono">{(parseFloat(String(user.credits)) || 0).toFixed(2)}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      setEditingId(user.id);
                      setEditCredits(user.credits?.toString() || '0');
                    }}
                    className="p-2 text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Subscriptions Tab
function SubscriptionsTab() {
  const [plans, setPlans] = useState([
    { id: 'free', name: 'Free', credits: 100, price: 0, active: true },
    { id: 'starter', name: 'Starter', credits: 1000, price: 9.99, active: true },
    { id: 'pro', name: 'Pro', credits: 5000, price: 29.99, active: true },
    { id: 'enterprise', name: 'Enterprise', credits: 20000, price: 99.99, active: true },
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Subscription Plans</h1>
        <p className="text-[var(--text-muted)]">Manage subscription tiers and pricing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{plan.name}</h3>
              <button className={`px-3 py-1 rounded-full text-xs ${plan.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {plan.active ? 'Active' : 'Disabled'}
              </button>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)] mb-2">${plan.price}<span className="text-sm text-[var(--text-muted)]">/mo</span></p>
            <p className="text-[var(--text-muted)]">{plan.credits.toLocaleString()} credits/month</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Rate Limits Tab
function RateLimitsTab() {
  const [limits, setLimits] = useState({
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    generationsPerDay: 100,
    maxConcurrent: 5,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Rate Limits</h1>
        <p className="text-[var(--text-muted)]">Configure API rate limiting</p>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 max-w-2xl">
        <div className="space-y-6">
          {Object.entries(limits).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm text-[var(--text-muted)] mb-2 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setLimits({ ...limits, [key]: parseInt(e.target.value) })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
          ))}
          <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
            Save Rate Limits
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Models Tab
interface ProfitSettings {
  profitMargin: number;
  profitMarginImage: number;
  profitMarginVideo: number;
  profitMarginChat: number;
  creditPrice: number;
  freeCredits: number;
}

function ModelsTab({ models, onUpdate }: { models: Model[]; onUpdate: (id: string, updates: Partial<Model>) => void }) {
  const [activeType, setActiveType] = useState('image');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorModel, setCalculatorModel] = useState<Model | null>(null);
  const [profitSettings, setProfitSettings] = useState<ProfitSettings>({
    profitMargin: 0,
    profitMarginImage: 0,
    profitMarginVideo: 0,
    profitMarginChat: 0,
    creditPrice: 1,
    freeCredits: 10,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const filteredModels = models.filter(m => m.type === activeType);

  // Fetch profit settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await response.json();
        setProfitSettings({
          profitMargin: parseFloat(data.profitMargin) || 0,
          profitMarginImage: parseFloat(data.profitMarginImage) || 0,
          profitMarginVideo: parseFloat(data.profitMarginVideo) || 0,
          profitMarginChat: parseFloat(data.profitMarginChat) || 0,
          creditPrice: parseFloat(data.creditPrice) || 1,
          freeCredits: parseFloat(data.freeCredits) || 10,
        });
      } catch (err) {
        console.error('Failed to fetch profit settings');
      }
    };
    fetchSettings();
  }, []);

  // Calculate user-facing credits with profit margin and credit conversion
  const calculateUserCredits = (model: Model) => {
    const baseCost = model.baseCost || model.credits || 0;
    
    let margin = profitSettings.profitMargin || 0;
    if (model.type === 'image' && profitSettings.profitMarginImage > 0) {
      margin = profitSettings.profitMarginImage;
    } else if (model.type === 'video' && profitSettings.profitMarginVideo > 0) {
      margin = profitSettings.profitMarginVideo;
    } else if (model.type === 'chat' && profitSettings.profitMarginChat > 0) {
      margin = profitSettings.profitMarginChat;
    }
    
    const finalUSD = baseCost * (1 + margin / 100);
    const creditPrice = profitSettings.creditPrice || 1;
    const userCredits = finalUSD / creditPrice;
    
    return { baseCost, margin, finalUSD, userCredits, creditPrice };
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(profitSettings)
      });
    } catch (err) {
      console.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Model Pricing</h1>
          <p className="text-[var(--text-muted)]">Configure model costs and availability</p>
        </div>
        <button
          onClick={() => { setCalculatorModel(null); setShowCalculator(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-medium hover:opacity-90 transition-opacity text-white"
        >
          <Calculator className="w-4 h-4" />
          Profit Calculator
        </button>
      </div>

      {/* Profit Margin Settings */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          Profit Margins & Credit Conversion
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Universal %</label>
            <input
              type="number"
              value={profitSettings.profitMargin}
              onChange={(e) => setProfitSettings({...profitSettings, profitMargin: parseFloat(e.target.value) || 0})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Image %</label>
            <input
              type="number"
              value={profitSettings.profitMarginImage}
              onChange={(e) => setProfitSettings({...profitSettings, profitMarginImage: parseFloat(e.target.value) || 0})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Video %</label>
            <input
              type="number"
              value={profitSettings.profitMarginVideo}
              onChange={(e) => setProfitSettings({...profitSettings, profitMarginVideo: parseFloat(e.target.value) || 0})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Chat %</label>
            <input
              type="number"
              value={profitSettings.profitMarginChat}
              onChange={(e) => setProfitSettings({...profitSettings, profitMarginChat: parseFloat(e.target.value) || 0})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">$ per Credit</label>
            <input
              type="number"
              step="0.0001"
              value={profitSettings.creditPrice}
              onChange={(e) => setProfitSettings({...profitSettings, creditPrice: parseFloat(e.target.value) || 1})}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            $1 USD = {(1 / profitSettings.creditPrice).toFixed(0)} credits
          </p>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['image', 'video', 'chat'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeType === type 
                ? type === 'image' ? 'bg-cyan-500 text-white' : type === 'video' ? 'bg-pink-500 text-white' : 'bg-emerald-500 text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {type} ({models.filter(m => m.type === type).length})
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredModels.map(model => {
          const calc = calculateUserCredits(model);
          return (
            <div 
              key={model.id} 
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden"
            >
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    model.type === 'image' ? 'bg-cyan-500/20' : 
                    model.type === 'video' ? 'bg-pink-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {model.type === 'image' && <Image className="w-5 h-5 text-cyan-400" />}
                    {model.type === 'video' && <Video className="w-5 h-5 text-pink-400" />}
                    {model.type === 'chat' && <MessageSquare className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{model.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{model.provider || model.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Base Cost */}
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">Base Cost</p>
                    <p className="font-mono text-sm text-gray-400">${calc.baseCost.toFixed(4)}</p>
                  </div>
                  
                  {/* User Credits */}
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">User Credits</p>
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-mono bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm"
                        title={`Base: $${calc.baseCost.toFixed(4)} + ${calc.margin}% = $${calc.finalUSD.toFixed(4)}`}
                      >
                        {calc.userCredits.toFixed(2)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCalculatorModel(model); setShowCalculator(true); }}
                        className="p-1 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                        title="Calculate profit"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Enable/Disable */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdate(model.id, { enabled: model.enabled ? 0 : 1 }); }}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      model.enabled !== false && model.enabled !== 0
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {model.enabled !== false && model.enabled !== 0 ? 'Enabled' : 'Disabled'}
                  </button>
                  
                  {/* Expand */}
                  <div className="text-[var(--text-muted)]">
                    {expandedModel === model.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedModel === model.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/50">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--text-muted)] text-xs mb-1">API Cost</p>
                          <p className="font-mono text-[var(--text-primary)]">${calc.baseCost.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted)] text-xs mb-1">Profit Margin</p>
                          <p className="font-mono text-yellow-400">{calc.margin}%</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted)] text-xs mb-1">Final USD</p>
                          <p className="font-mono text-[var(--text-primary)]">${calc.finalUSD.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted)] text-xs mb-1">Profit per Gen</p>
                          <p className="font-mono text-green-400">${(calc.finalUSD - calc.baseCost).toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Profit Calculator Modal */}
      <AnimatePresence>
        {showCalculator && (
          <ProfitCalculatorModal 
            onClose={() => { setShowCalculator(false); setCalculatorModel(null); }}
            model={calculatorModel}
            profitSettings={profitSettings}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Profit Calculator Modal
function ProfitCalculatorModal({ 
  onClose, 
  model, 
  profitSettings 
}: { 
  onClose: () => void; 
  model: Model | null; 
  profitSettings: ProfitSettings;
}) {
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
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--border-color)] bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profit Calculator</h2>
                {model && <p className="text-sm text-[var(--text-muted)]">{model.name}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">API Cost ($)</label>
              <input
                type="number"
                step="0.0001"
                value={apiCost}
                onChange={(e) => setApiCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Margin (%)</label>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">$ per Credit</label>
              <input
                type="number"
                step="0.0001"
                value={creditPrice}
                onChange={(e) => setCreditPrice(parseFloat(e.target.value) || 1)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Results */}
          <div className="bg-[var(--bg-primary)] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Final Price (with margin)</span>
              <span className="font-mono text-[var(--text-primary)]">${finalPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Credits Charged</span>
              <span className="font-mono text-cyan-400">{creditsCharged.toFixed(2)} credits</span>
            </div>
            <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-3">
              <span className="text-[var(--text-muted)]">Profit per Generation</span>
              <span className="font-mono text-green-400">${profitPerGeneration.toFixed(4)}</span>
            </div>
          </div>

          {/* Projections */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[var(--bg-primary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">100 gens</p>
              <p className="font-mono text-green-400">${(profitPerGeneration * 100).toFixed(2)}</p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">1K gens</p>
              <p className="font-mono text-green-400">${(profitPerGeneration * 1000).toFixed(2)}</p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">10K gens</p>
              <p className="font-mono text-green-400">${(profitPerGeneration * 10000).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Feature Flags Tab
function FeatureFlagsTab() {
  const [flags, setFlags] = useState([
    { id: 'multi_model', name: 'Multi-Model Generation', enabled: true, description: 'Allow users to compare multiple models' },
    { id: 'community', name: 'Community Gallery', enabled: true, description: 'Public gallery for shared generations' },
    { id: 'workspaces', name: 'Team Workspaces', enabled: true, description: 'Collaborative workspaces for teams' },
    { id: 'video_gen', name: 'Video Generation', enabled: true, description: 'Enable video generation models' },
    { id: 'chat', name: 'AI Chat', enabled: true, description: 'Enable chat/conversation features' },
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Feature Flags</h1>
        <p className="text-[var(--text-muted)]">Toggle platform features</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {flags.map(flag => (
          <div key={flag.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{flag.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{flag.description}</p>
            </div>
            <button
              onClick={() => setFlags(flags.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))}
              className={`p-2 rounded-lg transition-colors ${flag.enabled ? 'text-green-400' : 'text-[var(--text-muted)]'}`}
            >
              {flag.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// AI Tools Tab
function AiToolsTab() {
  const [tools, setTools] = useState([
    { id: 'image-gen', name: 'Image Generation', icon: 'Image', enabled: true },
    { id: 'video-gen', name: 'Video Generation', icon: 'Video', enabled: true },
    { id: 'chat', name: 'AI Chat', icon: 'MessageSquare', enabled: true },
    { id: 'upscale', name: 'Image Upscaling', icon: 'Zap', enabled: true },
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">AI Tools</h1>
        <p className="text-[var(--text-muted)]">Manage available AI tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map(tool => (
          <div key={tool.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">{tool.name}</h3>
            <button
              onClick={() => setTools(tools.map(t => t.id === tool.id ? { ...t, enabled: !t.enabled } : t))}
              className={`px-4 py-2 rounded-lg text-sm ${tool.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {tool.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Landing Featured Tab
function LandingFeaturedTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Featured Content</h1>
        <p className="text-[var(--text-muted)]">Manage landing page featured content</p>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
        <p className="text-[var(--text-muted)]">Featured content management coming soon</p>
      </div>
    </motion.div>
  );
}

// Community Gallery Tab
function CommunityGalleryTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/community`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Community Gallery</h1>
        <p className="text-[var(--text-muted)]">Moderate community posts</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
          <Image className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No community posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map(post => (
            <div key={post.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
              <img src={post.imageUrl || post.thumbnailUrl} alt="" className="w-full aspect-square object-cover" />
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{post.likeCount || 0} likes</span>
                  <button className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Landing Models Tab
function LandingModelsTab() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Landing Models</h1>
        <p className="text-[var(--text-muted)]">Configure models shown on landing page</p>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
        <Globe className="w-12 h-12 mx-auto mb-4 text-purple-400" />
        <p className="text-[var(--text-muted)]">Landing models configuration coming soon</p>
      </div>
    </motion.div>
  );
}

// Announcements Tab
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([
    { id: '1', title: 'New Video Models Available', content: 'Check out our new video generation models!', active: true, createdAt: new Date().toISOString() },
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Announcements</h1>
          <p className="text-[var(--text-muted)]">Manage platform announcements</p>
        </div>
        <button className="px-4 py-2 bg-purple-500 text-white rounded-xl flex items-center gap-2 hover:bg-purple-600 transition-colors">
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{ann.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{ann.content}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${ann.active ? 'bg-green-500/20 text-green-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                {ann.active ? 'Active' : 'Draft'}
              </span>
              <button className="p-2 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Audit Logs Tab
function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Audit Logs</h1>
        <p className="text-[var(--text-muted)]">Track admin actions</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No audit logs available</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Action</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--text-muted)]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-[var(--bg-tertiary)]">
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{log.action}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{log.userId}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{log.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// Error Logs Tab
function ErrorLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/error-logs`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Error Logs</h1>
        <p className="text-[var(--text-muted)]">Monitor system errors</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
          <Check className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <p className="text-[var(--text-muted)]">No errors to display</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, i) => (
            <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="font-medium text-red-400">{log.error}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{log.createdAt}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Settings Tab
function SettingsTab({ settings, setSettings, onSave, saveStatus }: {
  settings: AdminSettings;
  setSettings: (s: AdminSettings) => void;
  onSave: () => void;
  saveStatus: 'success' | 'error' | null;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Platform Settings</h1>
        <p className="text-[var(--text-muted)]">Configure global platform settings</p>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6 max-w-2xl">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Profit Margins</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Universal Margin (%)</label>
              <input
                type="number"
                value={settings.profitMargin}
                onChange={(e) => setSettings({ ...settings, profitMargin: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Image Margin (%)</label>
              <input
                type="number"
                value={settings.profitMarginImage}
                onChange={(e) => setSettings({ ...settings, profitMarginImage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Video Margin (%)</label>
              <input
                type="number"
                value={settings.profitMarginVideo}
                onChange={(e) => setSettings({ ...settings, profitMarginVideo: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Chat Margin (%)</label>
              <input
                type="number"
                value={settings.profitMarginChat}
                onChange={(e) => setSettings({ ...settings, profitMarginChat: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Credit Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Free Credits for New Users</label>
              <input
                type="number"
                value={settings.freeCredits}
                onChange={(e) => setSettings({ ...settings, freeCredits: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Credit Price (USD)</label>
              <input
                type="number"
                step="0.001"
                value={settings.creditPrice}
                onChange={(e) => setSettings({ ...settings, creditPrice: parseFloat(e.target.value) || 0.001 })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onSave}
          className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            saveStatus === 'success' ? 'bg-green-500 text-white' : 
            saveStatus === 'error' ? 'bg-red-500 text-white' : 
            'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90'
          }`}
        >
          {saveStatus === 'success' ? <><Check className="w-5 h-5" /> Saved!</> : 
           saveStatus === 'error' ? <><X className="w-5 h-5" /> Error</> : 
           <><Save className="w-5 h-5" /> Save Settings</>}
        </button>
      </div>
    </motion.div>
  );
}
