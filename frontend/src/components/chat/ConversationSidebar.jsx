import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageSquare, Trash2, Edit2, Check, X, 
  ChevronLeft, ChevronRight, MoreHorizontal 
} from 'lucide-react';

export default function ConversationSidebar({ 
  conversations, 
  activeConversation, 
  onSelect, 
  onNew, 
  onDelete, 
  onRename,
  collapsed,
  onToggleCollapse 
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const handleStartEdit = (conv) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editingId) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Group conversations by date
  const groupConversations = (convos) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    convos.forEach(conv => {
      const date = new Date(conv.updatedAt || conv.createdAt);
      if (date >= today) {
        groups.today.push(conv);
      } else if (date >= yesterday) {
        groups.yesterday.push(conv);
      } else if (date >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations(conversations);

  const renderConversation = (conv) => (
    <motion.div
      key={conv.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative group"
    >
      {editingId === conv.id ? (
        <div className="flex items-center gap-1 px-3 py-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded text-sm outline-none border border-cyan-500/50"
            autoFocus
          />
          <button onClick={handleSaveEdit} className="p-1 hover:bg-[var(--card-hover)] rounded">
            <Check className="w-4 h-4 text-green-400" />
          </button>
          <button onClick={handleCancelEdit} className="p-1 hover:bg-[var(--card-hover)] rounded">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => onSelect(conv)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(conv); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
            activeConversation?.id === conv.id
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate text-sm">{conv.title}</span>
          
          {/* Hover actions */}
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleStartEdit(conv); }}
              className="p-1 hover:bg-[var(--card-hover)] rounded"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              className="p-1 hover:bg-[var(--card-hover)] rounded text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderGroup = (title, convos) => {
    if (convos.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2">
          {title}
        </h4>
        <div className="space-y-1">
          {convos.map(renderConversation)}
        </div>
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg mb-4"
        >
          <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
        </button>
        <button
          onClick={onNew}
          className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <button
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-medium text-sm text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onToggleCollapse}
          className="ml-2 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            No conversations yet
          </div>
        ) : (
          <>
            {renderGroup('Today', groups.today)}
            {renderGroup('Yesterday', groups.yesterday)}
            {renderGroup('Last 7 days', groups.lastWeek)}
            {renderGroup('Older', groups.older)}
          </>
        )}
      </div>
    </div>
  );
}
