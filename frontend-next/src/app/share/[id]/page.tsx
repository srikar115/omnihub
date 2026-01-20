import { Metadata } from 'next';
import SharedGenerationClient from './SharedGenerationClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  // Try to fetch generation data for metadata
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/share/${id}`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const generation = await response.json();
      
      return {
        title: `${generation.prompt?.slice(0, 50) || 'AI Generation'} | OmniHub`,
        description: generation.prompt || 'View this AI-generated creation on OmniHub',
        openGraph: {
          title: `AI Generation by OmniHub`,
          description: generation.prompt || 'View this AI-generated creation on OmniHub',
          images: generation.result ? [generation.result] : [],
          type: 'article',
        },
        twitter: {
          card: 'summary_large_image',
          title: `AI Generation | OmniHub`,
          description: generation.prompt || 'View this AI-generated creation on OmniHub',
          images: generation.result ? [generation.result] : [],
        },
      };
    }
  } catch (error) {
    console.error('Failed to fetch generation for metadata:', error);
  }

  return {
    title: 'Shared Generation | OmniHub',
    description: 'View this AI-generated creation on OmniHub',
  };
}

export default async function SharedGenerationPage({ params }: PageProps) {
  const { id } = await params;
  return <SharedGenerationClient id={id} />;
}
