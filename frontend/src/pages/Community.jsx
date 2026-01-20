import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Eye, Search, Filter, Grid, LayoutGrid,
  X, ChevronDown, Loader2, ExternalLink, User,
  TrendingUp, Clock, Flame, Sparkles, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import { AppLayout } from '../components/layout';
import SEO from '../components/shared/SEO';

const API_BASE = 'http://localhost:3001/api';

// Category badge colors
const CATEGORY_COLORS = {
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

// Sort options
const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'popular', label: 'Most Liked', icon: Heart },
  { id: 'trending', label: 'Trending', icon: Flame }
];

// Post card component
function PostCard({ post, onLike, onView }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#2a2c35] transition-all"
    >
      {/* Image */}
      <div 
        className="aspect-square cursor-pointer relative"
        onClick={() => onView(post)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[var(--bg-tertiary)] animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[#2a2c35]" />
          </div>
        )}
        <img
          src={post.thumbnailUrl || post.imageUrl}
          alt={post.title || 'Community post'}
          className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Stats */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition-all ${
                  post.isLiked 
                    ? 'bg-red-500/80 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{post.likeCount}</span>
              </button>
              <div className="flex items-center gap-1 text-white/70 text-sm">
                <Eye className="w-4 h-4" />
                {post.viewCount}
              </div>
            </div>
          </div>
        </div>
        
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.other}`}>
            {post.category}
          </span>
        </div>
        
        {/* NSFW badge */}
        {post.isNsfw && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500 text-white">
              NSFW
            </span>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-[var(--text-muted)]">by {post.nickname}</p>
        {post.title && (
          <p className="text-sm font-medium truncate mt-1">{post.title}</p>
        )}
      </div>
    </motion.div>
  );
}

// Post detail modal
function PostModal({ post, onClose, onLike }) {
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
        {/* Image */}
        <div className="flex-1 bg-black flex items-center justify-center min-w-0">
          <img
            src={post.imageUrl}
            alt={post.title || 'Community post'}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
        
        {/* Details sidebar */}
        <div className="w-80 border-l border-[var(--border-color)] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">{post.nickname}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Title */}
            {post.title && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Title</p>
                <p className="font-medium">{post.title}</p>
              </div>
            )}
            
            {/* Category */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Category</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.other}`}>
                {post.category}
              </span>
            </div>
            
            {/* Model */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Model</p>
              <p className="text-cyan-400">{post.modelName}</p>
            </div>
            
            {/* Prompt */}
            {post.prompt && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Prompt</p>
                <p className="text-sm bg-[#0a0b0f] rounded-lg p-3">{post.prompt}</p>
              </div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a0b0f] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)]">Likes</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  {post.likeCount}
                </p>
              </div>
              <div className="bg-[#0a0b0f] rounded-lg p-3">
                <p className="text-xs text-[var(--text-muted)]">Views</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {post.viewCount}
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t border-[var(--border-color)]">
            <button
              onClick={() => onLike(post)}
              className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                post.isLiked
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[var(--bg-tertiary)] hover:bg-[#252730] text-white'
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
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState(null);
  
  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setUser(res.data)).catch(() => {});
    }
  }, []);
  
  // Fetch categories
  useEffect(() => {
    axios.get(`${API_BASE}/community/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);
  
  // Fetch posts
  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('userToken');
    
    axios.get(`${API_BASE}/community`, {
      params: {
        category: activeCategory === 'all' ? undefined : activeCategory,
        sort: sortBy,
        page,
        limit: 24
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        setPosts(res.data.posts);
        setTotalPages(res.data.totalPages);
      })
      .catch(err => console.error('Failed to fetch posts:', err))
      .finally(() => setLoading(false));
  }, [activeCategory, sortBy, page]);
  
  // Handle like
  const handleLike = async (post) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      alert('Please login to like posts');
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/community/${post.id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update post in list
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, isLiked: res.data.liked, likeCount: res.data.likeCount }
          : p
      ));
      
      // Update selected post if open
      if (selectedPost?.id === post.id) {
        setSelectedPost(prev => ({
          ...prev,
          isLiked: res.data.liked,
          likeCount: res.data.likeCount
        }));
      }
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };
  
  // Handle view post
  const handleViewPost = async (post) => {
    const token = localStorage.getItem('userToken');
    
    try {
      const res = await axios.get(`${API_BASE}/community/${post.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSelectedPost(res.data);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setSelectedPost(post);
    }
  };

  return (
    <AppLayout>
      <SEO
        title="AI Art Community"
        description="Explore and share stunning AI-generated artwork created with OmniHub. Browse creations from FLUX, SDXL, Kling AI, and more. Join our creative community."
        keywords="AI art community, AI generated images, FLUX artwork, SDXL art, AI creations, generative art gallery"
        url="https://omnihub.ai/community"
        type="website"
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-cyan-400" />
                Community Gallery
              </h1>
              <p className="text-[var(--text-muted)] mt-1">Explore amazing AI-generated creations from our community</p>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[var(--bg-tertiary)] border border-[#2a2c35] rounded-xl text-sm w-64 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
          
          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white hover:bg-[#252730]'
                }`}
              >
                {cat.name}
                <span className="ml-1.5 text-xs opacity-70">({cat.count})</span>
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
                    ? 'bg-[#2a2c35] text-white'
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
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : posts.length > 0 ? (
            <>
              {/* Grid */}
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        page === p
                          ? 'bg-cyan-500 text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[#252730] hover:text-white'
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
              <p className="text-xl font-medium mb-2">No posts yet</p>
              <p className="text-[var(--text-muted)]">Be the first to publish your creations!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onLike={handleLike}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
