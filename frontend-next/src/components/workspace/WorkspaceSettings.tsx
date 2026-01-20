'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Settings, Users, CreditCard, Shield, 
  Trash2, Save, Plus, Copy, Check, Crown,
  UserMinus, ChevronUp, ChevronDown, Mail, Loader2
} from 'lucide-react';

const API_BASE = '/api';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  isDefault?: boolean;
  credits?: number;
  creditMode?: string;
  privacySettings?: Record<string, string>;
  userRole?: string;
}

interface Member {
  userId: string;
  name?: string;
  email?: string;
  role: string;
  allocatedCredits?: number;
}

interface CreditUsage {
  workspaceCredits?: number;
  totalUsed?: number;
  byType?: { type: string; total: number; count: number }[];
}

interface WorkspaceSettingsProps {
  workspace: Workspace | null;
  onClose: () => void;
  onUpdate?: (workspace: Workspace) => void;
  onDelete?: (workspaceId: string) => void;
  currentUserId?: string;
}

export default function WorkspaceSettings({ 
  workspace, 
  onClose, 
  onUpdate, 
  onDelete,
  currentUserId 
}: WorkspaceSettingsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
  const [addCreditsAmount, setAddCreditsAmount] = useState('');
  
  const [name, setName] = useState(workspace?.name || '');
  const [creditMode, setCreditMode] = useState(workspace?.creditMode || 'shared');
  const [privacySettings, setPrivacySettings] = useState<Record<string, string>>(workspace?.privacySettings || {});

  const getAuthHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('userToken')}`
  });

  const isOwner = workspace?.ownerId === currentUserId;
  const isAdmin = workspace?.userRole === 'admin' || isOwner;

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setCreditMode(workspace.creditMode || 'shared');
      setPrivacySettings(workspace.privacySettings || {});
      fetchMembers();
      fetchCreditUsage();
    }
  }, [workspace?.id]);

  const fetchMembers = async () => {
    if (!workspace) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/members`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchCreditUsage = async () => {
    if (!workspace) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/credits/usage`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCreditUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch credit usage:', err);
    }
  };

  const handleSave = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, creditMode, privacySettings })
      });
      onUpdate?.({ ...workspace, name, creditMode, privacySettings });
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workspace) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ email: inviteEmail.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.inviteLink || '');
        setInviteEmail('');
        alert('Invitation sent!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to send invite');
      }
    } catch (err) {
      alert('Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateMember = async (userId: string, updates: { role: string }) => {
    if (!workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates)
      });
      fetchMembers();
    } catch (err) {
      alert('Failed to update member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?') || !workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchMembers();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(addCreditsAmount);
    if (!amount || amount <= 0 || !workspace) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}/credits/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ amount })
      });
      setAddCreditsAmount('');
      fetchCreditUsage();
      onUpdate?.({ ...workspace, credits: (workspace.credits || 0) + amount });
    } catch (err) {
      alert('Failed to add credits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workspace? This cannot be undone.') || !workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      onDelete?.(workspace.id);
      onClose();
    } catch (err) {
      alert('Failed to delete workspace');
    }
  };

  const updatePrivacy = (key: string, value: string) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  if (!workspace) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workspace Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Workspace Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-cyan-500 disabled:opacity-50 text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Credit Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => isAdmin && setCreditMode('shared')}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      creditMode === 'shared'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm text-[var(--text-primary)]">Shared Pool</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Everyone uses workspace credits</div>
                  </button>
                  <button
                    onClick={() => isAdmin && setCreditMode('individual')}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      creditMode === 'individual'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm text-[var(--text-primary)]">Individual</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Allocate credits per member</div>
                  </button>
                </div>
              </div>

              {isOwner && !workspace.isDefault && (
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Workspace
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {isAdmin && (
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                    <Mail className="w-4 h-4" />
                    Invite Members
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 text-[var(--text-primary)]"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={loading || !inviteEmail.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 text-white"
                    >
                      Invite
                    </button>
                  </div>
                  {inviteLink && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-muted)]"
                      />
                      <button onClick={handleCopyLink} className="p-2 hover:bg-[var(--bg-primary)] rounded-lg">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.userId} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate text-[var(--text-primary)]">{member.name || 'Unknown'}</span>
                        {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-400" />}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{member.email}</div>
                    </div>

                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                      member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}>
                      {member.role}
                    </span>

                    {creditMode === 'individual' && (
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-cyan-400">{member.allocatedCredits?.toFixed(2) || '0.00'}</span>
                      </div>
                    )}

                    {isAdmin && member.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => handleUpdateMember(member.userId, { role: 'admin' })}
                            className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-white"
                            title="Promote to Admin"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {member.role === 'admin' && (
                          <button
                            onClick={() => handleUpdateMember(member.userId, { role: 'member' })}
                            className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-white"
                            title="Demote to Member"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-[var(--text-muted)] hover:text-red-400"
                          title="Remove"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] py-4">No members yet</p>
                )}
              </div>
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-sm text-[var(--text-muted)]">Workspace Credits</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {workspace.isDefault ? 'Uses Personal Credits' : (parseFloat(String(workspace.credits)) || 0).toFixed(2)}
                </div>
              </div>

              {isOwner && !workspace.isDefault && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Add Credits</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addCreditsAmount}
                      onChange={(e) => setAddCreditsAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="1"
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-cyan-500 text-[var(--text-primary)]"
                    />
                    <button
                      onClick={handleAddCredits}
                      disabled={loading || !addCreditsAmount}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {creditUsage?.byType && (
                <div>
                  <h3 className="font-medium mb-3 text-[var(--text-primary)]">Usage Statistics</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {creditUsage.byType.map(stat => (
                      <div key={stat.type} className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-muted)] capitalize">{stat.type}</div>
                        <div className="text-lg font-semibold text-[var(--text-primary)]">{stat.total?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{stat.count} generations</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 text-[var(--text-primary)]">Content Visibility</h3>
                <div className="space-y-3">
                  {[
                    { key: 'imageVisibility', label: 'Image Generations' },
                    { key: 'videoVisibility', label: 'Video Generations' },
                    { key: 'chatVisibility', label: 'Chat Conversations' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <span className="text-sm text-[var(--text-primary)]">{label}</span>
                      <select
                        value={privacySettings[key] || 'private'}
                        onChange={(e) => updatePrivacy(key, e.target.value)}
                        disabled={!isAdmin}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                      >
                        <option value="private">Private</option>
                        <option value="workspace">Visible to Workspace</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-[var(--text-primary)]">Permissions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-sm text-[var(--text-primary)]">Who can invite members</span>
                    <select
                      value={privacySettings.whoCanInvite || 'admins'}
                      onChange={(e) => updatePrivacy('whoCanInvite', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="all_members">All Members</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-sm text-[var(--text-primary)]">Who can allocate credits</span>
                    <select
                      value={privacySettings.whoCanAllocateCredits || 'owner_only'}
                      onChange={(e) => updatePrivacy('whoCanAllocateCredits', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="none">Nobody</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
