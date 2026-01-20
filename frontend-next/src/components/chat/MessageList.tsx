'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check, Globe, CreditCard, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  imageUrls?: string[];
  images?: string[];
  credits?: number;
}

interface MessageListProps {
  messages: Message[];
  streamingMessage?: string;
  isStreaming?: boolean;
}

// Format relative time
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Code Block Component with copy button
function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {/* Language badge and copy button */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {language && language !== 'text' && (
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 bg-[var(--bg-secondary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          padding: '1rem',
          paddingTop: '2.5rem',
          fontSize: '0.875rem',
          minHeight: '60px',
        }}
        wrapLines={true}
        wrapLongLines={true}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string, id: string) => void }) {
  const isUser = message.role === 'user';
  const images = message.imageUrls || message.images || [];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Images */}
        {images.length > 0 && (
          <div className={`flex gap-2 mb-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
            {images.map((img, i) => (
              <img 
                key={i} 
                src={img} 
                alt="" 
                className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(img, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Text Content */}
        <div className={`inline-block max-w-full ${
          isUser 
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3' 
            : 'text-left'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-[var(--text-primary)] prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    
                    if (!inline && (match || codeContent.includes('\n'))) {
                      return (
                        <CodeBlock language={match?.[1]}>
                          {codeContent}
                        </CodeBlock>
                      );
                    }
                    
                    return (
                      <code 
                        className="bg-[var(--bg-tertiary)] text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children }: any) {
                    return <>{children}</>;
                  },
                  a({ href, children }: any) {
                    return (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {children}
                      </a>
                    );
                  },
                  table({ children }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-[var(--border-color)]">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }: any) {
                    return (
                      <th className="border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-left font-semibold">
                        {children}
                      </th>
                    );
                  },
                  td({ children }: any) {
                    return (
                      <td className="border border-[var(--border-color)] px-4 py-2">
                        {children}
                      </td>
                    );
                  },
                  blockquote({ children }: any) {
                    return (
                      <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 italic text-[var(--text-secondary)]">
                        {children}
                      </blockquote>
                    );
                  },
                  ul({ children }: any) {
                    return <ul className="list-disc list-inside space-y-1">{children}</ul>;
                  },
                  ol({ children }: any) {
                    return <ol className="list-decimal list-inside space-y-1">{children}</ol>;
                  },
                  h1({ children }: any) {
                    return <h1 className="text-2xl font-bold text-[var(--text-primary)]">{children}</h1>;
                  },
                  h2({ children }: any) {
                    return <h2 className="text-xl font-bold text-[var(--text-primary)]">{children}</h2>;
                  },
                  h3({ children }: any) {
                    return <h3 className="text-lg font-semibold text-[var(--text-primary)]">{children}</h3>;
                  },
                  hr() {
                    return <hr className="my-4 border-[var(--border-color)]" />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            {message.credits !== undefined && (
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {message.credits.toFixed(4)}
              </span>
            )}
            {message.createdAt && (
              <span className="text-xs text-[var(--text-muted)]">
                {formatRelativeTime(message.createdAt)}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function MessageList({ messages, streamingMessage, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Throttled scroll
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">How can I help you today?</h2>
          <p className="text-[var(--text-muted)] mb-6">
            I can help with coding, writing, analysis, brainstorming, and much more.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left">
              <span className="text-lg mb-1">💡</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">Explain a concept</p>
            </button>
            <button className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left">
              <span className="text-lg mb-1">🔧</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">Debug code</p>
            </button>
            <button className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left">
              <span className="text-lg mb-1">✍️</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">Write content</p>
            </button>
            <button className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left">
              <span className="text-lg mb-1">📊</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">Analyze data</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onCopy={copyToClipboard}
          />
        ))}

        {/* Streaming Message */}
        {isStreaming && streamingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="prose prose-invert max-w-none text-[var(--text-primary)] prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      
                      if (!inline && (match || codeContent.includes('\n'))) {
                        return (
                          <CodeBlock language={match?.[1]}>
                            {codeContent}
                          </CodeBlock>
                        );
                      }
                      
                      return (
                        <code 
                          className="bg-[var(--bg-tertiary)] text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre({ children }: any) {
                      return <>{children}</>;
                    },
                  }}
                >
                  {streamingMessage}
                </ReactMarkdown>
                <span className="inline-block w-2 h-5 bg-emerald-400 animate-pulse ml-1" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
