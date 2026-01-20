'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Square, Image, X, Globe, 
  CreditCard, Paperclip, ChevronDown, Bot
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  capabilities?: {
    vision?: boolean;
    webSearch?: boolean;
  };
}

interface PriceEstimate {
  minCost: number;
  maxCost: number;
}

interface ChatInputProps {
  onSend: (message: string, images: string[], webSearch: boolean) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  model?: Model | null;
  priceEstimate?: PriceEstimate | null;
  userCredits?: number;
  onInputChange?: (input: string, imageCount: number) => void;
  onOpenModelSelector: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  model,
  priceEstimate,
  userCredits = 0,
  onInputChange,
  onOpenModelSelector
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportsVision = model?.capabilities?.vision;
  const supportsWebSearch = model?.capabilities?.webSearch;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    onInputChange?.(input, images.length);
  }, [input, images.length, onInputChange]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || disabled) return;
    
    onSend(input.trim(), images, webSearch);
    setInput('');
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev.slice(0, 3), event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !supportsVision) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setImages(prev => [...prev.slice(0, 3), event.target?.result as string]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const insufficientCredits = (priceEstimate?.minCost || 0) > userCredits;

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        {/* Image Previews */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 mb-3 overflow-x-auto pb-2"
            >
              {images.map((img, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={img} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* Model Selector Button */}
          <button
            onClick={onOpenModelSelector}
            disabled={isStreaming}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            <Bot className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block text-[var(--text-primary)]">
              {model?.name || 'Select Model'}
            </span>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          
          {/* Text Input Container */}
          <div className="flex-1 relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Send a message..."
              disabled={isStreaming || disabled}
              rows={1}
              className="w-full bg-transparent px-4 py-3 pr-32 outline-none resize-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />

            {/* Input Actions */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {supportsVision && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </>
              )}

              {supportsWebSearch && (
                <button
                  onClick={() => setWebSearch(!webSearch)}
                  disabled={isStreaming}
                  className={`p-2 rounded-lg transition-colors ${
                    webSearch 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  } disabled:opacity-50`}
                >
                  <Globe className="w-5 h-5" />
                </button>
              )}

              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Square className="w-5 h-5" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || disabled || insufficientCredits}
                  className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            {webSearch && (
              <span className="flex items-center gap-1 text-cyan-400">
                <Globe className="w-3 h-3" />
                Web Search On
              </span>
            )}
            {images.length > 0 && (
              <span className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                {images.length} image{images.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {priceEstimate && input.trim() && (
            <div className="flex items-center gap-2 text-xs">
              <CreditCard className="w-3 h-3 text-[var(--text-muted)]" />
              <span className={insufficientCredits ? 'text-red-400' : 'text-[var(--text-muted)]'}>
                Est. {priceEstimate.minCost.toFixed(4)} - {priceEstimate.maxCost.toFixed(4)} credits
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
