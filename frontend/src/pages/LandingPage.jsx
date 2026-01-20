import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import AuthModal from '../components/shared/AuthModal';
import PricingModal from '../components/shared/PricingModal';
import SEO, { createOrganizationSchema, createSoftwareApplicationSchema, createFAQSchema } from '../components/shared/SEO';
import {
  Navbar,
  HeroSection,
  WhatsNewSection,
  TrendingToolsSection,
  ValuePropSection,
  PricingSection,
  CommunitySection,
  ModelsSection,
  EnterpriseSection,
  TestimonialsSection,
  FAQSection,
  FooterSection,
} from '../components/landing';

// FAQ data for structured schema
const FAQ_DATA = [
  {
    question: "What is OmniHub?",
    answer: "OmniHub is an AI-powered creative platform that provides access to the best AI models for image generation, video creation, and AI chat in one unified interface."
  },
  {
    question: "How does the credit system work?",
    answer: "OmniHub uses a flexible credit system. You purchase credits and use them across any AI model. Different models have different credit costs based on their computational requirements and output quality."
  },
  {
    question: "Which AI models are available?",
    answer: "OmniHub provides access to over 70+ AI models including FLUX Pro, SDXL, Kling AI, Luma Dream Machine, GPT-4, Claude, and many more for image generation, video creation, and AI chat."
  },
  {
    question: "Can I use OmniHub for commercial projects?",
    answer: "Yes, outputs generated through OmniHub can be used for commercial projects. However, please check individual model licensing terms as some models may have specific usage restrictions."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, new users receive free credits to try out OmniHub. This allows you to explore different AI models and see which ones work best for your creative needs."
  }
];

const API_BASE = 'http://localhost:3001/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [plans, setPlans] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [landingModels, setLandingModels] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('userToken');
    if (token) {
      navigate('/dashboard/home');
    }
    
    // Fetch data
    fetchPlans();
    fetchFeaturedItems();
    fetchLandingModels();
  }, [navigate]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_BASE}/subscription-plans`);
      setPlans(response.data);
    } catch (err) {
      console.error('Failed to fetch plans');
    }
  };

  const fetchFeaturedItems = async () => {
    try {
      const response = await axios.get(`${API_BASE}/landing/featured`);
      setFeaturedItems(response.data);
    } catch (err) {
      // API not yet implemented, use default
      console.log('Featured API not available, using defaults');
    }
  };

  const fetchLandingModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/landing/models`);
      setLandingModels(response.data);
    } catch (err) {
      // API not yet implemented, use default
      console.log('Landing models API not available, using defaults');
    }
  };

  const handleAuthSuccess = (user, token) => {
    localStorage.setItem('userToken', token);
    setShowAuthModal(false);
    navigate('/dashboard/home');
  };

  const openSignIn = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openGetStarted = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleToolClick = (toolId) => {
    // Navigate to omnihub with the appropriate type
    const typeMap = {
      'image-gen': 'image',
      'video-gen': 'video',
      'ai-chat': 'chat',
      'enhance': 'image',
    };
    navigate(`/omnihub?type=${typeMap[toolId] || 'image'}`);
  };

  const handleViewCommunity = () => {
    navigate('/community');
  };

  const handleViewAllModels = () => {
    navigate('/omnihub');
  };

  const handleContactSales = () => {
    // For now, just show a mailto link or open a form
    window.location.href = 'mailto:sales@tingu.ai?subject=Enterprise%20Inquiry';
  };

  // Combine structured data schemas
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      createOrganizationSchema(),
      createSoftwareApplicationSchema(),
      createFAQSchema(FAQ_DATA)
    ]
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* SEO Meta Tags */}
      <SEO
        title="AI Image & Video Generation Platform"
        description="Create stunning AI-generated images and videos with OmniHub. Access 70+ AI models including FLUX Pro, SDXL, Kling AI, and more. Start creating for free today."
        keywords="AI image generator, AI video generator, FLUX AI, SDXL, Kling AI, AI art, text to image, text to video, AI chat, GPT-4, Claude AI"
        image="https://omnihub.ai/og-image.jpg"
        url="https://omnihub.ai"
        type="website"
        structuredData={structuredData}
      />

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

      {/* Trending Tools */}
      <TrendingToolsSection onToolClick={handleToolClick} />

      {/* Value Proposition */}
      <ValuePropSection onGetStarted={openGetStarted} />

      {/* Pricing Section */}
      <PricingSection
        plans={plans.length > 0 ? plans : undefined}
        onGetStarted={openGetStarted}
        onSelectPlan={(plan) => {
          if (plan.id === 'enterprise') {
            handleContactSales();
          } else {
            openGetStarted();
          }
        }}
      />

      {/* Community Section */}
      <CommunitySection onViewCommunity={handleViewCommunity} />

      {/* Models Section */}
      <ModelsSection
        models={landingModels || undefined}
        onViewAll={handleViewAllModels}
      />

      {/* Enterprise Section */}
      <EnterpriseSection onContactSales={handleContactSales} />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
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

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        user={null}
        onSuccess={() => setShowPricingModal(false)}
      />
    </div>
  );
}
