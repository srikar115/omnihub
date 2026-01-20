import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  X, Upload, Sparkles, Clock, FolderOpen, FolderPlus, Plus,
  Check, AlertCircle, ChevronLeft, Loader2, ImagePlus
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export function ImageSourceModal({ 
  onClose, 
  onSelectImage, 
  onUploadClick, 
  generatedImages, 
  maxImages, 
  currentCount, 
  uploadHistory = [], 
  projects = [], 
  onLoadProjects, 
  onCreateProject 
}) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectAssets, setProjectAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#8b5cf6');
  const [creating, setCreating] = useState(false);
  const canAddMore = currentCount < maxImages;
  
  const PROJECT_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('userToken');
      await axios.post(`${API_BASE}/projects`, {
        name: newProjectName,
        color: newProjectColor
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewProjectName('');
      setShowCreateProject(false);
      if (onCreateProject) onCreateProject();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };
  
  const TABS = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'generated', label: 'Generated', icon: Sparkles },
    { id: 'uploads', label: 'Upload History', icon: Clock },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
  ];
  
  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setLoadingAssets(true);
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/projects/${project.id}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectAssets(res.data);
    } catch (err) {
      console.error('Failed to load project assets:', err);
      setProjectAssets([]);
    } finally {
      setLoadingAssets(false);
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
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-secondary)] border border-[#1a1c25] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1c25]">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-cyan-400" />
            Add Reference Image
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1c25]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'projects' && onLoadProjects) {
                  onLoadProjects();
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!canAddMore && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Maximum {maxImages} image(s) allowed. Adding more will replace existing.</span>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center border-2 border-dashed border-[var(--border-color)]">
                <Upload className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <p className="text-lg font-medium mb-2">Upload an image</p>
              <p className="text-[var(--text-muted)] mb-6">Drag and drop or click to browse</p>
              <button
                onClick={onUploadClick}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Choose File
              </button>
            </div>
          )}

          {/* Generated Images Tab */}
          {activeTab === 'generated' && (
            <div>
              {generatedImages.length > 0 ? (
                <div className="grid grid-cols-5 gap-3">
                  {generatedImages.map((gen) => (
                    <button
                      key={gen.id}
                      onClick={() => onSelectImage(gen.result)}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-all group"
                    >
                      <img
                        src={gen.thumbnailUrl || gen.result}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-lg font-medium mb-2">No generated images yet</p>
                  <p className="text-[var(--text-muted)]">Generate some images first to use them as references</p>
                </div>
              )}
            </div>
          )}

          {/* Upload History Tab */}
          {activeTab === 'uploads' && (
            <div>
              {uploadHistory.length > 0 ? (
                <div className="grid grid-cols-5 gap-3">
                  {uploadHistory.map((upload) => (
                    <button
                      key={upload.id}
                      onClick={() => onSelectImage(upload.url)}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-all group"
                    >
                      <img
                        src={upload.url}
                        alt={upload.filename || ''}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      {upload.filename && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                          <p className="text-[10px] text-white/80 truncate">{upload.filename}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Clock className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-lg font-medium mb-2">No upload history</p>
                  <p className="text-[var(--text-muted)]">Images you upload will appear here for quick reuse</p>
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              {showCreateProject ? (
                <div className="max-w-md mx-auto py-8">
                  <h4 className="text-lg font-medium mb-4">Create New Project</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-[var(--text-muted)] mb-1 block">Project Name</label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Client Project, UGC Characters"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm outline-none focus:border-purple-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[var(--text-muted)] mb-2 block">Color</label>
                      <div className="flex gap-2">
                        {PROJECT_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewProjectColor(color)}
                            className={`w-8 h-8 rounded-lg transition-all ${newProjectColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12131a]' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => setShowCreateProject(false)}
                        className="flex-1 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim() || creating}
                        className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                        Create Project
                      </button>
                    </div>
                  </div>
                </div>
              ) : !selectedProject ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-[var(--text-muted)]">{projects.length} projects</p>
                    <button
                      onClick={() => setShowCreateProject(true)}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      New Project
                    </button>
                  </div>
                  {projects.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleSelectProject(project)}
                          className="p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--card-hover)] rounded-xl text-left transition-colors border border-[var(--border-color)] hover:border-purple-500/50"
                        >
                          <div 
                            className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center"
                            style={{ backgroundColor: project.color + '20' }}
                          >
                            <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                          </div>
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{project.assetCount || 0} assets</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                        <FolderPlus className="w-10 h-10 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-lg font-medium mb-2">No projects yet</p>
                      <p className="text-[var(--text-muted)] mb-4">Create a project to save and organize your assets</p>
                      <button 
                        onClick={() => setShowCreateProject(true)}
                        className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors"
                      >
                        Create Project
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setProjectAssets([]);
                    }}
                    className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white mb-4 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Projects
                  </button>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selectedProject.color + '20' }}
                    >
                      <FolderOpen className="w-5 h-5" style={{ color: selectedProject.color }} />
                    </div>
                    <div>
                      <p className="font-medium">{selectedProject.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{projectAssets.length} assets</p>
                    </div>
                  </div>
                  
                  {loadingAssets ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    </div>
                  ) : projectAssets.length > 0 ? (
                    <div className="grid grid-cols-5 gap-3">
                      {projectAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => onSelectImage(asset.assetUrl)}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-all group"
                        >
                          <img
                            src={asset.assetUrl}
                            alt={asset.name || ''}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[var(--text-muted)]">No assets in this project</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
