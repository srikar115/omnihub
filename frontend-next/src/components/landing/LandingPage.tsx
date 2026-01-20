'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { WhatsNewSection } from './WhatsNewSection';
import { TrendingToolsSection } from './TrendingToolsSection';
import { ModelsSection } from './ModelsSection';
import { ValuePropSection } from './ValuePropSection';
import { CommunitySection } from './CommunitySection';
import { TestimonialsSection } from './TestimonialsSection';
import { EnterpriseSection } from './EnterpriseSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';
import { FooterSection } from './FooterSection';
import { AuthModal } from '@/components/shared/AuthModal';
import { useTheme } from '@/components/providers/ThemeProvider';

const API_BASE = '/api';

interface FeaturedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  linkUrl: string;
  linkText: string;
  featured: boolean;
}

export function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [plans, setPlans] = useState([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('userToken');
    if (token) {
      router.push('/dashboard');
    }
    
    // Fetch data
    fetchPlans();
    fetchFeaturedItems();
  }, [router]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/subscription-plans`);
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans');
    }
  };

  const fetchFeaturedItems = async () => {
    try {
      const response = await fetch(`${API_BASE}/landing/featured`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch featured items');
    }
  };

  const handleAuthSuccess = (user: any) => {
    // Tokens are automatically stored by the auth helpers
    setShowAuthModal(false);
    router.push('/dashboard');
  };

  const openSignIn = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openGetStarted = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleToolClick = (toolId: string) => {
    const typeMap: Record<string, string> = {
      'image-gen': 'image',
      'video-gen': 'video',
      'ai-chat': 'chat',
      'enhance': 'image'
    };
    router.push(`/dashboard/generate?type=${typeMap[toolId] || 'image'}`);
  };

  const handleViewCommunity = () => {
    router.push('/community');
  };

  const handleContactSales = () => {
    window.open('mailto:sales@omnihub.ai', '_blank');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Navigation */}
      <Navbar
        onSignIn={openSignIn}
        onGetStarted={openGetStarted}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Hero Section */}
      <HeroSection onGetStarted={openGetStarted} />

      {/* What's New Section */}
      <WhatsNewSection featuredItems={featuredItems.length > 0 ? featuredItems : undefined} />

      {/* Trending Tools Section */}
      <TrendingToolsSection onToolClick={handleToolClick} />

      {/* Models Section */}
      <ModelsSection />

      {/* Value Proposition Section */}
      <ValuePropSection onGetStarted={openGetStarted} />

      {/* Community Section */}
      <CommunitySection onViewCommunity={handleViewCommunity} />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Enterprise Section */}
      <EnterpriseSection onContactSales={handleContactSales} />

      {/* Pricing Section */}
      <PricingSection 
        plans={plans.length > 0 ? plans : undefined}
        onGetStarted={openGetStarted}
      />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <FooterSection />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          initialMode={authMode}
        />
      )}
    </div>
  );
}
