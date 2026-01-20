/**
 * SEO Component - Manages document head meta tags
 * 
 * Provides SEO-friendly meta tags for search engines and social sharing.
 * Uses direct DOM manipulation for React 19 compatibility.
 */

import { useEffect } from 'react';

const SEO = ({ 
  title, 
  description, 
  keywords,
  image,
  url,
  type = 'website',
  siteName = 'OmniHub',
  twitterHandle = '@omnihub_ai',
  canonicalUrl,
  structuredData,
  noindex = false
}) => {
  useEffect(() => {
    // Update document title
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (name, content, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Helper to set link tags
    const setLink = (rel, href) => {
      if (!href) return;
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Basic meta tags
    setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);
    if (noindex) setMeta('robots', 'noindex, nofollow');
    else setMeta('robots', 'index, follow');

    // Open Graph tags
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', siteName, true);
    if (url) setMeta('og:url', url, true);
    if (image) {
      setMeta('og:image', image, true);
      setMeta('og:image:width', '1200', true);
      setMeta('og:image:height', '630', true);
    }

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    if (twitterHandle) setMeta('twitter:site', twitterHandle);
    if (image) setMeta('twitter:image', image);

    // Canonical URL
    if (canonicalUrl || url) {
      setLink('canonical', canonicalUrl || url);
    }

    // Structured Data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('#structured-data');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('id', 'structured-data');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // We don't remove tags as they might be used by other pages
      // Just update them on next navigation
    };
  }, [title, description, keywords, image, url, type, siteName, twitterHandle, canonicalUrl, structuredData, noindex]);

  // This component doesn't render anything visible
  return null;
};

// Pre-built structured data helpers
export const createOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'OmniHub',
  url: 'https://omnihub.ai',
  logo: 'https://omnihub.ai/logo.png',
  description: 'AI-powered creative platform for image and video generation',
  sameAs: [
    'https://twitter.com/omnihub_ai',
    'https://github.com/omnihub'
  ]
});

export const createSoftwareApplicationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'OmniHub',
  applicationCategory: 'AIApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with pay-as-you-go credits'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1250'
  }
});

export const createFAQSchema = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }))
});

export const createBreadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
});

export default SEO;
