/**
 * Chat Module Route Definitions
 *
 * All chat/conversation routes are defined here.
 * Routes map to: /api/chat/*
 */

export const CHAT_ROUTES = {
  // Base path
  BASE: 'api/chat',

  // Model routes
  MODELS: 'models', // GET /api/chat/models
  ESTIMATE: 'estimate', // POST /api/chat/estimate

  // Conversation routes
  CONVERSATIONS: 'conversations', // GET, POST /api/chat/conversations
  CONVERSATION_BY_ID: 'conversations/:id', // GET, PATCH, DELETE /api/chat/conversations/:id
  MESSAGES: 'conversations/:id/messages', // POST /api/chat/conversations/:id/messages
} as const;

export const CHAT_ROUTE_DESCRIPTIONS = {
  MODELS: 'Get available chat models',
  ESTIMATE: 'Estimate cost for a chat message',
  LIST_CONVERSATIONS: 'List all conversations',
  CREATE_CONVERSATION: 'Create a new conversation',
  GET_CONVERSATION: 'Get conversation with messages',
  UPDATE_CONVERSATION: 'Update conversation title',
  DELETE_CONVERSATION: 'Delete a conversation',
  SEND_MESSAGE: 'Send a message to the conversation',
} as const;
