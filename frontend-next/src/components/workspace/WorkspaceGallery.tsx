'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, MessageSquare, Grid, Loader2, User, CreditCard } from 'lucide-react';

const API_BASE = '/api';

const TYPE_ICONS: Record<string, typeof Image> = { 
  image: Image, 
  video: Video, 
  chat: MessageSquare 
};

const TYPE_COLORS: Record<string, string> = {
  image: 'from-cyan-500 to-blue-600',
  video: 'from-pink-500 to-rose-600',
  chat: 'from-emerald-500 to-teal-600',
};

interface Workspace {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface Generation {
  id: string;
  type: 'image' | 'video' | 'chat';
  result?: string;
  prompt?: string;
  userName?: string;
  credits?: number;
}

interface WorkspaceGalleryProps {
  workspace: Workspace | null;
  onSelectGeneration?: (gen: Generation) => void;
}

export default function WorkspaceGallery({ workspace, onSelectGeneration }: WorkspaceGalleryProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (workspace?.id) {
      fetchGallery();
    }
  }, [workspace?.id, filter]);

  const fetchGallery = async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE}/workspaces/${workspace.id}/gallery?type=${filter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setGenerations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch workspace gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!workspace || workspace.isDefault) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <Grid className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-[var(--text-primary)]">Workspace Gallery</h3>
        <p className="text-[var(--text-muted)] max-w-md">
          Select a team workspace to view shared generations from your team members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{workspace.name} Gallery</h3>
        
        {/* Filter */}
        <div className="flex items-center gap-2">
          {['all', 'image', 'video', 'chat'].map(type => {
            const Icon = type === 'all' ? Grid : TYPE_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  filter === type
                    ? 'bg-[var(--bg-tertiary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && generations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
            <Grid className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-[var(--text-primary)]">No Shared Content Yet</h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Team members can share their generations with the workspace from the generation details view.
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      {!loading && generations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {generations.map(gen => {
              const Icon = TYPE_ICONS[gen.type] || Grid;
              return (
                <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => onSelectGeneration?.(gen)}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-cyan-500/50 transition-all"
                >
                  {/* Thumbnail */}
                  {gen.type === 'image' && gen.result && (
                    <img 
                      src={gen.result} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  {gen.type === 'video' && gen.result && (
                    <video 
                      src={gen.result} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  {(gen.type === 'chat' || !gen.result) && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-12 h-12 text-[var(--text-muted)]" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {/* Type badge */}
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gradient-to-r ${TYPE_COLORS[gen.type] || 'from-gray-500 to-gray-600'} mb-2 text-white`}>
                        <Icon className="w-3 h-3" />
                        {gen.type}
                      </div>
                      
                      {/* Prompt preview */}
                      {gen.prompt && (
                        <p className="text-sm line-clamp-2 mb-2 text-white">{gen.prompt}</p>
                      )}
                      
                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {gen.userName || 'Unknown'}
                        </span>
                        {gen.credits !== undefined && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {(parseFloat(String(gen.credits)) || 0).toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Type indicator */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg bg-gradient-to-r ${TYPE_COLORS[gen.type] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
