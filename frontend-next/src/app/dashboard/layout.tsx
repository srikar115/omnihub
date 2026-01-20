'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout';
import { Header } from '@/components/layout';
import { AuthModal, PricingModal } from '@/components/shared';
import { CreateWorkspaceModal } from '@/components/workspace';

const API_BASE = '/api';

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  reservedCredits?: number;
  workspaces?: Workspace[];
  defaultWorkspace?: Workspace;
}

interface Workspace {
  id: string;
  name: string;
  isDefault?: boolean;
  memberCount?: number;
  userRole?: string;
  credits?: number;
  creditMode?: string;
}

interface CreditAnimation {
  delta: number;
  type: 'deduct' | 'refund';
}

interface DashboardContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserCredits: (credits: number) => void;
  showAuthModal: () => void;
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  setUser: () => {},
  updateUserCredits: () => {},
  showAuthModal: () => {},
  loading: true,
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  refreshWorkspaces: async () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  
  // Credit animation state
  const [creditAnimation, setCreditAnimation] = useState<CreditAnimation | null>(null);
  
  // Pricing modal state
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Auth failed');
      }
      
      const userData = await response.json();
      setUser(userData);
      
      if (userData.workspaces) {
        setWorkspaces(userData.workspaces);
        const defaultWs = userData.defaultWorkspace || userData.workspaces[0];
        setActiveWorkspaceState(defaultWs);
      }
    } catch (err) {
      localStorage.removeItem('userToken');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` },
      });
      const data = await response.json();
      setWorkspaces(data);
      
      if (data.length > 0) {
        const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
        const savedWorkspace = savedWorkspaceId 
          ? data.find((w: Workspace) => w.id === savedWorkspaceId) 
          : null;
        
        const defaultWs = savedWorkspace 
          || data.find((w: Workspace) => w.isDefault) 
          || data[0];
        
        setActiveWorkspaceState(defaultWs);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  };

  const handleLogout = async () => {
    // Use the auth.logout to properly revoke the refresh token
    const { auth: authHelper } = await import('@/lib/api');
    await authHelper.logout();
    localStorage.removeItem('activeWorkspaceId');
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    router.push('/');
  };

  const handleAuthSuccess = (userData: User) => {
    // Tokens are automatically stored by the auth helpers
    setUser(userData);
    setShowAuth(false);
    fetchWorkspaces();
  };

  const updateUserCredits = (newCredits: number) => {
    setUser(prev => {
      if (!prev) return null;
      
      const delta = newCredits - prev.credits;
      if (delta !== 0) {
        setCreditAnimation({
          delta: Math.abs(delta),
          type: delta < 0 ? 'deduct' : 'refund'
        });
        
        setTimeout(() => setCreditAnimation(null), 2500);
      }
      
      return { ...prev, credits: newCredits };
    });
  };

  const handleWorkspaceSwitch = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('activeWorkspaceId', workspace.id);
  };

  const handleWorkspaceCreate = (newWorkspace: Workspace) => {
    setWorkspaces(prev => [...prev, { ...newWorkspace, userRole: 'owner', memberCount: 1 }]);
    setActiveWorkspaceState(newWorkspace);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const contextValue: DashboardContextType = {
    user,
    setUser,
    updateUserCredits,
    showAuthModal: () => setShowAuth(true),
    loading,
    workspaces,
    activeWorkspace,
    setActiveWorkspace: handleWorkspaceSwitch,
    refreshWorkspaces: fetchWorkspaces,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-300">
        <Sidebar
          user={user}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 flex flex-col min-h-screen">
          <Header 
            user={user}
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onWorkspaceSwitch={handleWorkspaceSwitch}
            onWorkspaceSettings={() => {}}
            onCreateWorkspace={() => setShowCreateWorkspace(true)}
            onInviteUsers={() => {}}
            creditAnimation={creditAnimation}
            onAddCredits={() => setShowPricingModal(true)}
          />

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        <AnimatePresence>
          {showAuth && (
            <AuthModal
              onClose={() => setShowAuth(false)}
              onSuccess={handleAuthSuccess}
            />
          )}
          
          {showCreateWorkspace && (
            <CreateWorkspaceModal
              onClose={() => setShowCreateWorkspace(false)}
              onCreate={handleWorkspaceCreate}
            />
          )}
          
          {showPricingModal && user && (
            <PricingModal
              isOpen={showPricingModal}
              onClose={() => setShowPricingModal(false)}
              user={user}
              onSuccess={(result) => {
                if (result.credits) {
                  updateUserCredits(result.credits);
                }
                setShowPricingModal(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardContext.Provider>
  );
}
