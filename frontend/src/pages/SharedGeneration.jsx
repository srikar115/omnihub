import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download, Eye, Clock, Sparkles, Image as ImageIcon, 
  Video, AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export default function SharedGeneration() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchSharedGeneration();
  }, [token]);

  const fetchSharedGeneration = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/share/${token}`);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch shared generation:', err);
      if (err.response?.status === 404) {
        setError('This shared content was not found or has been removed.');
      } else if (err.response?.status === 410) {
        setError('This share link has expired.');
      } else {
        setError('Failed to load shared content. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Content Not Available</h1>
          <p className="text-[var(--text-muted)] mb-6">{error}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--bg-tertiary)] hover:bg-[#252730] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to OmniHub
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = data.type === 'image' ? ImageIcon : Video;

  return (
    <div className="min-h-screen bg-[#0a0b0f]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors">
            <Sparkles className="w-6 h-6" />
            <span className="font-bold text-lg">OmniHub</span>
          </Link>
          
          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {data.viewCount} views
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Media Display */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]"
            >
              {data.type === 'image' ? (
                <img 
                  src={data.result} 
                  alt="Shared generation" 
                  className="w-full h-auto"
                />
              ) : (
                <video 
                  src={data.result} 
                  controls 
                  className="w-full h-auto"
                  poster={data.thumbnailUrl}
                />
              )}
            </motion.div>
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            {/* Type Badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`p-3 rounded-xl ${
                data.type === 'image' 
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20' 
                  : 'bg-gradient-to-br from-pink-500/20 to-rose-600/20'
              }`}>
                <TypeIcon className={`w-6 h-6 ${
                  data.type === 'image' ? 'text-cyan-400' : 'text-pink-400'
                }`} />
              </div>
              <div>
                <h2 className="font-semibold capitalize">{data.type} Generation</h2>
                <p className="text-sm text-[var(--text-muted)]">{data.modelName}</p>
              </div>
            </motion.div>

            {/* Prompt */}
            {data.prompt && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4"
              >
                <h3 className="text-sm font-medium mb-2 text-[#9ca3af]">Prompt</h3>
                <p className="text-sm leading-relaxed">{data.prompt}</p>
              </motion.div>
            )}

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-medium text-[#9ca3af]">Details</h3>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Model</span>
                <span>{data.modelName}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Created</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(data.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Credits Used</span>
                <span>{data.credits?.toFixed(4)}</span>
              </div>
            </motion.div>

            {/* Download Button */}
            {data.allowDownload && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <a
                  href={data.result}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-medium transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download {data.type === 'image' ? 'Image' : 'Video'}
                </a>
              </motion.div>
            )}

            {/* Create Your Own CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 text-center"
            >
              <p className="text-sm text-[#9ca3af] mb-3">
                Create your own AI-generated content
              </p>
              <Link
                to="/omnihub"
                className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg text-sm font-medium transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Try OmniHub
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          <p>Generated with OmniHub - AI-powered creative studio</p>
        </div>
      </footer>
    </div>
  );
}
