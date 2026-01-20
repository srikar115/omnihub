import { Zap, Plus, Settings, Bell, Sun, Moon, Building2, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceSwitcher } from '../workspace';

// Helper to get unified credit display based on workspace context
function getDisplayCredits(user, activeWorkspace) {
  if (!user) {
    return { amount: 0, label: 'credits', icon: 'personal' };
  }
  
  // Default workspace or no workspace - use personal credits
  if (!activeWorkspace || activeWorkspace.isDefault) {
    return { amount: user.credits, label: 'credits', icon: 'personal' };
  }
  
  // Team workspace with individual mode - use allocated credits
  if (activeWorkspace.creditMode === 'individual' && activeWorkspace.allocatedCredits !== undefined) {
    return { amount: activeWorkspace.allocatedCredits, label: 'allocated', icon: 'allocated' };
  }
  
  // Team workspace with shared mode - use workspace credits
  if (activeWorkspace.credits !== undefined) {
    return { amount: activeWorkspace.credits, label: 'workspace', icon: 'workspace' };
  }
  
  // Fallback to personal credits
  return { amount: user.credits, label: 'credits', icon: 'personal' };
}

export default function Header({ 
  user, 
  title, 
  subtitle,
  workspaces,
  activeWorkspace,
  onWorkspaceSwitch,
  onWorkspaceSettings,
  onCreateWorkspace,
  onInviteUsers,
  creditAnimation,
  onAddCredits,
  theme,
  onToggleTheme
}) {
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Check if we should show the title section
  const showTitleSection = title || subtitle;

  return (
    <header className="flex-shrink-0 px-8 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)] backdrop-blur-sm relative z-50 transition-colors duration-300">
      <div className="flex items-center gap-6">
        {/* Title section - only show if title or subtitle provided */}
        {showTitleSection && (
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[var(--text-secondary)] text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
        
        {/* Workspace Switcher - always visible for logged in users */}
        {user && workspaces && workspaces.length > 0 && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onSwitch={onWorkspaceSwitch}
            onOpenSettings={onWorkspaceSettings}
            onCreateNew={onCreateWorkspace}
            onInviteUsers={onInviteUsers}
          />
        )}

        {/* Credits display moved to the right side with animation */}
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onAddCredits}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl transition-all text-white font-medium shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Credits</span>
        </button>
        
        {/* Unified Credits Display with Animation */}
        {user && (() => {
          const displayCredits = getDisplayCredits(user, activeWorkspace);
          const CreditIcon = displayCredits.icon === 'workspace' ? Building2 
            : displayCredits.icon === 'allocated' ? UserIcon 
            : Zap;
          const iconColor = displayCredits.icon === 'workspace' ? 'text-purple-400'
            : displayCredits.icon === 'allocated' ? 'text-amber-400'
            : 'text-cyan-400';
          
          return (
            <div className="relative">
              <motion.div 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border ${
                  creditAnimation?.type === 'deduct' 
                    ? 'bg-red-500/20 border-red-500/30' 
                    : creditAnimation?.type === 'refund'
                    ? 'bg-green-500/20 border-green-500/30'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                }`}
                animate={creditAnimation ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <CreditIcon className={`w-4 h-4 ${
                  creditAnimation?.type === 'deduct' 
                    ? 'text-red-400' 
                    : creditAnimation?.type === 'refund'
                    ? 'text-green-400'
                    : iconColor
                }`} />
                <span className={`text-sm font-mono font-medium ${
                  creditAnimation?.type === 'deduct' 
                    ? 'text-red-400' 
                    : creditAnimation?.type === 'refund'
                    ? 'text-green-400'
                    : 'text-[var(--text-primary)]'
                }`}>
                  {displayCredits.amount?.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{displayCredits.label}</span>
              </motion.div>
              
              {/* Floating delta indicator */}
              <AnimatePresence>
                {creditAnimation && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -20 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute -top-2 right-0 text-xs font-bold ${
                      creditAnimation.type === 'deduct' ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {creditAnimation.type === 'deduct' ? '-' : '+'}{creditAnimation.delta.toFixed(2)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}
        
        {/* Theme Toggle */}
        <button 
          onClick={onToggleTheme}
          className="p-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>

        <button className="p-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors relative">
          <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full"></span>
        </button>
        
        <button 
          onClick={() => navigate('/admin/login')}
          className="p-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          title="Admin Panel"
        >
          <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
        
        {user && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold cursor-pointer hover:scale-105 transition-transform">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </header>
  );
}
