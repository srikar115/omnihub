'use client';

import Link from 'next/link';
import { Sparkles, Twitter, Github, Mail } from 'lucide-react';

export function FooterSection() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: 'Image Generation', href: '/omnihub?type=image' },
      { label: 'Video Generation', href: '/omnihub?type=video' },
      { label: 'AI Chat', href: '/omnihub?type=chat' },
      { label: 'Pricing', href: '/#pricing' },
    ],
    Resources: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api-docs' },
      { label: 'Community', href: '/community' },
      { label: 'Blog', href: '/blog' },
    ],
    Company: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  return (
    <footer className="py-16 px-4 sm:px-6 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xl font-bold text-[var(--text-primary)]">OmniHub</span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              All the best AI models in one place. Generate images, videos, and chat with AI.
            </p>
            <div className="flex gap-3">
              <a
                href="https://twitter.com/omnihub_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-purple-500/50 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-[var(--text-secondary)]" />
              </a>
              <a
                href="https://github.com/omnihub"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-purple-500/50 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4 text-[var(--text-secondary)]" />
              </a>
              <a
                href="mailto:hello@omnihub.ai"
                className="p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-purple-500/50 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © {currentYear} OmniHub. All rights reserved.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Made with ❤️ for creators worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
