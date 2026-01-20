'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Eye, Search, X, Loader2, 
  TrendingUp, Clock, Flame, Grid 
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { useTheme } from '@/components/providers/ThemeProvider';

const API_BASE = '/api';

interface Post {
  id: string;
  nickname: string;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  modelName?: string;
  likeCount: number;
  viewCount: number;
  isLiked?: boolean;
  publishedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  anime: 'from-pink-500 to-purple-500',
  realistic: 'from-blue-500 to-cyan-500',
  game: 'from-green-500 to-emerald-500',
  abstract: 'from-orange-500 to-red-500',
  nature: 'from-green-400 to-teal-500',
  scifi: 'from-indigo-500 to-purple-600',
  art: 'from-yellow-500 to-orange-500',
  portrait: 'from-rose-500 to-pink-500',
  other: 'from-gray-500 to-gray-600'
};

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'popular', label: 'Most Liked', icon: Heart },
  { id: 'trending', label: 'Trending', icon: Flame }
];

interface CommunityPageProps {
  initialPosts: Post[];
}

export function CommunityPage({ initialPosts }: CommunityPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts();
    }
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        limit: '30',
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await fetch(`${API_BASE}/community?${params}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navbar */}
      <Navbar 
        onSignIn={() => {}} 
        onGetStarted={() => {}} 
        theme={theme} 
        onToggleTheme={toggleTheme}
      />

      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Community Gallery
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Explore stunning AI-generated artwork from our community of creators
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creations..."
                className="input-primary pl-10"
              />
            </form>

            {/* Sort Options */}
            <div className="flex gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    sortBy === option.id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <Grid className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No creations yet</h3>
              <p className="text-[var(--text-secondary)]">Be the first to share your AI artwork!</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-[var(--border-color)] hover:border-purple-500/50 transition-all"
                  onClick={() => setSelectedPost(post)}
                >
                  {/* Image */}
                  <img
                    src={post.thumbnailUrl || post.imageUrl}
                    alt={post.title || 'AI Generated Art'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium truncate">{post.nickname}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likeCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.viewCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  {post.category && post.category !== 'other' && (
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.other}`}>
                      {post.category}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--bg-primary)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Image */}
              <div className="md:w-2/3 bg-black flex items-center justify-center">
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title || 'AI Generated Art'}
                  className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
                />
              </div>
              
              {/* Details */}
              <div className="md:w-1/3 p-6 flex flex-col">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors md:hidden"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {selectedPost.nickname?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{selectedPost.nickname}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(selectedPost.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedPost.title && (
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {selectedPost.title}
                  </h3>
                )}

                {selectedPost.modelName && (
                  <div className="inline-flex px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full mb-4">
                    {selectedPost.modelName}
                  </div>
                )}

                {selectedPost.prompt && (
                  <div className="flex-1 overflow-auto mb-4">
                    <p className="text-sm text-[var(--text-muted)] mb-1">Prompt</p>
                    <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg p-3">
                      {selectedPost.prompt}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-color)]">
                  <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Heart className="w-5 h-5" />
                    {selectedPost.likeCount}
                  </span>
                  <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Eye className="w-5 h-5" />
                    {selectedPost.viewCount}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
