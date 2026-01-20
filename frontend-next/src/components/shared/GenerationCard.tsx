'use client';

import { motion } from 'framer-motion';
import { Image, Video, MessageSquare, Play, Eye, Loader2, X, Zap, Building2 } from 'lucide-react';

const TYPE_ICONS = { image: Image, video: Video, chat: MessageSquare };
const TYPE_COLORS: Record<string, string> = {
  image: 'from-cyan-500 to-blue-600',
  video: 'from-pink-500 to-rose-600',
  chat: 'from-emerald-500 to-teal-600',
};

// Helper to get credit source from generation options
const getCreditSource = (options: string | Record<string, unknown> | undefined): string | null => {
  if (!options) return null;
  
  const opts = typeof options === 'string' ? JSON.parse(options) : options;
  return opts?.creditSource as string | null;
};

// Credit source badge component
const CreditSourceBadge = ({ source }: { source: string | null }) => {
  if (!source) return null;
  
  const isPersonal = source.includes('personal');
  const isWorkspace = source.includes('workspace');
  const isAllocated = source.includes('allocated');
  
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
      isPersonal 
        ? 'bg-cyan-500/20 text-cyan-400' 
        : isAllocated
        ? 'bg-amber-500/20 text-amber-400'
        : 'bg-purple-500/20 text-purple-400'
    }`}>
      {isPersonal ? (
        <Zap className="w-2.5 h-2.5" />
      ) : (
        <Building2 className="w-2.5 h-2.5" />
      )}
      {isPersonal ? 'personal' : isAllocated ? 'allocated' : 'workspace'}
    </span>
  );
};

export interface Generation {
  id: string;
  type: 'image' | 'video' | 'chat';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  thumbnailUrl?: string;
  prompt?: string;
  modelName?: string;
  model?: string;
  startedAt?: string;
  completedAt?: string;
  credits?: number;
  error?: string;
  options?: string | Record<string, unknown>;
  inputImages?: string[];
}

interface GenerationCardProps {
  generation: Generation;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
}

export function GenerationCard({ generation, viewMode = 'grid', onClick }: GenerationCardProps) {
  const Icon = TYPE_ICONS[generation.type];

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl cursor-pointer hover:border-[#2a2c35] transition-all"
      >
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1c25]">
          {generation.status === 'completed' && generation.result && generation.type === 'image' && (
            <img src={generation.result} alt="" className="w-full h-full object-cover" />
          )}
          {generation.status === 'completed' && generation.type === 'video' && (
            <div className="relative w-full h-full">
              {generation.thumbnailUrl ? (
                <img src={generation.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : generation.result ? (
                <video src={generation.result} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-600/20">
                  <Video className="w-8 h-8 text-pink-400" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>
          )}
          {generation.type === 'chat' && (
            <div className="w-full h-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
          )}
          {(generation.status === 'pending' || generation.status === 'processing') && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs bg-gradient-to-r ${TYPE_COLORS[generation.type]} text-white`}>
              {generation.type}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{generation.modelName}</span>
            <CreditSourceBadge source={getCreditSource(generation.options)} />
          </div>
          <p className="text-sm text-[var(--text-muted)] truncate">{generation.prompt}</p>
          <p className="text-xs text-[#4b5563] mt-1">
            {new Date(generation.startedAt || '').toLocaleString()}
          </p>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {generation.status === 'completed' && (
            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Completed</span>
          )}
          {(generation.status === 'pending' || generation.status === 'processing') && (
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </span>
          )}
          {generation.status === 'failed' && (
            <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">Failed</span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] group"
    >
      {generation.status === 'completed' && generation.result && generation.type === 'image' && (
        <img src={generation.result} alt="" className="w-full h-full object-cover" />
      )}
      {generation.status === 'completed' && generation.type === 'video' && (
        <div className="relative w-full h-full">
          {generation.thumbnailUrl ? (
            <img src={generation.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : generation.result ? (
            <video src={generation.result} className="w-full h-full object-cover" muted />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-600/20">
              <Video className="w-10 h-10 text-pink-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
      )}
      {generation.status === 'completed' && generation.type === 'chat' && (
        <div className="w-full h-full p-4 flex flex-col">
          <MessageSquare className="w-8 h-8 text-emerald-400 mb-2" />
          <p className="text-xs text-[var(--text-muted)] line-clamp-4 text-left">{generation.result}</p>
        </div>
      )}
      {(generation.status === 'pending' || generation.status === 'processing') && (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}
      {generation.status === 'failed' && (
        <div className="w-full h-full flex items-center justify-center bg-red-500/10">
          <X className="w-8 h-8 text-red-400" />
        </div>
      )}

      {/* Model name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-white/90 truncate">{generation.modelName}</p>
          <CreditSourceBadge source={getCreditSource(generation.options)} />
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="w-6 h-6 text-white" />
      </div>
    </motion.button>
  );
}
