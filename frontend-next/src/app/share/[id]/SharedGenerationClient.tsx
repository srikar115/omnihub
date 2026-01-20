'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Download, ExternalLink, Layers, Play, Image as ImageIcon,
  MessageSquare, Loader2, ArrowRight, Sparkles, Copy, Check
} from 'lucide-react';

const API_BASE = '/api';

interface Generation {
  id: string;
  type: 'image' | 'video' | 'chat';
  prompt?: string;
  result?: string;
  thumbnailUrl?: string;
  modelName?: string;
  modelId?: string;
  credits?: number;
  completedAt?: string;
  userName?: string;
  nickname?: string;
}

interface SharedGenerationClientProps {
  id: string;
}

export default function SharedGenerationClient({ id }: SharedGenerationClientProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGeneration();
  }, [id]);

  const fetchGeneration = async () => {
    try {
      const response = await fetch(`${API_BASE}/share/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGeneration(data);
      } else if (response.status === 404) {
        setError('Generation not found or is not publicly shared');
      } else {
        setError('Failed to load generation');
      }
    } catch (err) {
      setError('Failed to load generation');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generation?.result) return;
    
    try {
      const response = await fetch(generation.result);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnihub-${generation.id}.${generation.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !generation) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-[var(--text-muted)]" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Generation Not Found</h1>
          <p className="text-[var(--text-muted)] mb-6">{error || 'This generation may have been deleted or is not publicly shared.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5" />
            Create Your Own
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">OmniHub</span>
          </Link>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Try OmniHub Free
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Media */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden"
            >
              {generation.type === 'video' ? (
                <div className="relative aspect-video bg-black">
                  <video
                    src={generation.result}
                    poster={generation.thumbnailUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : generation.type === 'chat' ? (
                <div className="p-8 min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-[var(--text-primary)] max-w-lg">{generation.result}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={generation.result || generation.thumbnailUrl}
                    alt={generation.prompt || 'AI Generated'}
                    className="w-full object-contain max-h-[70vh]"
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Details Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Creator Info */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white">
                  {(generation.nickname || generation.userName || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{generation.nickname || generation.userName || 'OmniHub User'}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {generation.completedAt ? new Date(generation.completedAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              </div>

              {/* Type Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  generation.type === 'video' ? 'bg-pink-500/20 text-pink-400' :
                  generation.type === 'chat' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {generation.type === 'video' && <Play className="w-4 h-4" />}
                  {generation.type === 'chat' && <MessageSquare className="w-4 h-4" />}
                  {generation.type === 'image' && <ImageIcon className="w-4 h-4" />}
                  {generation.type.charAt(0).toUpperCase() + generation.type.slice(1)}
                </span>
              </div>

              {/* Model */}
              {generation.modelName && (
                <div className="mb-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Model</p>
                  <p className="text-[var(--text-primary)] font-medium">{generation.modelName}</p>
                </div>
              )}
            </div>

            {/* Prompt */}
            {generation.prompt && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                <p className="text-xs text-[var(--text-muted)] mb-2">Prompt</p>
                <p className="text-[var(--text-primary)] text-sm leading-relaxed">{generation.prompt}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {generation.result && generation.type !== 'chat' && (
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              )}
              
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              {generation.result && (
                <a
                  href={generation.result}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Original
                </a>
              )}
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-[var(--text-primary)] mb-2">Create Your Own</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Generate amazing AI content with 50+ models</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Created with <span className="text-cyan-400">OmniHub</span> - The Universal AI Gateway
          </p>
        </div>
      </footer>
    </div>
  );
}
