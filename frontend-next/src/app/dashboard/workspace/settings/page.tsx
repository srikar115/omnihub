'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Settings, Users, CreditCard, Shield, 
  Trash2, Save, Plus, Copy, Check, Crown,
  UserMinus, Mail, ArrowLeft, Loader2
} from 'lucide-react';

const API_BASE = '/api';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

interface Member {
  id: string;
  userId: string;
  name?: string;
  email: string;
  role: string;
}

interface CreditUsage {
  workspaceCredits: number;
  totalUsed: number;
  usageByType?: { type: string; count: number; total: number }[];
}

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

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
  const [addCreditsAmount, setAddCreditsAmount] = useState('');
  
  const [name, setName] = useState('');
  const [creditMode, setCreditMode] = useState('shared');
  const [privacySettings, setPrivacySettings] = useState<Record<string, string>>({});

  const getAuthHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('userToken')}`
  });

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Get user
        const userRes = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        // Get active workspace from localStorage or default
        const activeWorkspaceId = localStorage.getItem('activeWorkspaceId');
        if (activeWorkspaceId) {
          const wsRes = await fetch(`${API_BASE}/workspaces/${activeWorkspaceId}`, { headers: getAuthHeaders() });
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            setWorkspace(wsData);
            setName(wsData.name || '');
            setCreditMode(wsData.creditMode || 'shared');
            setPrivacySettings(wsData.privacySettings || {});
          }
        } else {
          // Get workspaces and use first one
          const workspacesRes = await fetch(`${API_BASE}/workspaces`, { headers: getAuthHeaders() });
          if (workspacesRes.ok) {
            const workspaces = await workspacesRes.json();
            if (workspaces.length > 0) {
              setWorkspace(workspaces[0]);
              setName(workspaces[0].name || '');
              setCreditMode(workspaces[0].creditMode || 'shared');
              setPrivacySettings(workspaces[0].privacySettings || {});
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    if (workspace) {
      fetchMembers();
      fetchCreditUsage();
    }
  }, [workspace?.id]);

  const isOwner = workspace?.ownerId === user?.id;
  const isAdmin = workspace?.userRole === 'admin' || isOwner;

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
    setSaving(true);
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, creditMode, privacySettings })
      });
      setWorkspace(prev => prev ? { ...prev, name, creditMode, privacySettings } : null);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workspace) return;
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
        alert(error.error || 'Failed to send invitation');
      }
    } catch (err) {
      alert('Failed to send invitation');
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member?') || !workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchMembers();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleChangeMemberRole = async (userId: string, newRole: string) => {
    if (!workspace) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(addCreditsAmount);
    if (isNaN(amount) || amount <= 0 || !workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}/credits/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ amount })
      });
      setAddCreditsAmount('');
      fetchCreditUsage();
    } catch (err) {
      alert('Failed to add credits');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workspace? This cannot be undone.') || !workspace) return;
    try {
      await fetch(`${API_BASE}/workspaces/${workspace.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      router.push('/dashboard/generate');
    } catch (err) {
      alert('Failed to delete workspace');
    }
  };

  const updatePrivacy = (key: string, value: string) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)]">No workspace selected</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-cyan-400 hover:underline">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/generate')}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{workspace.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">Workspace Settings</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isAdmin}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-medium transition-all disabled:opacity-50 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-[var(--border-color)]">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Workspace Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Workspace Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-3 outline-none focus:border-cyan-500 disabled:opacity-50 text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Owner</label>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span className="text-[var(--text-primary)]">{isOwner ? 'You' : 'Another user'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {isOwner && !workspace.isDefault && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                  <h3 className="font-medium text-red-400 mb-2">Danger Zone</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    Once you delete a workspace, there is no going back.
                  </p>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Workspace
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Invite Members</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-cyan-500 text-[var(--text-primary)]"
                  />
                  <button
                    onClick={handleInvite}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors text-white"
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </button>
                </div>
                {inviteLink && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-sm flex-1 truncate text-[var(--text-muted)]">{inviteLink}</span>
                    <button onClick={handleCopyLink} className="p-2 hover:bg-[var(--bg-primary)] rounded-lg">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[var(--text-muted)]" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Members ({members.length})</h3>
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                        {member.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{member.name || 'Unknown'}</p>
                        <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === 'owner' ? (
                          <span className="flex items-center gap-1 text-yellow-400 text-sm">
                            <Crown className="w-4 h-4" />
                            Owner
                          </span>
                        ) : (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.userId, e.target.value)}
                              disabled={!isAdmin}
                              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            {isAdmin && (
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-center text-[var(--text-muted)] py-4">No members yet</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Credit Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreditMode('shared')}
                    disabled={!isAdmin}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      creditMode === 'shared'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <p className="font-medium mb-1 text-[var(--text-primary)]">Shared Pool</p>
                    <p className="text-sm text-[var(--text-muted)]">All members share workspace credits</p>
                  </button>
                  <button
                    onClick={() => setCreditMode('individual')}
                    disabled={!isAdmin}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      creditMode === 'individual'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <p className="font-medium mb-1 text-[var(--text-primary)]">Individual Allocation</p>
                    <p className="text-sm text-[var(--text-muted)]">Allocate credits to each member</p>
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                  <h3 className="font-medium mb-4 text-[var(--text-primary)]">Add Credits</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addCreditsAmount}
                      onChange={(e) => setAddCreditsAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 outline-none focus:border-cyan-500 text-[var(--text-primary)]"
                    />
                    <button
                      onClick={handleAddCredits}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}

              {creditUsage && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                  <h3 className="font-medium mb-4 text-[var(--text-primary)]">Usage Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold text-cyan-400">{creditUsage.workspaceCredits?.toFixed(2) || 0}</p>
                      <p className="text-sm text-[var(--text-muted)]">Available Credits</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{creditUsage.totalUsed?.toFixed(2) || 0}</p>
                      <p className="text-sm text-[var(--text-muted)]">Total Used</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{creditUsage.usageByType?.length || 0}</p>
                      <p className="text-sm text-[var(--text-muted)]">Generations</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Content Visibility</h3>
                <div className="space-y-4">
                  {['chat', 'image', 'video'].map(type => (
                    <div key={type} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <span className="capitalize text-[var(--text-primary)]">{type} Visibility</span>
                      <select
                        value={privacySettings[`${type}Visibility`] || 'private'}
                        onChange={(e) => updatePrivacy(`${type}Visibility`, e.target.value)}
                        disabled={!isAdmin}
                        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                      >
                        <option value="private">Private</option>
                        <option value="members">Members Only</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Permissions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-[var(--text-primary)]">Who can invite members</span>
                    <select
                      value={privacySettings.whoCanInvite || 'admins'}
                      onChange={(e) => updatePrivacy('whoCanInvite', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="members">All Members</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-[var(--text-primary)]">Who can allocate credits</span>
                    <select
                      value={privacySettings.whoCanAllocateCredits || 'owner_only'}
                      onChange={(e) => updatePrivacy('whoCanAllocateCredits', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50 text-[var(--text-primary)]"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="font-medium mb-4 text-[var(--text-primary)]">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Type</span>
                <span className="text-[var(--text-primary)]">{workspace.isDefault ? 'Personal' : 'Team'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Members</span>
                <span className="text-[var(--text-primary)]">{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Credits</span>
                <span className="text-cyan-400">{workspace.credits?.toFixed(2) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Credit Mode</span>
                <span className="capitalize text-[var(--text-primary)]">{creditMode}</span>
              </div>
            </div>
          </div>

          {creditUsage?.usageByType && creditUsage.usageByType.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="font-medium mb-4 text-[var(--text-primary)]">Usage by Type</h3>
              <div className="space-y-2">
                {creditUsage.usageByType.map(item => (
                  <div key={item.type} className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] capitalize">{item.type}</span>
                    <span className="text-[var(--text-primary)]">{item.count} ({item.total?.toFixed(2)} credits)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
