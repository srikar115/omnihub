'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Check, Plus, Settings, Users, 
  Building2, User, UserPlus, Zap
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  isDefault?: boolean;
  memberCount?: number;
  credits?: number;
  userRole?: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSwitch: (workspace: Workspace) => void;
  onOpenSettings?: (workspace: Workspace) => void;
  onCreateNew?: () => void;
  onInviteUsers?: (workspace: Workspace) => void;
  disabled?: boolean;
}

export function WorkspaceSwitcher({ 
  workspaces, 
  activeWorkspace, 
  onSwitch, 
  onOpenSettings,
  onCreateNew,
  onInviteUsers,
  disabled 
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [isOpen]);

  const getWorkspaceIcon = (workspace?: Workspace | null) => {
    if (workspace?.isDefault) return User;
    return Building2;
  };

  const Icon = getWorkspaceIcon(activeWorkspace);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] border border-[var(--border-color)] rounded-xl transition-colors disabled:opacity-50"
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-medium max-w-32 truncate text-[var(--text-primary)]">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[100] overflow-hidden"
          >
            {/* Workspaces List */}
            <div className="max-h-64 overflow-y-auto py-2 bg-[var(--bg-primary)]">
              {workspaces.map(workspace => {
                const WsIcon = getWorkspaceIcon(workspace);
                const isActive = activeWorkspace?.id === workspace.id;
                
                return (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      onSwitch(workspace);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 ${
                      isActive ? 'bg-[var(--bg-tertiary)] border-l-2 border-cyan-500' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                      workspace.isDefault 
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      <WsIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate text-[var(--text-primary)]">{workspace.name}</span>
                        {workspace.isDefault && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                            Personal
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {workspace.memberCount || 1}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400 font-medium">{workspace.credits?.toFixed(2) || '0.00'}</span>
                        </span>
                        <span className="capitalize text-[var(--text-muted)]">
                          {workspace.userRole || 'Owner'}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="border-t border-[var(--border-color)] p-2 bg-[var(--bg-secondary)]">
              <button
                onClick={() => {
                  onCreateNew?.();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Workspace
              </button>
              
              {activeWorkspace && (
                <button
                  onClick={() => {
                    onInviteUsers?.(activeWorkspace);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Team Members
                </button>
              )}
              
              {activeWorkspace && (
                <button
                  onClick={() => {
                    onOpenSettings?.(activeWorkspace);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Workspace Settings
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
