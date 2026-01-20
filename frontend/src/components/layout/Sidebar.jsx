import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Sparkles,
  Image,
  Video,
  MessageSquare,
  Box,
  History,
  Workflow,
  Receipt,
  CreditCard,
  HelpCircle,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  Users,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', path: '/dashboard/home', icon: Home, label: 'Dashboard', description: 'Overview' },
  { id: 'omnihub', path: '/omnihub', icon: Sparkles, label: 'Omni Hub', description: 'Unified workspace', badge: 'New' },
  { id: 'images', path: '/omnihub?type=image&filter=image', icon: Image, label: 'Images', description: 'Image generation' },
  { id: 'videos', path: '/omnihub?type=video&filter=video', icon: Video, label: 'Videos', description: 'Video generation' },
  { id: 'chat', path: '/omnihub?type=chat&filter=chat', icon: MessageSquare, label: 'Chat', description: 'AI conversation' },
  { id: 'image-to-3d', path: '#', icon: Box, label: 'Image to 3D', description: '3D model generation', badge: 'Soon', disabled: true },
  { id: 'history', path: '/omnihub?view=history', icon: History, label: 'History', description: 'Past creations' },
  { id: 'ai-tools', path: '#', icon: Workflow, label: 'AI Tools', description: 'AI workflows', disabled: true },
  { id: 'transactions', path: '#', icon: Receipt, label: 'Transactions', description: 'Credit transactions', disabled: true },
  { id: 'subscriptions', path: '#', icon: CreditCard, label: 'Subscriptions', description: 'Manage subscriptions', disabled: true },
  { id: 'support', path: '#', icon: HelpCircle, label: 'Support', description: 'Get help', disabled: true },
];

const bottomNavItems = [
  { id: 'profile', path: '/profile', icon: User, label: 'Profile', description: 'Your account' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'Workspace Settings', description: 'Manage workspace' },
];

export default function Sidebar({ user, onLogout, collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const getActiveId = () => {
    const path = location.pathname;
    const search = location.search;
    
    if (path === '/dashboard/home') return 'dashboard';
    if (path === '/profile') return 'profile';
    if (path === '/settings') return 'settings';
    if (path === '/omnihub') {
      // Check for filter parameter first (more specific)
      if (search.includes('filter=image')) return 'images';
      if (search.includes('filter=video')) return 'videos';
      if (search.includes('filter=chat')) return 'chat';
      // Fall back to type parameter
      if (search.includes('type=image') && !search.includes('filter=')) return 'images';
      if (search.includes('type=video') && !search.includes('filter=')) return 'videos';
      if (search.includes('type=chat') && !search.includes('filter=')) return 'chat';
      if (search.includes('view=history')) return 'history';
      return 'omnihub';
    }
    return 'dashboard';
  };

  const activeId = getActiveId();

  const handleNavClick = (item) => {
    if (item.disabled) return;
    if (item.path === '#') return;
    navigate(item.path);
  };

  return (
    <aside 
      className={`${collapsed ? 'w-20' : 'w-64'} bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 flex-shrink-0 relative`}
    >
      {/* Logo */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 p-[2px] flex-shrink-0">
            <div className="w-full h-full rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <h1 className="font-bold text-lg text-[var(--text-primary)]">OmniHub</h1>
              <p className="text-xs text-[var(--text-muted)]">AI Platform</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full flex items-center justify-center hover:bg-[var(--card-hover)] transition-colors z-10"
      >
        <ChevronLeft className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeId === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : item.disabled
                  ? 'text-[var(--text-muted)] cursor-not-allowed opacity-50'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.disabled ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]' : 'bg-cyan-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.disabled && (
                    <span className="text-xs text-[var(--text-muted)]">Soon</span>
                  )}
                </>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-2 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg whitespace-nowrap z-50 shadow-lg"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                </motion.div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Tip */}
      {!collapsed && (
        <div className="p-3">
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Quick Tip</p>
            <p className="text-xs text-[var(--text-muted)]">Use detailed prompts for better results</p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-1">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-[var(--border-color)]">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          !collapsed && (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-sm font-medium text-white transition-colors"
            >
              Sign In
            </button>
          )
        )}
      </div>
    </aside>
  );
}
