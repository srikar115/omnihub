'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Heart, Eye, Sparkles, ArrowRight, ImageOff, Loader2 } from 'lucide-react';

const API_BASE = '/api';

interface CommunityPost {
  id: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  result?: string;
  likeCount?: number;
  viewCount?: number;
  nickname?: string;
  modelName?: string;
}

const stats = [
  { label: 'Creators', value: 50000, suffix: '+', icon: Users },
  { label: 'Generations', value: 10, suffix: 'M+', icon: Sparkles },
  { label: 'Shared Works', value: 500, suffix: 'K+', icon: Heart },
];

function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(target * easeOut);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    }
    return num.toLocaleString();
  };

  return <span ref={ref}>{target >= 1000 ? formatNumber(count) : count}{suffix}</span>;
}

interface CommunitySectionProps {
  onViewCommunity?: () => void;
}

export function CommunitySection({ onViewCommunity }: CommunitySectionProps) {
  const [communityImages, setCommunityImages] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCommunityPosts();
  }, []);

  const fetchCommunityPosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/community?limit=8&sort=popular`);
      if (response.ok) {
        const data = await response.json();
        const posts = data.posts || data || [];
        setCommunityImages(posts);
      }
    } catch (err) {
      console.log('Community API not available');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => ({ ...prev, [imageId]: true }));
  };

  const getImageData = (post: CommunityPost) => ({
    id: post.id,
    url: post.thumbnailUrl || post.imageUrl || post.result,
    likes: post.likeCount || 0,
    views: post.viewCount || 0,
    creator: post.nickname || 'Anonymous',
    model: post.modelName || 'AI Model',
  });

  return (
    <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-sm mb-6"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-[var(--text-secondary)]">Community Gallery</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            <span className="text-[var(--text-primary)]">Join the most vibrant</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              creative community
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto"
          >
            Get inspired by millions of AI-generated artworks. Share your creations and connect with fellow creators.
          </motion.p>
        </div>

        <div className="flex justify-center gap-8 sm:gap-16 mb-14">
          {stats.map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center group"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <StatIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className={`rounded-2xl bg-[var(--bg-secondary)] animate-pulse ${
                  idx === 0 || idx === 5 ? 'row-span-2 h-80' : 'aspect-square'
                }`}
              />
            ))
          ) : communityImages.length > 0 ? (
            communityImages.slice(0, 8).map((post, idx) => {
              const image = getImageData(post);
              const hasError = imageErrors[image.id];
              
              return (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg shadow-black/10 ${
                    idx === 0 || idx === 5 ? 'row-span-2' : ''
                  }`}
                >
                  {hasError || !image.url ? (
                    <div className={`w-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center ${
                      idx === 0 || idx === 5 ? 'h-full min-h-[320px]' : 'aspect-square'
                    }`}>
                      <div className="text-center">
                        <ImageOff className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                        <span className="text-xs text-[var(--text-muted)]">AI Generated</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={image.url}
                      alt=""
                      onError={() => handleImageError(image.id)}
                      className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                        idx === 0 || idx === 5 ? 'h-full min-h-[320px]' : 'aspect-square'
                      }`}
                    />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                          {image.creator?.[0] || '?'}
                        </div>
                        <span className="text-white text-sm font-medium">{image.creator}</span>
                      </div>
                      <span className="text-white/60 text-xs">{image.model}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-white text-sm">
                        <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                        {image.likes}
                      </div>
                      <div className="flex items-center gap-1.5 text-white text-sm">
                        <Eye className="w-4 h-4" />
                        {(image.views || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <ImageOff className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No community images yet</p>
            </div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.button
            onClick={onViewCommunity}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl font-semibold text-white transition-all shadow-lg shadow-purple-500/20 inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Explore Community Gallery
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="text-sm text-[var(--text-muted)] mt-4">
            Discover 500K+ shared creations from our community
          </p>
        </motion.div>
      </div>
    </section>
  );
}
