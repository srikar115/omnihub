'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Settings, Bell, Sun, Moon, Building2, User as UserIcon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { WorkspaceSwitcher } from '@/components/workspace';

interface Workspace {
  id: string;
  name: string;
  isDefault?: boolean;
  memberCount?: number;
  userRole?: string;
  credits?: number;
  creditMode?: string;
  allocatedCredits?: number; // For individual credit mode
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
}

interface CreditAnimation {
  delta: number;
  type: 'deduct' | 'refund';
}

interface HeaderProps {
  user: User | null;
  title?: string;
  subtitle?: string;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onWorkspaceSwitch: (workspace: Workspace) => void;
  onWorkspaceSettings: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onInviteUsers: (workspace: Workspace) => void;
  creditAnimation: CreditAnimation | null;
  onAddCredits: () => void;
}

// Helper to get unified credit display based on workspace context
function getDisplayCredits(user: User | null, activeWorkspace: Workspace | null): {
  amount: number;
  label: string;
  icon: 'personal' | 'workspace' | 'allocated';
} {
  // Helper to safely convert to number
  const toNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
  };

  if (!user) {
    return { amount: 0, label: 'credits', icon: 'personal' };
  }
  
  // Default workspace or no workspace - use personal credits
  if (!activeWorkspace || activeWorkspace.isDefault) {
    return { amount: toNumber(user.credits), label: 'credits', icon: 'personal' };
  }
  
  // Team workspace with individual mode - use allocated credits
  if (activeWorkspace.creditMode === 'individual' && activeWorkspace.allocatedCredits !== undefined) {
    return { amount: toNumber(activeWorkspace.allocatedCredits), label: 'allocated', icon: 'allocated' };
  }
  
  // Team workspace with shared mode - use workspace credits
  if (activeWorkspace.credits !== undefined) {
    return { amount: toNumber(activeWorkspace.credits), label: 'workspace', icon: 'workspace' };
  }
  
  // Fallback to personal credits
  return { amount: toNumber(user.credits), label: 'credits', icon: 'personal' };
}

export function Header({ 
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
}: HeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const showTitleSection = title || subtitle;

  return (
    <header className="flex-shrink-0 px-8 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)] backdrop-blur-sm relative z-50 transition-colors duration-300">
      <div className="flex items-center gap-6">
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
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onAddCredits}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl transition-all text-white font-medium shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Credits</span>
        </button>
        
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
        
        <button 
          onClick={toggleTheme}
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
          onClick={() => router.push('/admin/login')}
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
