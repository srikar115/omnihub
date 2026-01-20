'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Trash2, Loader2, CreditCard, Share2, 
  Wand2, Copy, Check, FolderPlus, ChevronDown, ChevronUp,
  Sparkles, RefreshCw, Link2, Maximize2, Film, Zap,
  ExternalLink, Clock, ChevronLeft, ChevronRight, ImagePlus
} from 'lucide-react';
import type { Generation } from './GenerationCard';

const API_BASE = '/api';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-[var(--border-color)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GenerationModalProps {
  generation: Generation;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUseAsReference?: (imageUrl: string) => void;
  onRemix?: (generation: Generation) => void;
  onAnimate?: (generation: Generation) => void;
  onUpscale?: (generation: Generation) => void;
  projects?: Project[];
  onSaveToProject?: (projectId: string) => Promise<{ success: boolean } | undefined>;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function GenerationModal({ 
  generation, 
  onClose, 
  onDelete,
  onUseAsReference,
  onRemix,
  onAnimate,
  onUpscale,
  projects = [],
  onSaveToProject,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: GenerationModalProps) {
  const [copied, setCopied] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [savingToProject, setSavingToProject] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishCategory, setPublishCategory] = useState('art');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isCreatingVariation, setIsCreatingVariation] = useState(false);
  const [variationType, setVariationType] = useState('');

  const options = (() => {
    if (!generation.options) return {};
    if (typeof generation.options === 'string') {
      try {
        return JSON.parse(generation.options);
      } catch {
        return {};
      }
    }
    return generation.options;
  })();

  const generationTime = generation.completedAt && generation.startedAt
    ? `${((new Date(generation.completedAt).getTime() - new Date(generation.startedAt).getTime()) / 1000).toFixed(1)}s`
    : null;

  const canUpscale = generation.type === 'image' && generation.status === 'completed';

  const handleCopyPrompt = () => {
    if (generation.prompt) {
      navigator.clipboard.writeText(generation.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToProjectClick = async (projectId: string) => {
    setSavingToProject(true);
    try {
      await onSaveToProject?.(projectId);
      setShowProjectSelect(false);
    } catch (err) {
      console.error('Failed to save to project:', err);
    } finally {
      setSavingToProject(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/community/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          generationId: generation.id,
          title: publishTitle,
          category: publishCategory,
        }),
      });
      
      if (response.ok) {
        setPublishSuccess(true);
        setTimeout(() => {
          setShowPublishDialog(false);
          setPublishSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to publish:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateVariation = async (type: 'subtle' | 'strong') => {
    setIsCreatingVariation(true);
    setVariationType(type);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/enhance-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: generation.prompt,
          imageUrls: [generation.result],
          variationType: type,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.enhancedPrompt && onRemix) {
          onRemix({ ...generation, prompt: data.enhancedPrompt });
        }
      }
    } catch (err) {
      console.error('Failed to create variation:', err);
    } finally {
      setIsCreatingVariation(false);
      setVariationType('');
    }
  };

  const handleAnimate = () => {
    onAnimate?.(generation);
    onClose();
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/share/${generation.id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const CATEGORIES = [
    { id: 'anime', label: 'Anime' },
    { id: 'realistic', label: 'Realistic' },
    { id: 'art', label: 'Art' },
    { id: 'scifi', label: 'Sci-Fi' },
    { id: 'nature', label: 'Nature' },
    { id: 'portrait', label: 'Portrait' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Container with navigation arrows closer to modal */}
      <div className="relative flex items-center justify-center gap-4 max-w-[95vw]">
        {/* Left navigation arrow */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            className="flex-shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {!hasPrev && <div className="w-12 flex-shrink-0" />}

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Image/Video Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-w-0">
          {generation.type === 'video' ? (
            <video
              src={generation.result}
              poster={generation.thumbnailUrl}
              controls
              autoPlay
              loop
              className="max-w-full max-h-[90vh] object-contain"
            />
          ) : generation.type === 'chat' ? (
            <div className="p-8 text-center">
              <p className="text-white/80 text-lg max-w-md">{generation.result}</p>
            </div>
          ) : (
            <img
              src={generation.result}
              alt={generation.prompt || ''}
              className="max-w-full max-h-[90vh] object-contain"
            />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-96 border-l border-[var(--border-color)] flex flex-col overflow-hidden flex-shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                generation.type === 'video' ? 'bg-pink-500 text-white' :
                generation.type === 'chat' ? 'bg-emerald-500 text-white' :
                'bg-cyan-500 text-white'
              }`}>
                {generation.type}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                generation.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                generation.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {generation.status}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Date */}
          <div className="px-4 py-2 text-xs text-[var(--text-muted)]">
            {generation.startedAt ? new Date(generation.startedAt).toLocaleString() : ''}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Save & Share Section */}
            <CollapsibleSection title="Save & Share" icon={Share2} defaultOpen={true}>
              <div className="space-y-3">
                {/* Save to Project */}
                <div className="relative">
                  <button 
                    onClick={() => setShowProjectSelect(!showProjectSelect)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-[var(--text-primary)]">
                      <FolderPlus className="w-4 h-4" />
                      Save to Project
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform text-[var(--text-muted)] ${showProjectSelect ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showProjectSelect && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
                      >
                        {projects.length > 0 ? (
                          projects.map(project => (
                            <button
                              key={project.id}
                              onClick={() => handleSaveToProjectClick(project.id)}
                              disabled={savingToProject}
                              className="w-full px-3 py-2 hover:bg-[var(--bg-primary)] text-left text-sm flex items-center gap-2 transition-colors disabled:opacity-50 text-[var(--text-primary)]"
                            >
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: project.color }} />
                              {project.name}
                              {savingToProject && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No projects yet</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={generation.result}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button 
                    onClick={handleShare}
                    className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {canUpscale && (
                    <button 
                      onClick={() => onUpscale?.(generation)}
                      className="px-3 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white"
                    >
                      <Zap className="w-4 h-4" />
                      Upscale
                    </button>
                  )}
                  {generation.type === 'image' && (
                    <>
                      <button 
                        onClick={handleAnimate}
                        className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white"
                      >
                        <Film className="w-4 h-4" />
                        Animate
                      </button>
                      <button 
                        onClick={() => setShowPublishDialog(true)}
                        className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 col-span-2 text-white"
                      >
                        <Sparkles className="w-4 h-4" />
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Generation Details Section */}
            <CollapsibleSection title="Generation Details" icon={Sparkles} defaultOpen={true}>
              <div className="space-y-4">
                {/* Quick actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onRemix?.(generation)}
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reuse Settings
                  </button>
                  <button
                    onClick={() => onUseAsReference?.(generation.result || '')}
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    <Link2 className="w-4 h-4" />
                    Use Image
                  </button>
                </div>
                
                {/* Model */}
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Model</p>
                  <p className="text-cyan-400 font-medium">{generation.modelName}</p>
                </div>
                
                {/* Prompt with copy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[var(--text-muted)]">Prompt</p>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Copy prompt"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    </button>
                  </div>
                  <p className="text-sm bg-[var(--bg-primary)] rounded-lg p-3 text-[var(--text-primary)]">{generation.prompt}</p>
                </div>
                
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {generationTime && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Generation Time</p>
                      <p className="font-mono text-[var(--text-primary)]">{generationTime}</p>
                    </div>
                  )}
                  <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                    <p className="text-xs text-[var(--text-muted)]">Credits</p>
                    <p className="font-mono text-cyan-400">${(parseFloat(String(generation.credits)) || 0).toFixed(4)}</p>
                  </div>
                  {options.seed && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Seed</p>
                      <p className="font-mono text-[var(--text-primary)]">{options.seed}</p>
                    </div>
                  )}
                  {(options.width || options.image_size) && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Size</p>
                      <p className="font-mono text-[var(--text-primary)]">{options.width ? `${options.width}×${options.height}` : options.image_size}</p>
                    </div>
                  )}
                  {options.aspect_ratio && (
                    <div className="bg-[var(--bg-primary)] rounded-lg p-2">
                      <p className="text-xs text-[var(--text-muted)]">Aspect Ratio</p>
                      <p className="font-mono text-[var(--text-primary)]">{options.aspect_ratio}</p>
                    </div>
                  )}
                </div>
                
                {/* Show all options toggle */}
                {Object.keys(options).length > 4 && (
                  <button
                    onClick={() => setShowAllOptions(!showAllOptions)}
                    className="w-full py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-muted)] transition-colors"
                  >
                    {showAllOptions ? 'Hide Options' : 'Show All Options'}
                  </button>
                )}
                
                {showAllOptions && (
                  <div className="bg-[var(--bg-primary)] rounded-lg p-3 text-xs font-mono overflow-x-auto text-[var(--text-primary)]">
                    <pre>{JSON.stringify(options, null, 2)}</pre>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Reference Images Section */}
            {options.inputImages && options.inputImages.length > 0 && (
              <CollapsibleSection title="Reference Images" icon={ImagePlus} defaultOpen={true}>
                <div className="grid grid-cols-3 gap-2">
                  {options.inputImages.map((img: string, i: number) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Reference ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-[var(--border-color)]"
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Upscale Section - Images only */}
            {generation.type === 'image' && generation.status === 'completed' && (
              <CollapsibleSection title="Upscale" icon={Maximize2} defaultOpen={false}>
                <div className="space-y-3">
                  <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 text-[var(--text-primary)]">
                    <option value="">Choose Upscale Mode</option>
                    <option value="2x">2x Upscale</option>
                    <option value="4x">4x Upscale</option>
                    <option value="creative">Creative Upscale</option>
                  </select>
                  <button 
                    onClick={() => onUpscale?.(generation)}
                    className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 border border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Ultimate Upscale
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                </div>
              </CollapsibleSection>
            )}

            {/* Create Variations Section - Images only */}
            {generation.type === 'image' && generation.status === 'completed' && (
              <CollapsibleSection title="Create Variations" icon={Wand2} defaultOpen={false}>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Use GPT-4o Vision to generate a variation prompt based on this image. (~0.01 credits)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCreateVariation('subtle')}
                    disabled={isCreatingVariation}
                    className="px-3 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors border border-[var(--border-color)] disabled:opacity-50 flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    {isCreatingVariation && variationType === 'subtle' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Subtle Variation
                  </button>
                  <button
                    onClick={() => handleCreateVariation('strong')}
                    disabled={isCreatingVariation}
                    className="px-3 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-sm transition-colors border border-[var(--border-color)] disabled:opacity-50 flex items-center justify-center gap-2 text-[var(--text-primary)]"
                  >
                    {isCreatingVariation && variationType === 'strong' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Strong Variation
                  </button>
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="p-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => onDelete(generation.id)}
              className="w-full py-2.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Generation
            </button>
          </div>
        </div>

        {/* Publish Dialog */}
        <AnimatePresence>
          {showPublishDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
              onClick={() => setShowPublishDialog(false)}
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {publishSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Published!</h3>
                  <p className="text-[var(--text-muted)]">Your creation is now live in the community gallery</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Publish to Community
                    </h3>
                    <button onClick={() => setShowPublishDialog(false)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg">
                      <X className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Title (optional)</label>
                      <input
                        type="text"
                        value={publishTitle}
                        onChange={(e) => setPublishTitle(e.target.value)}
                        placeholder="Give your creation a title"
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-500 text-[var(--text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setPublishCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              publishCategory === cat.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Publish Now
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

        {/* Right navigation arrow */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            className="flex-shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
        {!hasNext && <div className="w-12 flex-shrink-0" />}
      </div>
    </motion.div>
  );
}
