import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  EstimateCostDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Get chat models
   */
  async getModels() {
    const models = await this.db.getAll<any>(
      `SELECT * FROM models WHERE type = 'chat' AND enabled = true ORDER BY display_order ASC`,
    );

    return models.map((model) => ({
      ...model,
      displayOrder: model.display_order,
      inputCost: model.input_cost,
      outputCost: model.output_cost,
      options: typeof model.options === 'string' ? JSON.parse(model.options) : model.options,
      capabilities:
        typeof model.capabilities === 'string'
          ? JSON.parse(model.capabilities)
          : model.capabilities,
    }));
  }

  /**
   * Estimate chat cost
   */
  async estimateCost(dto: EstimateCostDto) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [dto.modelId]);

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // Rough estimation: ~4 chars per token
    const inputTokens = Math.ceil((dto.inputText?.length || 0) / 4);
    const imageTokens = (dto.imageCount || 0) * 1000; // Rough estimate for images
    const totalInputTokens = inputTokens + imageTokens;
    const estimatedOutputTokens = 500; // Average response

    const inputCost = (totalInputTokens / 1000000) * (model.input_cost || 0);
    const outputCost = (estimatedOutputTokens / 1000000) * (model.output_cost || 0);

    return {
      modelId: dto.modelId,
      estimatedInputTokens: totalInputTokens,
      estimatedOutputTokens,
      estimatedCost: Number((inputCost + outputCost).toFixed(6)),
    };
  }

  /**
   * List user's conversations
   */
  async listConversations(userId: string) {
    const conversations = await this.db.getAll<any>(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId],
    );

    return conversations;
  }

  /**
   * Create a new conversation - matches Express POST /api/chat/conversations
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    const id = uuidv4();
    const model = dto.modelId ? await this.db.getOne<any>('SELECT name FROM models WHERE id = ?', [dto.modelId]) : null;

    await this.db.run(
      `INSERT INTO conversations (id, user_id, title, model_id, model_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, userId, dto.title || 'New Chat', dto.modelId || null, model?.name || null],
    );

    const conversation = await this.db.getOne<any>('SELECT * FROM conversations WHERE id = ?', [id]);
    return conversation;
  }

  /**
   * Get conversation with messages
   */
  async getConversation(userId: string, id: string) {
    const conversation = await this.db.getOne<any>(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.db.getAll<any>(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...conversation,
      messages: messages.map((msg) => ({
        ...msg,
        conversationId: msg.conversation_id,
        inputTokens: msg.input_tokens,
        outputTokens: msg.output_tokens,
        createdAt: msg.created_at,
        imageUrls:
          typeof msg.image_urls === 'string' ? JSON.parse(msg.image_urls) : msg.image_urls || [],
      })),
    };
  }

  /**
   * Update conversation
   */
  async updateConversation(userId: string, id: string, dto: UpdateConversationDto) {
    const conversation = await this.db.getOne<any>(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (dto.title) {
      await this.db.run(
        `UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?`,
        [dto.title, id],
      );
    }

    return { success: true, title: dto.title };
  }

  /**
   * Delete conversation
   */
  async deleteConversation(userId: string, id: string) {
    const conversation = await this.db.getOne<any>(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    await this.db.run('DELETE FROM conversations WHERE id = ?', [id]);

    return { success: true };
  }

  /**
   * Send a message
   */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.db.getOne<any>(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId],
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get API key
    const openrouterKey = this.configService.get<string>('providers.openrouter.apiKey');
    if (!openrouterKey) {
      throw new BadRequestException('OpenRouter API key not configured');
    }

    // Get model
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [
      conversation.model_id || 'openai/gpt-4o-mini',
    ]);

    // Save user message
    const userMsgId = uuidv4();
    await this.db.run(
      `INSERT INTO messages (id, conversation_id, role, content, image_urls, created_at)
       VALUES (?, ?, 'user', ?, ?, NOW())`,
      [userMsgId, conversationId, dto.content, JSON.stringify(dto.imageUrls || [])],
    );

    // Get conversation history
    const history = await this.db.getAll<any>(
      `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId],
    );

    try {
      // Call OpenRouter
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model?.api_endpoint || 'openai/gpt-4o-mini',
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        },
        {
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const assistantContent = response.data.choices?.[0]?.message?.content || 'No response';
      const usage = response.data.usage || {};

      // Save assistant message
      const assistantMsgId = uuidv4();
      await this.db.run(
        `INSERT INTO messages (id, conversation_id, role, content, input_tokens, output_tokens, created_at)
         VALUES (?, ?, 'assistant', ?, ?, ?, NOW())`,
        [
          assistantMsgId,
          conversationId,
          assistantContent,
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
        ],
      );

      // Update conversation
      await this.db.run(
        `UPDATE conversations SET updated_at = NOW(),
         total_input_tokens = total_input_tokens + ?,
         total_output_tokens = total_output_tokens + ?
         WHERE id = ?`,
        [usage.prompt_tokens || 0, usage.completion_tokens || 0, conversationId],
      );

      return {
        userMessage: {
          id: userMsgId,
          role: 'user',
          content: dto.content,
        },
        assistantMessage: {
          id: assistantMsgId,
          role: 'assistant',
          content: assistantContent,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        },
      };
    } catch (error) {
      console.error('[CHAT] OpenRouter error:', error.message);
      throw new BadRequestException('Failed to get AI response');
    }
  }
}
