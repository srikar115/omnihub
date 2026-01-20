import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { X, Download, Trash2, Loader2, CreditCard, Share2, Users } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

const TYPE_COLORS = {
  image: 'from-cyan-500 to-blue-600',
  video: 'from-pink-500 to-rose-600',
  chat: 'from-emerald-500 to-teal-600',
};

export default function GenerationModal({ generation, onClose, onDelete, activeWorkspace, onShare }) {
  const [isShared, setIsShared] = useState(generation?.sharedWithWorkspace || false);
  const [sharing, setSharing] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
  });

  const handleToggleShare = async () => {
    if (!activeWorkspace || activeWorkspace.isDefault) return;
    setSharing(true);
    try {
      await axios.patch(`${API_BASE}/generations/${generation.id}/share`, {
        sharedWithWorkspace: !isShared,
        workspaceId: activeWorkspace.id
      }, getAuthHeaders());
      setIsShared(!isShared);
      onShare?.(generation.id, !isShared);
    } catch (err) {
      console.error('Failed to update sharing:', err);
    } finally {
      setSharing(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs bg-gradient-to-r ${TYPE_COLORS[generation.type]} text-white`}>
                {generation.type}
              </span>
              <h3 className="font-semibold text-lg">{generation.modelName}</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{new Date(generation.startedAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1c25] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Result display */}
        {generation.status === 'completed' && generation.result && (
          <div className="mb-4 rounded-xl overflow-hidden">
            {generation.type === 'image' && (
              <img src={generation.result} alt="" className="w-full" />
            )}
            {generation.type === 'video' && (
              <video src={generation.result} controls autoPlay loop className="w-full" />
            )}
            {generation.type === 'chat' && (
              <div className="bg-[#0a0b0f] rounded-xl p-4 whitespace-pre-wrap">{generation.result}</div>
            )}
          </div>
        )}

        {generation.status === 'pending' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        )}

        {generation.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <p className="text-red-400">{generation.error || 'Generation failed'}</p>
          </div>
        )}

        {/* Prompt */}
        <div className="bg-[#0a0b0f] rounded-xl p-4 mb-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">Prompt</p>
          <p>{generation.prompt}</p>
        </div>

        {/* Credits & Sharing */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Credits used:</span>
            <span className="text-cyan-400 font-mono">{generation.credits?.toFixed(4)}</span>
          </div>

          {/* Share Toggle */}
          {activeWorkspace && !activeWorkspace.isDefault && (
            <button
              onClick={handleToggleShare}
              disabled={sharing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isShared 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-[#1a1c25] text-[var(--text-muted)] hover:text-white border border-[#2a2c35]'
              }`}
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  {isShared ? 'Shared with Workspace' : 'Share to Workspace'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {generation.result && generation.type !== 'chat' && (
            <a
              href={generation.result}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center gap-2 font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <Download className="w-5 h-5" /> Download
            </a>
          )}
          <button
            onClick={() => onDelete(generation.id)}
            className="px-6 py-3 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-5 h-5" /> Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
