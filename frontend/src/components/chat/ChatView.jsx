import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ConversationSidebar from './ConversationSidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatModelSelectorModal from './ChatModelSelectorModal';
import { Plus, CreditCard } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export default function ChatView({ user, updateUserCredits, showAuthModal }) {
  // State
  const [chatModels, setChatModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const abortControllerRef = useRef(null);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
  });

  // Fetch chat models on mount
  useEffect(() => {
    fetchChatModels();
  }, []);

  // Fetch conversations when user changes
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

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  const fetchChatModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/chat/models`);
      setChatModels(response.data);
      if (response.data.length > 0) {
        setSelectedModel(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch chat models:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_BASE}/chat/conversations`, getAuthHeaders());
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/chat/conversations/${conversationId}`, 
        getAuthHeaders()
      );
      setMessages(response.data.messages || []);
      
      // Update model if conversation has one
      if (response.data.modelId) {
        const model = chatModels.find(m => m.id === response.data.modelId);
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
      const response = await axios.post(`${API_BASE}/chat/conversations`, {
        modelId: selectedModel?.id
      }, getAuthHeaders());
      
      setConversations(prev => [response.data, ...prev]);
      setActiveConversation(response.data);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const deleteConversation = async (id) => {
    try {
      await axios.delete(`${API_BASE}/chat/conversations/${id}`, getAuthHeaders());
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const renameConversation = async (id, title) => {
    try {
      await axios.patch(`${API_BASE}/chat/conversations/${id}`, { title }, getAuthHeaders());
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title } : c
      ));
      if (activeConversation?.id === id) {
        setActiveConversation(prev => ({ ...prev, title }));
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleModelChange = async (model) => {
    setSelectedModel(model);
    
    // Update conversation model if one is active
    if (activeConversation) {
      try {
        await axios.patch(
          `${API_BASE}/chat/conversations/${activeConversation.id}`, 
          { modelId: model.id },
          getAuthHeaders()
        );
      } catch (err) {
        console.error('Failed to update conversation model:', err);
      }
    }
  };

  const estimateCost = useCallback(async (inputText, imageCount) => {
    if (!selectedModel || !inputText.trim()) {
      setPriceEstimate(null);
      return;
    }
    
    const contextTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    
    try {
      const response = await axios.post(`${API_BASE}/chat/estimate`, {
        modelId: selectedModel.id,
        inputText,
        imageCount,
        contextTokens
      });
      setPriceEstimate(response.data);
    } catch (err) {
      // Fallback local estimate
      const textTokens = Math.ceil(inputText.length / 4);
      const imageTokens = imageCount * 85;
      const totalInput = textTokens + imageTokens + contextTokens;
      const minCost = (totalInput * selectedModel.inputCost / 1000) + (100 * selectedModel.outputCost / 1000);
      const maxCost = (totalInput * selectedModel.inputCost / 1000) + (4096 * selectedModel.outputCost / 1000);
      setPriceEstimate({ minCost, maxCost });
    }
  }, [selectedModel, messages]);

  // Debounced price estimation
  const debouncedEstimate = useCallback(
    (() => {
      let timeout;
      return (inputText, imageCount) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => estimateCost(inputText, imageCount), 300);
      };
    })(),
    [estimateCost]
  );

  const sendMessage = async (content, imageUrls, webSearch) => {
    if (!user) {
      showAuthModal();
      return;
    }

    // Create conversation if none active
    let conversationId = activeConversation?.id;
    if (!conversationId) {
      try {
        const response = await axios.post(`${API_BASE}/chat/conversations`, {
          modelId: selectedModel?.id
        }, getAuthHeaders());
        
        setConversations(prev => [response.data, ...prev]);
        setActiveConversation(response.data);
        conversationId = response.data.id;
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    // Add user message optimistically
    const userMessage = {
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

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${API_BASE}/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          },
          body: JSON.stringify({ content, imageUrls, webSearch }),
          signal: abortControllerRef.current.signal
        }
      );

      const reader = response.body.getReader();
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
              // Add assistant message
              const assistantMessage = {
                id: parsed.messageId,
                role: 'assistant',
                content: fullContent,
                outputTokens: parsed.outputTokens,
                credits: parsed.credits,
                createdAt: new Date().toISOString()
              };
              setMessages(prev => [...prev, assistantMessage]);
              updateUserCredits(parsed.userCredits);
              
              // Update conversation in list
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
    } catch (err) {
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
          <h3 className="text-xl font-semibold mb-2">Sign in to chat</h3>
          <p className="text-[var(--text-muted)] mb-4">Create an account to start chatting with AI models</p>
          <button
            onClick={showAuthModal}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-88px)]">
      {/* Sidebar */}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        {/* Simplified Chat Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Conversation title or default */}
            <h2 className="font-medium text-sm text-[var(--text-primary)]">
              {activeConversation?.title || 'New Chat'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <CreditCard className="w-4 h-4" />
              <span className="font-mono text-cyan-400">{user?.credits?.toFixed(2)}</span>
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

        {/* Messages */}
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
        />

        {/* Input */}
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
            onSelect={handleModelChange}
            onClose={() => setShowModelModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
