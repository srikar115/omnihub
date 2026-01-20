'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Settings, Heart, Image as ImageIcon, RefreshCw,
  Save, Lock, Mail, Calendar, Loader2,
  Trash2, ExternalLink, Sparkles
} from 'lucide-react';
import { useDashboard } from '../layout';

const API_BASE = '/api';

interface Profile {
  name: string;
  email: string;
  nickname?: string;
  bio?: string;
  avatarUrl?: string;
  isPublicProfile: boolean;
  createdAt: string;
  stats: {
    generations: number;
    published: number;
    likesReceived: number;
  };
}

interface PublishedPost {
  id: string;
  title?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  likeCount: number;
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'published', label: 'My Published Works', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings }
];

function PublishedPostCard({ post, onUnpublish }: { post: PublishedPost; onUnpublish: (id: string) => void }) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <img
        src={post.thumbnailUrl || post.imageUrl}
        alt={post.title || 'Published post'}
        className="w-full aspect-square object-cover"
      />
      
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <a
          href={post.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-white" />
        </a>
        <button
          onClick={() => onUnpublish(post.id)}
          className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors text-red-400"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">{post.category}</span>
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <Heart className="w-3.5 h-3.5" />
            {post.likeCount}
          </div>
        </div>
        {post.title && (
          <p className="text-sm font-medium truncate mt-1 text-[var(--text-primary)]">{post.title}</p>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingNickname, setRegeneratingNickname] = useState(false);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }
    
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
      setName(data.name || '');
      setBio(data.bio || '');
      setIsPublicProfile(data.isPublicProfile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'published') {
      fetchPublishedPosts();
    }
  }, [activeTab]);
  
  const fetchPublishedPosts = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/community/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPublishedPosts(data);
    } catch (err) {
      console.error('Failed to fetch published posts:', err);
    }
  };
  
  const handleRegenerateNickname = async () => {
    setRegeneratingNickname(true);
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/profile/regenerate-nickname`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(prev => prev ? { ...prev, nickname: data.nickname } : null);
    } catch (err) {
      console.error('Failed to regenerate nickname:', err);
    } finally {
      setRegeneratingNickname(false);
    }
  };
  
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('userToken');
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, bio, isPublicProfile })
      });
      setProfile(prev => prev ? { ...prev, name, bio, isPublicProfile } : null);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnpublish = async (postId: string) => {
    if (!confirm('Are you sure you want to unpublish this post?')) return;
    
    try {
      const token = localStorage.getItem('userToken');
      await fetch(`${API_BASE}/community/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setPublishedPosts(prev => prev.filter(p => p.id !== postId));
      setProfile(prev => prev ? {
        ...prev,
        stats: { ...prev.stats, published: prev.stats.published - 1 }
      } : null);
    } catch (err) {
      console.error('Failed to unpublish:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-b from-[var(--bg-secondary)] to-transparent px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{profile?.name || 'User'}</h1>
                {profile?.isPublicProfile && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                    Public
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[var(--text-muted)]">@</span>
                <span className="text-cyan-400 font-medium">{profile?.nickname || 'No nickname'}</span>
                <button
                  onClick={handleRegenerateNickname}
                  disabled={regeneratingNickname}
                  className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  title="Generate new nickname"
                >
                  <RefreshCw className={`w-4 h-4 ${regeneratingNickname ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-medium text-[var(--text-primary)]">{profile?.stats?.generations || 0}</span>
                  <span className="text-[var(--text-muted)] text-sm">generations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-medium text-[var(--text-primary)]">{profile?.stats?.published || 0}</span>
                  <span className="text-[var(--text-muted)] text-sm">published</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-medium text-[var(--text-primary)]">{profile?.stats?.likesReceived || 0}</span>
                  <span className="text-[var(--text-muted)] text-sm">likes received</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-8 border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 outline-none focus:border-cyan-500 transition-colors text-[var(--text-primary)]"
                  placeholder="Your display name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 outline-none focus:border-cyan-500 transition-colors resize-none text-[var(--text-primary)]"
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Community Nickname</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-secondary)]">
                    @{profile?.nickname || 'No nickname'}
                  </div>
                  <button
                    onClick={handleRegenerateNickname}
                    disabled={regeneratingNickname}
                    className="px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 text-[var(--text-primary)]"
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingNickname ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  This nickname is shown publicly in the community gallery.
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Email</label>
                <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)]">{profile?.email}</span>
                  <Lock className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Member Since</label>
                <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                  <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)]">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 text-white"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </div>
          )}
          
          {/* Published Works Tab */}
          {activeTab === 'published' && (
            <div>
              {publishedPosts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {publishedPosts.map(post => (
                    <PublishedPostCard
                      key={post.id}
                      post={post}
                      onUnpublish={handleUnpublish}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-xl font-medium mb-2 text-[var(--text-primary)]">No published works yet</p>
                  <p className="text-[var(--text-muted)] mb-4">Share your creations with the community!</p>
                  <button
                    onClick={() => router.push('/dashboard/generate')}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors text-white"
                  >
                    Go to Generator
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Privacy Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Public Profile</p>
                    <p className="text-sm text-[var(--text-muted)]">Allow others to view your profile</p>
                  </div>
                  <button
                    onClick={() => setIsPublicProfile(!isPublicProfile)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isPublicProfile ? 'bg-cyan-500' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isPublicProfile ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
              
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6">
                <h3 className="font-medium mb-4 text-[var(--text-primary)]">Account Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg transition-colors flex items-center gap-3 text-[var(--text-primary)]">
                    <Lock className="w-5 h-5 text-[var(--text-muted)]" />
                    <span>Change Password</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-3 text-red-500">
                    <Trash2 className="w-5 h-5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 text-white"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
