import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Settings, Users, CreditCard, Shield, 
  Trash2, Save, Plus, Copy, Check, Crown,
  UserMinus, ChevronUp, ChevronDown, Mail
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

export default function WorkspaceSettings({ 
  workspace, 
  onClose, 
  onUpdate, 
  onDelete,
  currentUserId 
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
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
    try {
      const res = await axios.get(`${API_BASE}/workspaces/${workspace.id}/members`, getAuthHeaders());
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchCreditUsage = async () => {
    try {
      const res = await axios.get(`${API_BASE}/workspaces/${workspace.id}/credits/usage`, getAuthHeaders());
      setCreditUsage(res.data);
    } catch (err) {
      console.error('Failed to fetch credit usage:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_BASE}/workspaces/${workspace.id}`, {
        name,
        creditMode,
        privacySettings
      }, getAuthHeaders());
      onUpdate({ ...workspace, name, creditMode, privacySettings });
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
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
      alert(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateMember = async (userId, updates) => {
    try {
      await axios.patch(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, updates, getAuthHeaders());
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await axios.delete(`${API_BASE}/workspaces/${workspace.id}/members/${userId}`, getAuthHeaders());
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(addCreditsAmount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/workspaces/${workspace.id}/credits/add`, { amount }, getAuthHeaders());
      setAddCreditsAmount('');
      fetchCreditUsage();
      onUpdate({ ...workspace, credits: (workspace.credits || 0) + amount });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add credits');
    } finally {
      setLoading(false);
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
      onDelete(workspace.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const updatePrivacy = (key, value) => {
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
        className="bg-[var(--bg-secondary)] border border-[#1a1c25] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1c25]">
          <h2 className="text-lg font-semibold">Workspace Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1c25] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1c25] px-4">
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
                <label className="block text-sm font-medium mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-[#1a1c25] border border-[#2a2c35] rounded-lg px-4 py-2 outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Credit Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => isAdmin && setCreditMode('shared')}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      creditMode === 'shared'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[#2a2c35] hover:border-[#3a3c45]'
                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm">Shared Pool</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Everyone uses workspace credits
                    </div>
                  </button>
                  <button
                    onClick={() => isAdmin && setCreditMode('individual')}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      creditMode === 'individual'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-[#2a2c35] hover:border-[#3a3c45]'
                    } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm">Individual</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Allocate credits per member
                    </div>
                  </button>
                </div>
              </div>

              {isOwner && !workspace.isDefault && (
                <div className="pt-4 border-t border-[#1a1c25]">
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
              {/* Invite Section */}
              {isAdmin && (
                <div className="bg-[#1a1c25] rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Invite Members
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 bg-[var(--bg-secondary)] border border-[#2a2c35] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={loading || !inviteEmail.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
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
                        className="flex-1 bg-[var(--bg-secondary)] border border-[#2a2c35] rounded-lg px-3 py-2 text-xs"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="p-2 hover:bg-[var(--card-hover)] rounded-lg"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-3 bg-[#1a1c25] rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        {member.role === 'owner' && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{member.email}</div>
                    </div>

                    {/* Role Badge */}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                      member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-[#252730] text-[#9ca3af]'
                    }`}>
                      {member.role}
                    </span>

                    {/* Credits (individual mode) */}
                    {creditMode === 'individual' && (
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-cyan-400">{member.allocatedCredits?.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {isAdmin && member.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => handleUpdateMember(member.userId, { role: 'admin' })}
                            className="p-1.5 hover:bg-[var(--card-hover)] rounded text-[var(--text-muted)] hover:text-white"
                            title="Promote to Admin"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {member.role === 'admin' && (
                          <button
                            onClick={() => handleUpdateMember(member.userId, { role: 'member' })}
                            className="p-1.5 hover:bg-[var(--card-hover)] rounded text-[var(--text-muted)] hover:text-white"
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
              </div>
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="space-y-6">
              {/* Balance */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-sm text-[#9ca3af]">Workspace Credits</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {workspace.isDefault ? 'Uses Personal Credits' : (workspace.credits?.toFixed(2) || '0.00')}
                </div>
              </div>

              {/* Add Credits */}
              {isOwner && !workspace.isDefault && (
                <div>
                  <label className="block text-sm font-medium mb-2">Add Credits</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addCreditsAmount}
                      onChange={(e) => setAddCreditsAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="1"
                      className="flex-1 bg-[#1a1c25] border border-[#2a2c35] rounded-lg px-4 py-2 outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleAddCredits}
                      disabled={loading || !addCreditsAmount}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Usage Stats */}
              {creditUsage && (
                <div>
                  <h3 className="font-medium mb-3">Usage Statistics</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {creditUsage.byType?.map(stat => (
                      <div key={stat.type} className="bg-[#1a1c25] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-muted)] capitalize">{stat.type}</div>
                        <div className="text-lg font-semibold">{stat.total?.toFixed(2)}</div>
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
                <h3 className="font-medium mb-3">Content Visibility</h3>
                <div className="space-y-3">
                  {[
                    { key: 'imageVisibility', label: 'Image Generations' },
                    { key: 'videoVisibility', label: 'Video Generations' },
                    { key: 'chatVisibility', label: 'Chat Conversations' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-[#1a1c25] rounded-lg">
                      <span className="text-sm">{label}</span>
                      <select
                        value={privacySettings[key] || 'private'}
                        onChange={(e) => updatePrivacy(key, e.target.value)}
                        disabled={!isAdmin}
                        className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                      >
                        <option value="private">Private</option>
                        <option value="workspace">Visible to Workspace</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Permissions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#1a1c25] rounded-lg">
                    <span className="text-sm">Who can invite members</span>
                    <select
                      value={privacySettings.whoCanInvite || 'admins'}
                      onChange={(e) => updatePrivacy('whoCanInvite', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="all_members">All Members</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#1a1c25] rounded-lg">
                    <span className="text-sm">Who can allocate credits</span>
                    <select
                      value={privacySettings.whoCanAllocateCredits || 'owner_only'}
                      onChange={(e) => updatePrivacy('whoCanAllocateCredits', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins">Admins</option>
                      <option value="none">Nobody</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#1a1c25] rounded-lg">
                    <span className="text-sm">Who can promote admins</span>
                    <select
                      value={privacySettings.whoCanBeAdmin || 'owner_only'}
                      onChange={(e) => updatePrivacy('whoCanBeAdmin', e.target.value)}
                      disabled={!isOwner}
                      className="bg-[#252730] border border-[#2a2c35] rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                    >
                      <option value="owner_only">Owner Only</option>
                      <option value="admins_can_promote">Admins Can Promote</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="flex justify-end gap-2 p-4 border-t border-[#1a1c25]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#9ca3af] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
