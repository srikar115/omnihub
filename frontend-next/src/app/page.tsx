import { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

// This page is statically generated at build time (SSG)
export const metadata: Metadata = {
  title: 'AI Image & Video Generation Platform | 70+ AI Models',
  description: 'Create stunning AI-generated images and videos with OmniHub. Access 70+ AI models including FLUX Pro, SDXL, Kling AI, Luma Dream Machine, GPT-4, and more. Start creating for free today.',
  keywords: 'AI image generator, AI video generator, FLUX AI, SDXL, Kling AI, AI art, text to image, text to video, AI chat, GPT-4, Claude AI, AI creative tools',
  alternates: {
    canonical: 'https://omnihub.ai',
  },
  openGraph: {
    title: 'OmniHub - AI Image & Video Generation Platform',
    description: 'Create stunning AI-generated images and videos with access to 70+ AI models including FLUX Pro, SDXL, Kling AI, and more.',
    url: 'https://omnihub.ai',
    type: 'website',
  },
};

// FAQ data for structured schema
const faqData = [
  {
    question: "What is OmniHub?",
    answer: "OmniHub is an AI-powered creative platform that provides access to the best AI models for image generation, video creation, and AI chat in one unified interface."
  },
  {
    question: "How does the credit system work?",
    answer: "OmniHub uses a flexible credit system. You purchase credits and use them across any AI model. Different models have different credit costs based on their computational requirements."
  },
  {
    question: "Which AI models are available?",
    answer: "OmniHub provides access to over 70+ AI models including FLUX Pro, SDXL, Kling AI, Luma Dream Machine, GPT-4, Claude, and many more."
  },
  {
    question: "Can I use OmniHub for commercial projects?",
    answer: "Yes, outputs generated through OmniHub can be used for commercial projects. However, please check individual model licensing terms."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, new users receive free credits to try out OmniHub and explore different AI models."
  }
];

// JSON-LD for FAQ page
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqData.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }))
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage />
    </>
  );
}
