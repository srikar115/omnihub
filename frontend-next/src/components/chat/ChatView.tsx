'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, CreditCard } from 'lucide-react';
import { ConversationSidebar } from './ConversationSidebar';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatModelSelectorModal } from './ChatModelSelectorModal';

const API_BASE = '/api';

interface Model {
  id: string;
  name: string;
  inputCost: number;
  outputCost: number;
  capabilities?: {
    vision?: boolean;
    webSearch?: boolean;
    reasoning?: boolean;
    maxContext?: number;
  };
}

interface Conversation {
  id: string;
  title: string;
  modelId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  credits?: number;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
}

interface PriceEstimate {
  minCost: number;
  maxCost: number;
}

interface ChatViewProps {
  user: User | null;
  updateUserCredits: (credits: number) => void;
  showAuthModal: () => void;
}

export function ChatView({ user, updateUserCredits, showAuthModal }: ChatViewProps) {
  const [chatModels, setChatModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModelModal, setShowModelModal] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchChatModels();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  const fetchChatModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/models`);
      const data = await response.json();
      setChatModels(data);
      if (data.length > 0) {
        setSelectedModel(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch chat models:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data.messages || []);
      
      if (data.modelId) {
        const model = chatModels.find(m => m.id === data.modelId);
        if (model) setSelectedModel(model);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const createConversation = async () => {
    if (!user) {
      showAuthModal();
      return;
    }
    
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelId: selectedModel?.id }),
      });
      
      const data = await response.json();
      setConversations(prev => [data, ...prev]);
      setActiveConversation(data);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const token = localStorage.getItem('userToken');
      await fetch(`${API_BASE}/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const renameConversation = async (id: string, title: string) => {
    try {
      const token = localStorage.getItem('userToken');
      await fetch(`${API_BASE}/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title } : c
      ));
      if (activeConversation?.id === id) {
        setActiveConversation(prev => prev ? { ...prev, title } : null);
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const estimateCost = useCallback(async (inputText: string, imageCount: number) => {
    if (!selectedModel || !inputText.trim()) {
      setPriceEstimate(null);
      return;
    }
    
    const contextTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const textTokens = Math.ceil(inputText.length / 4);
    const imageTokens = imageCount * 85;
    const totalInput = textTokens + imageTokens + contextTokens;
    const minCost = (totalInput * selectedModel.inputCost / 1000) + (100 * selectedModel.outputCost / 1000);
    const maxCost = (totalInput * selectedModel.inputCost / 1000) + (4096 * selectedModel.outputCost / 1000);
    setPriceEstimate({ minCost, maxCost });
  }, [selectedModel, messages]);

  const debouncedEstimate = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (inputText: string, imageCount: number) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => estimateCost(inputText, imageCount), 300);
      };
    })(),
    [estimateCost]
  );

  const sendMessage = async (content: string, imageUrls: string[], webSearch: boolean) => {
    if (!user) {
      showAuthModal();
      return;
    }

    let conversationId = activeConversation?.id;
    if (!conversationId) {
      try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE}/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modelId: selectedModel?.id }),
        });
        
        const data = await response.json();
        setConversations(prev => [data, ...prev]);
        setActiveConversation(data);
        conversationId = data.id;
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    const userMessage: Message = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content,
      imageUrls: imageUrls || [],
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingMessage('');
    setPriceEstimate(null);

    abortControllerRef.current = new AbortController();

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(
        `${API_BASE}/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, imageUrls, webSearch }),
          signal: abortControllerRef.current.signal
        }
      );

      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content') {
              fullContent += parsed.content;
              setStreamingMessage(fullContent);
            } else if (parsed.type === 'done') {
              const assistantMessage: Message = {
                id: parsed.messageId,
                role: 'assistant',
                content: fullContent,
                credits: parsed.credits,
                createdAt: new Date().toISOString()
              };
              setMessages(prev => [...prev, assistantMessage]);
              updateUserCredits(parsed.userCredits);
              fetchConversations();
            } else if (parsed.type === 'error') {
              console.error('Stream error:', parsed.error);
              alert('Error: ' + parsed.error);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Send message error:', err);
        alert('Failed to send message');
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Sign in to chat</h3>
          <p className="text-[var(--text-muted)] mb-4">Create an account to start chatting with AI models</p>
          <button
            onClick={showAuthModal}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-medium hover:opacity-90 transition-opacity text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ConversationSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={setActiveConversation}
        onNew={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-sm text-[var(--text-primary)]">
              {activeConversation?.title || 'New Chat'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <CreditCard className="w-4 h-4" />
              <span className="font-mono text-cyan-400">{(parseFloat(String(user?.credits)) || 0).toFixed(2)}</span>
            </div>
            
            <button
              onClick={createConversation}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
              title="New chat"
            >
              <Plus className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
        />

        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={loading}
          model={selectedModel}
          priceEstimate={priceEstimate}
          userCredits={user?.credits || 0}
          onInputChange={debouncedEstimate}
          onOpenModelSelector={() => setShowModelModal(true)}
        />
      </div>

      {/* Model Selector Modal */}
      <AnimatePresence>
        {showModelModal && (
          <ChatModelSelectorModal
            models={chatModels}
            selectedModel={selectedModel}
            onSelect={(model) => {
              setSelectedModel(model);
              setShowModelModal(false);
            }}
            onClose={() => setShowModelModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
