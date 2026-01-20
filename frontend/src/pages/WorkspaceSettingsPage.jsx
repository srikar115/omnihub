import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Settings, Users, CreditCard, Shield, 
  Trash2, Save, Plus, Copy, Check, Crown,
  UserMinus, ChevronUp, ChevronDown, Mail,
  ArrowLeft, Loader2
} from 'lucide-react';
import { AppLayout } from '../components/layout';

const API_BASE = 'http://localhost:3001/api';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

export default function WorkspaceSettingsPage() {
  return (
    <AppLayout title="Workspace Settings">
      {({ user, activeWorkspace, refreshWorkspaces }) => (
        <WorkspaceSettingsContent 
          user={user} 
          workspace={activeWorkspace}
          refreshWorkspaces={refreshWorkspaces}
        />
      )}
    </AppLayout>
  );
}

function WorkspaceSettingsContent({ user, workspace, refreshWorkspaces }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creditUsage, setCreditUsage] = useState(null);
  const [addCreditsAmount, setAddCreditsAmount] = useState('');
  
  // Editable settings
  const [name, setName] = useState(workspace?.name || '');
  const [creditMode, setCreditMode] = useState(workspace?.creditMode || 'shared');
  const [privacySettings, setPrivacySettings] = useState(workspace?.privacySettings || {});

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
  });

  const isOwner = workspace?.ownerId === user?.id;
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
      const res = await axios.get(`${API_BASE}/workspaces/${workspace.id}/members`, getAuthHeaders());
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchCreditUsage = async () => {
    if (!workspace) return;
    try {
      const res = await axios.get(`${API_BASE}/workspaces/${workspace.id}/credits/usage`, getAuthHeaders());
      setCreditUsage(res.data);
    } catch (err) {
      console.error('Failed to fetch credit usage:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API_BASE}/workspaces/${workspace.id}`, {
        name,
        creditMode,
        privacySettings
      }, getAuthHeaders());
      refreshWorkspaces?.();
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/workspaces/${workspace.id}/invite`, {
        email: inviteEmail.trim()
      }, getAuthHeaders());
      setInviteLink(res.data.inviteLink);
      setInviteEmail('');
      alert('Invitation sent!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await axios.delete(`${API_BASE}/workspaces/${workspace.id}/members/${memberId}`, getAuthHeaders());
      fetchMembers();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleChangeMemberRole = async (userId, newRole) => {
    try {
      await axios.patch(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, { role: newRole }, getAuthHeaders());
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(addCreditsAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await axios.post(`${API_BASE}/workspaces/${workspace.id}/credits/add`, { amount }, getAuthHeaders());
      setAddCreditsAmount('');
      fetchCreditUsage();
      refreshWorkspaces?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add credits');
    }
  };

  const handleAllocateCredits = async (userId, amount) => {
    try {
      await axios.post(`${API_BASE}/workspaces/${workspace.id}/credits/allocate`, { userId, amount }, getAuthHeaders());
      fetchMembers();
      fetchCreditUsage();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to allocate credits');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workspace? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/workspaces/${workspace.id}`, getAuthHeaders());
      refreshWorkspaces?.();
      navigate('/omnihub');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const updatePrivacy = (key, value) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading workspace settings...</p>
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
            onClick={() => navigate('/omnihub')}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">Workspace Settings</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isAdmin}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-medium transition-all disabled:opacity-50"
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
                <h3 className="font-medium mb-4">Workspace Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#9ca3af]">Workspace Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-[var(--bg-tertiary)] border border-[#2a2c35] rounded-lg px-4 py-3 outline-none focus:border-cyan-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#9ca3af]">Owner</label>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span>{isOwner ? 'You' : 'Another user'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
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
              {/* Invite Section */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4">Invite Members</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 bg-[var(--bg-tertiary)] border border-[#2a2c35] rounded-lg px-4 py-2 outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </button>
                </div>
                {inviteLink && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span className="text-sm flex-1 truncate text-[var(--text-muted)]">{inviteLink}</span>
                    <button onClick={handleCopyLink} className="p-2 hover:bg-[var(--card-hover)] rounded-lg">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Members List */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4">Members ({members.length})</h3>
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                        {member.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
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
                              className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
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
                <h3 className="font-medium mb-4">Credit Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreditMode('shared')}
                    disabled={!isAdmin}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      creditMode === 'shared'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[#2a2c35] hover:border-[#3a3c45]'
                    }`}
                  >
                    <p className="font-medium mb-1">Shared Pool</p>
                    <p className="text-sm text-[var(--text-muted)]">All members share workspace credits</p>
                  </button>
                  <button
                    onClick={() => setCreditMode('individual')}
                    disabled={!isAdmin}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      creditMode === 'individual'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[#2a2c35] hover:border-[#3a3c45]'
                    }`}
                  >
                    <p className="font-medium mb-1">Individual Allocation</p>
                    <p className="text-sm text-[var(--text-muted)]">Allocate credits to each member</p>
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                  <h3 className="font-medium mb-4">Add Credits</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addCreditsAmount}
                      onChange={(e) => setAddCreditsAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[#2a2c35] rounded-lg px-4 py-2 outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleAddCredits}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}

              {creditUsage && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                  <h3 className="font-medium mb-4">Usage Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold text-cyan-400">{creditUsage.workspaceCredits?.toFixed(2) || 0}</p>
                      <p className="text-sm text-[var(--text-muted)]">Available Credits</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{creditUsage.totalUsed?.toFixed(2) || 0}</p>
                      <p className="text-sm text-[var(--text-muted)]">Total Used</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                      <p className="text-2xl font-bold">{creditUsage.usageByType?.length || 0}</p>
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
                <h3 className="font-medium mb-4">Content Visibility</h3>
                <div className="space-y-4">
                  {['chat', 'image', 'video'].map(type => (
                    <div key={type} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <span className="capitalize">{type} Visibility</span>
                      <select
                        value={privacySettings[`${type}Visibility`] || 'private'}
                        onChange={(e) => updatePrivacy(`${type}Visibility`, e.target.value)}
                        disabled={!isAdmin}
                        className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
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
                <h3 className="font-medium mb-4">Permissions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span>Who can invite members</span>
                    <select
                      value={privacySettings.whoCanInvite || 'admins'}
                      onChange={(e) => updatePrivacy('whoCanInvite', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="members">All Members</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <span>Who can allocate credits</span>
                    <select
                      value={privacySettings.whoCanAllocateCredits || 'owner_only'}
                      onChange={(e) => updatePrivacy('whoCanAllocateCredits', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
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
            <h3 className="font-medium mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Type</span>
                <span>{workspace.isDefault ? 'Personal' : 'Team'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Members</span>
                <span>{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Credits</span>
                <span className="text-cyan-400">{workspace.credits?.toFixed(2) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Credit Mode</span>
                <span className="capitalize">{creditMode}</span>
              </div>
            </div>
          </div>

          {creditUsage?.usageByType && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="font-medium mb-4">Usage by Type</h3>
              <div className="space-y-2">
                {creditUsage.usageByType.map(item => (
                  <div key={item.type} className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] capitalize">{item.type}</span>
                    <span>{item.count} ({item.total?.toFixed(2)} credits)</span>
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
