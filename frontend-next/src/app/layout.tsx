import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://omnihub.ai'),
  title: {
    default: 'OmniHub - AI Image & Video Generation Platform',
    template: '%s | OmniHub',
  },
  description: 'Create stunning AI-generated images and videos with OmniHub. Access 70+ AI models including FLUX Pro, SDXL, Kling AI, Luma Dream Machine, GPT-4, and more.',
  keywords: ['AI image generator', 'AI video generator', 'FLUX AI', 'SDXL', 'Kling AI', 'AI art', 'text to image', 'text to video', 'AI chat', 'GPT-4', 'Claude AI'],
  authors: [{ name: 'OmniHub' }],
  creator: 'OmniHub',
  publisher: 'OmniHub',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://omnihub.ai',
    siteName: 'OmniHub',
    title: 'OmniHub - AI Image & Video Generation Platform',
    description: 'Create stunning AI-generated images and videos with access to 70+ AI models including FLUX Pro, SDXL, Kling AI, and more.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OmniHub - AI Generation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniHub - AI Image & Video Generation Platform',
    description: 'Create stunning AI-generated images and videos with access to 70+ AI models.',
    site: '@omnihub_ai',
    creator: '@omnihub_ai',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
};

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://omnihub.ai/#organization',
      name: 'OmniHub',
      url: 'https://omnihub.ai',
      logo: {
        '@type': 'ImageObject',
        url: 'https://omnihub.ai/logo.png',
      },
      description: 'AI-powered creative platform for image and video generation',
      sameAs: ['https://twitter.com/omnihub_ai'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://omnihub.ai/#website',
      url: 'https://omnihub.ai',
      name: 'OmniHub',
      publisher: { '@id': 'https://omnihub.ai/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'OmniHub',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier with pay-as-you-go credits',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
