import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthModal from '../shared/AuthModal';
import PricingModal from '../shared/PricingModal';
import { WorkspaceSettings, CreateWorkspaceModal } from '../workspace';

const API_BASE = 'http://localhost:3001/api';

export default function AppLayout({ children, title, subtitle, showHeader = true }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState(null);
  
  // Credit animation state
  const [creditAnimation, setCreditAnimation] = useState(null); // { delta, type: 'deduct' | 'refund' }
  
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

  const fetchUser = async (token) => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      
      // Set workspaces from user data
      if (response.data.workspaces) {
        setWorkspaces(response.data.workspaces);
        // Set default workspace as active
        const defaultWs = response.data.defaultWorkspace || response.data.workspaces[0];
        setActiveWorkspace(defaultWs);
      }
    } catch (err) {
      localStorage.removeItem('userToken');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
      });
      setWorkspaces(response.data);
      
      // Auto-select workspace after fetching
      if (response.data.length > 0) {
        // Check if there's a saved workspace preference
        const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
        const savedWorkspace = savedWorkspaceId 
          ? response.data.find(w => w.id === savedWorkspaceId) 
          : null;
        
        // Use saved workspace, or default workspace, or first workspace
        const defaultWs = savedWorkspace 
          || response.data.find(w => w.isDefault) 
          || response.data[0];
        
        setActiveWorkspace(defaultWs);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('activeWorkspaceId');
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    // Redirect to landing page
    navigate('/');
  };

  const handleAuthSuccess = (userData, token) => {
    localStorage.setItem('userToken', token);
    setUser(userData);
    setShowAuthModal(false);
    
    // Fetch workspaces after login
    fetchWorkspaces();
  };

  const updateUserCredits = (newCredits) => {
    setUser(prev => {
      if (!prev) return null;
      
      // Calculate delta for animation
      const delta = newCredits - prev.credits;
      if (delta !== 0) {
        setCreditAnimation({
          delta: Math.abs(delta),
          type: delta < 0 ? 'deduct' : 'refund'
        });
        
        // Clear animation after 2.5 seconds
        setTimeout(() => setCreditAnimation(null), 2500);
      }
      
      return { ...prev, credits: newCredits };
    });
  };

  const handleWorkspaceSwitch = (workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('activeWorkspaceId', workspace.id);
  };

  const handleOpenWorkspaceSettings = (workspace) => {
    setSettingsWorkspace(workspace);
    setShowWorkspaceSettings(true);
  };

  const handleWorkspaceUpdate = (updatedWorkspace) => {
    setWorkspaces(prev => prev.map(w => w.id === updatedWorkspace.id ? updatedWorkspace : w));
    if (activeWorkspace?.id === updatedWorkspace.id) {
      setActiveWorkspace(updatedWorkspace);
    }
  };

  const handleWorkspaceDelete = (workspaceId) => {
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    if (activeWorkspace?.id === workspaceId) {
      const defaultWs = workspaces.find(w => w.isDefault);
      setActiveWorkspace(defaultWs || workspaces[0]);
    }
  };

  const handleWorkspaceCreate = (newWorkspace) => {
    setWorkspaces(prev => [...prev, { ...newWorkspace, userRole: 'owner', memberCount: 1 }]);
    setActiveWorkspace(newWorkspace);
  };

  // Handler for opening workspace settings with active workspace
  const handleOpenActiveWorkspaceSettings = () => {
    if (activeWorkspace) {
      handleOpenWorkspaceSettings(activeWorkspace);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-300">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        theme={theme}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {showHeader && (
          <Header 
            user={user} 
            title={title} 
            subtitle={subtitle}
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onWorkspaceSwitch={handleWorkspaceSwitch}
            onWorkspaceSettings={handleOpenWorkspaceSettings}
            onCreateWorkspace={() => setShowCreateWorkspace(true)}
            onInviteUsers={(workspace) => {
              // Open workspace settings with invite section focused
              handleOpenWorkspaceSettings(workspace);
            }}
            creditAnimation={creditAnimation}
            onAddCredits={() => setShowPricingModal(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          {typeof children === 'function' 
            ? children({ 
                user, 
                setUser, 
                updateUserCredits,
                showAuthModal: () => setShowAuthModal(true),
                loading,
                workspaces,
                activeWorkspace,
                setActiveWorkspace: handleWorkspaceSwitch,
                refreshWorkspaces: fetchWorkspaces,
                onOpenWorkspaceSettings: handleOpenActiveWorkspaceSettings
              })
            : children
          }
        </div>
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
        
        {showWorkspaceSettings && settingsWorkspace && (
          <WorkspaceSettings
            workspace={settingsWorkspace}
            onClose={() => { setShowWorkspaceSettings(false); setSettingsWorkspace(null); }}
            onUpdate={handleWorkspaceUpdate}
            onDelete={handleWorkspaceDelete}
            currentUserId={user?.id}
          />
        )}
        
        {showCreateWorkspace && (
          <CreateWorkspaceModal
            onClose={() => setShowCreateWorkspace(false)}
            onCreate={handleWorkspaceCreate}
          />
        )}
        
        {showPricingModal && (
          <PricingModal
            isOpen={showPricingModal}
            onClose={() => setShowPricingModal(false)}
            user={user}
            onSuccess={(result) => {
              // Update user credits after successful subscription
              if (result.credits) {
                updateUserCredits(result.credits);
              }
              setShowPricingModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
