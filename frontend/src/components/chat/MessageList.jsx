import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  User, Bot, Copy, Check, Globe, Loader2, 
  Image as ImageIcon, CreditCard, RefreshCw, Share2
} from 'lucide-react';

// Throttle utility function
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4" style={{ contain: 'layout' }}>
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

function MessageBubble({ message, isStreaming, onCopy, onRegenerate }) {
  const isUser = message.role === 'user';
  const images = message.imageUrls || [];
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
      className={`group flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {/* Images */}
        {images.length > 0 && (
          <div className={`flex gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
            {images.map((url, i) => (
              <img 
                key={i} 
                src={url} 
                alt="" 
                className="max-w-48 max-h-48 rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div 
          className={`inline-block rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
              : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
          }`}
          style={!isUser && isStreaming ? { minHeight: '60px' } : undefined}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div 
              className="prose prose-invert prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-3 prose-blockquote:my-3"
              style={{ contain: 'layout style' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    
                    if (!inline && language) {
                      return (
                        <CodeBlock language={language}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      );
                    }
                    
                    // Handle code blocks without language specification
                    if (!inline) {
                      return (
                        <CodeBlock language="text">
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      );
                    }
                    
                                    return (
                                      <code 
                                        className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-cyan-500 text-sm" 
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  h1({ children }) {
                                    return <h1 className="text-xl font-bold mt-5 mb-3 pb-2 border-b border-[var(--border-color)]">{children}</h1>;
                                  },
                  h2({ children }) {
                    return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-base font-medium mt-3 mb-2">{children}</h3>;
                  },
                  h4({ children }) {
                    return <h4 className="text-sm font-medium mt-3 mb-1">{children}</h4>;
                  },
                  p({ children }) {
                    return <p className="my-2.5 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="my-2.5 ml-4 space-y-1 list-disc">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="my-2.5 ml-4 space-y-1 list-decimal">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  a({ href, children }) {
                    return (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                                  table({ children }) {
                                    return (
                                      <div className="overflow-x-auto my-4">
                                        <table className="min-w-full border border-[var(--border-color)] rounded-lg overflow-hidden">
                                          {children}
                                        </table>
                                      </div>
                                    );
                                  },
                                  th({ children }) {
                                    return (
                                      <th className="bg-[var(--bg-secondary)] px-4 py-2 text-left border-b border-[var(--border-color)] font-medium text-[var(--text-primary)]">
                                        {children}
                                      </th>
                                    );
                                  },
                                  td({ children }) {
                                    return (
                                      <td className="px-4 py-2 border-b border-[var(--border-color)] text-[var(--text-primary)]">
                                        {children}
                                      </td>
                                    );
                                  },
                                  blockquote({ children }) {
                                    return (
                                      <blockquote className="border-l-4 border-cyan-500 pl-4 my-3 italic text-[var(--text-secondary)]">
                                        {children}
                                      </blockquote>
                                    );
                                  },
                                  hr() {
                                    return <hr className="my-4 border-[var(--border-color)]" />;
                                  },
                                  strong({ children }) {
                                    return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>;
                                  },
                                  em({ children }) {
                                    return <em className="italic text-[var(--text-secondary)]">{children}</em>;
                                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              
              {isStreaming && (
                <span className="inline-flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* User message timestamp */}
        {isUser && message.createdAt && (
          <div className="text-xs text-[var(--text-muted)] mt-1 opacity-0 group-hover:opacity-60 transition-opacity" title={new Date(message.createdAt).toLocaleString()}>
            {formatRelativeTime(message.createdAt)}
          </div>
        )}

        {/* Message meta and actions */}
        {!isUser && !isStreaming && (
          <div className="flex items-center justify-between mt-2">
            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              {/* Timestamp */}
              {message.createdAt && (
                <span className="opacity-60" title={new Date(message.createdAt).toLocaleString()}>
                  {formatRelativeTime(message.createdAt)}
                </span>
              )}
              {message.webSearchUsed && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Web
                </span>
              )}
              {message.credits > 0 && (
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {message.credits?.toFixed(4)}
                </span>
              )}
              {message.outputTokens > 0 && (
                <span>{message.outputTokens} tok</span>
              )}
            </div>
            
            {/* Action buttons - visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                )}
              </button>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(message)}
                  className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MessageList({ messages, streamingMessage, isStreaming, onRegenerate }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  
  // Throttled scroll to bottom during streaming
  const scrollToBottom = useCallback(
    throttle(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150),
    []
  );

  // Scroll when new messages arrive
  useEffect(() => {
    if (!isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Throttled scroll during streaming
  useEffect(() => {
    if (isStreaming && streamingMessage) {
      scrollToBottom();
    }
  }, [streamingMessage, isStreaming, scrollToBottom]);

  const suggestedPrompts = [
    { icon: '💡', text: 'Explain a concept', prompt: 'Explain how machine learning works in simple terms' },
    { icon: '💻', text: 'Debug code', prompt: 'Help me debug this code that\'s not working as expected' },
    { icon: '✍️', text: 'Write content', prompt: 'Write a professional email to schedule a meeting' },
    { icon: '📊', text: 'Analyze data', prompt: 'Help me analyze these trends and create insights' },
  ];

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mb-6">
          <Bot className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">How can I help you today?</h3>
        <p className="text-[var(--text-muted)] max-w-md mb-8">
          I can help with coding, writing, analysis, brainstorming, and much more.
        </p>
        
        {/* Suggested prompts */}
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          {suggestedPrompts.map((item, i) => (
            <button
              key={i}
              className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-emerald-500/30 hover:bg-[var(--bg-tertiary)] transition-all text-left group"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {item.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              isStreaming={false} 
              onRegenerate={message.role === 'assistant' ? onRegenerate : undefined}
            />
          ))}
        </AnimatePresence>
        
        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <MessageBubble 
            message={{ 
              id: 'streaming', 
              role: 'assistant', 
              content: streamingMessage,
              imageUrls: [] 
            }} 
            isStreaming={true} 
          />
        )}
        
        {/* Loading indicator when waiting for first token */}
        {isStreaming && !streamingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
