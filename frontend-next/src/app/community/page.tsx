'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Eye, Search, X, Loader2, User, Clock, Flame, Sparkles, Image as ImageIcon
} from 'lucide-react';

const API_BASE = '/api';

const CATEGORY_COLORS: Record<string, string> = {
  anime: 'from-pink-500 to-purple-500',
  realistic: 'from-blue-500 to-cyan-500',
  game: 'from-green-500 to-emerald-500',
  abstract: 'from-orange-500 to-red-500',
  nature: 'from-green-400 to-teal-500',
  scifi: 'from-indigo-500 to-purple-600',
  art: 'from-yellow-500 to-orange-500',
  portrait: 'from-rose-500 to-pink-500',
  architecture: 'from-slate-500 to-zinc-600',
  food: 'from-amber-500 to-yellow-500',
  other: 'from-gray-500 to-gray-600'
};

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'popular', label: 'Most Liked', icon: Heart },
  { id: 'trending', label: 'Trending', icon: Flame }
];

interface Post {
  id: string;
  title?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  category?: string;
  isNsfw?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  viewCount?: number;
  nickname?: string;
  modelName?: string;
  prompt?: string;
  publishedAt?: string;
}

interface Category {
  id: string;
  name: string;
  count: number;
}

function PostCard({ post, onLike, onView }: { post: Post; onLike: (p: Post) => void; onView: (p: Post) => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-purple-500/50 transition-all"
    >
      <div 
        className="aspect-square cursor-pointer relative"
        onClick={() => onView(post)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[var(--bg-tertiary)] animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
        )}
        <img
          src={post.thumbnailUrl || post.imageUrl}
          alt={post.title || 'Community post'}
          className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition-all ${
                  post.isLiked ? 'bg-red-500/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{post.likeCount || 0}</span>
              </button>
              <div className="flex items-center gap-1 text-white/70 text-sm">
                <Eye className="w-4 h-4" />
                {post.viewCount || 0}
              </div>
            </div>
          </div>
        </div>
        
        {post.category && (
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.other}`}>
              {post.category}
            </span>
          </div>
        )}
        
        {post.isNsfw && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500 text-white">NSFW</span>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <p className="text-xs text-[var(--text-muted)]">by {post.nickname || 'Anonymous'}</p>
        {post.title && (
          <p className="text-sm font-medium truncate mt-1 text-[var(--text-primary)]">{post.title}</p>
        )}
      </div>
    </motion.div>
  );
}

function PostModal({ post, onClose, onLike }: { post: Post; onClose: () => void; onLike: (p: Post) => void }) {
  if (!post) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 bg-black flex items-center justify-center min-w-0">
          <img
            src={post.imageUrl || post.thumbnailUrl}
            alt={post.title || 'Community post'}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
        
        <div className="w-80 border-l border-[var(--border-color)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">{post.nickname || 'Anonymous'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Unknown date'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {post.title && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Title</p>
                <p className="font-medium text-[var(--text-primary)]">{post.title}</p>
              </div>
            )}
            
            {post.category && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.other}`}>
                  {post.category}
                </span>
              </div>
            )}
            
            {post.modelName && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Model</p>
                <p className="text-cyan-400">{post.modelName}</p>
              </div>
            )}
            
            {post.prompt && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Prompt</p>
                <p className="text-sm bg-[var(--bg-primary)] rounded-lg p-3 text-[var(--text-secondary)]">{post.prompt}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-primary)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)]">Likes</p>
                <p className="font-medium flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  {post.likeCount || 0}
                </p>
              </div>
              <div className="bg-[var(--bg-primary)] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)]">Views</p>
                <p className="font-medium flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Eye className="w-4 h-4" />
                  {post.viewCount || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => onLike(post)}
              className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                post.isLiked
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
              {post.isLiked ? 'Liked' : 'Like'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([{ id: 'all', name: 'All', count: 0 }]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetch(`${API_BASE}/community/categories`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories([{ id: 'all', name: 'All', count: 0 }, ...data]);
        }
      })
      .catch(() => {});
  }, []);
  
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        const params = new URLSearchParams();
        if (activeCategory !== 'all') params.set('category', activeCategory);
        params.set('sort', sortBy);
        params.set('page', page.toString());
        params.set('limit', '24');
        
        const response = await fetch(`${API_BASE}/community?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || (Array.isArray(data) ? data : []));
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [activeCategory, sortBy, page]);
  
  const handleLike = async (post: Post) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      alert('Please login to like posts');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/community/${post.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        setPosts(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, isLiked: data.liked, likeCount: data.likeCount }
            : p
        ));
        
        if (selectedPost?.id === post.id) {
          setSelectedPost(prev => prev ? {
            ...prev,
            isLiked: data.liked,
            likeCount: data.likeCount
          } : null);
        }
      }
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };
  
  const handleViewPost = async (post: Post) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/community/${post.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedPost(data);
      } else {
        setSelectedPost(post);
      }
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setSelectedPost(post);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3 text-[var(--text-primary)]">
                <Sparkles className="w-7 h-7 text-cyan-400" />
                Community Gallery
              </h1>
              <p className="text-[var(--text-muted)] mt-1">Explore amazing AI-generated creations from our community</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm w-64 outline-none focus:border-cyan-500 transition-colors text-[var(--text-primary)]"
              />
            </div>
          </div>
          
          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {cat.name}
                {cat.count > 0 && <span className="ml-1.5 text-xs opacity-70">({cat.count})</span>}
              </button>
            ))}
          </div>
          
          {/* Sort options */}
          <div className="flex items-center gap-2 mt-4">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  setSortBy(option.id);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  sortBy === option.id
                    ? 'bg-[var(--bg-secondary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                <AnimatePresence mode="popLayout">
                  {posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLike}
                      onView={handleViewPost}
                    />
                  ))}
                </AnimatePresence>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        page === p
                          ? 'bg-cyan-500 text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <p className="text-xl font-medium mb-2 text-[var(--text-primary)]">No posts yet</p>
              <p className="text-[var(--text-muted)]">Be the first to publish your creations!</p>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onLike={handleLike}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
