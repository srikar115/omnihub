import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateGenerationDto,
  ListGenerationsDto,
  BulkDeleteDto,
  ShareGenerationDto,
} from './dto';

@Injectable()
export class GenerationsService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Get setting from database
   */
  private async getSetting(key: string): Promise<string | null> {
    const setting = await this.db.getOne<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return setting?.value || null;
  }

  /**
   * Get model by ID
   */
  private async getModel(modelId: string) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [modelId]);
    if (!model) {
      throw new NotFoundException(`Model "${modelId}" not found`);
    }
    return model;
  }

  /**
   * Calculate price for generation
   */
  private async calculatePrice(model: any, options: Record<string, any> = {}): Promise<number> {
    let price = model.baseCost || model.credits || 0;
    const modelOptions =
      typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};

    for (const [key, value] of Object.entries(options)) {
      const optionConfig = modelOptions[key];
      if (optionConfig?.choices) {
        const choice = optionConfig.choices.find((c: any) => String(c.value) === String(value));
        if (choice?.priceMultiplier) {
          price *= choice.priceMultiplier;
        }
      }
    }

    // Add profit margin
    const marginKey = `profitMargin${(model.type || 'image').charAt(0).toUpperCase() + (model.type || 'image').slice(1)}`;
    const marginSetting = await this.getSetting(marginKey);
    const margin = marginSetting ? parseFloat(marginSetting) / 100 : 0;

    return Number((price * (1 + margin)).toFixed(6));
  }

  /**
   * Check user credits
   */
  private async checkCredits(userId: string, required: number, workspaceId?: string): Promise<void> {
    // For now, just check user credits
    const user = await this.db.getOne<{ credits: number }>(
      'SELECT credits FROM users WHERE id = ?',
      [userId],
    );

    if (!user || user.credits < required) {
      throw new BadRequestException('Insufficient credits');
    }
  }

  /**
   * Deduct credits from user
   */
  private async deductCredits(userId: string, amount: number, workspaceId?: string): Promise<void> {
    await this.db.run('UPDATE users SET credits = credits - ? WHERE id = ?', [amount, userId]);
  }

  /**
   * Create a new generation
   */
  async create(userId: string, dto: CreateGenerationDto) {
    const { type, model: modelId, prompt, options = {}, inputImages = [], workspaceId } = dto;

    // Get model
    const model = await this.getModel(modelId);

    if (!model.enabled) {
      throw new BadRequestException('Model is currently disabled');
    }

    // Calculate price
    const credits = await this.calculatePrice(model, options);

    // Check credits
    await this.checkCredits(userId, credits, workspaceId);

    // Create generation record
    const genId = uuidv4();
    const visibleId = `gen-${Date.now().toString(36)}`;

    await this.db.run(
      `INSERT INTO generations (
        id, visibleId, userId, workspaceId, type, model, modelName,
        prompt, options, credits, status, startedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [
        genId,
        visibleId,
        userId,
        workspaceId || null,
        type,
        modelId,
        model.name,
        prompt,
        JSON.stringify(options),
        credits,
      ],
    );

    // Deduct credits
    await this.deductCredits(userId, credits, workspaceId);

    // TODO: Trigger actual generation via provider
    // For now, just return the pending generation
    // In real implementation, this would call the provider service

    return {
      id: genId,
      visibleId,
      type,
      model: modelId,
      modelName: model.name,
      prompt,
      options,
      credits,
      status: 'pending',
      message: 'Generation started. Provider integration pending.',
    };
  }

  /**
   * List user's generations
   */
  async findAll(userId: string, dto: ListGenerationsDto) {
    const { type, workspaceId, limit = 50, offset = 0 } = dto;

    let query = `
      SELECT * FROM generations
      WHERE userId = ?
    `;
    const params: any[] = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (workspaceId) {
      query += ' AND workspaceId = ?';
      params.push(workspaceId);
    }

    query += ' ORDER BY startedAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const generations = await this.db.getAll<any>(query, params);

    // Parse JSON fields
    return generations.map((gen) => ({
      ...gen,
      options: typeof gen.options === 'string' ? JSON.parse(gen.options) : gen.options,
    }));
  }

  /**
   * Get generation by ID
   */
  async findOne(userId: string, id: string) {
    const generation = await this.db.getOne<any>(
      'SELECT * FROM generations WHERE id = ? AND userId = ?',
      [id, userId],
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    return {
      ...generation,
      options: typeof generation.options === 'string' ? JSON.parse(generation.options) : generation.options,
    };
  }

  /**
   * Delete a generation
   */
  async remove(userId: string, id: string) {
    const generation = await this.db.getOne<any>(
      'SELECT * FROM generations WHERE id = ? AND userId = ?',
      [id, userId],
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    await this.db.run('DELETE FROM generations WHERE id = ?', [id]);

    return { success: true, message: 'Generation deleted' };
  }

  /**
   * Cancel a generation
   */
  async cancel(userId: string, id: string) {
    const generation = await this.db.getOne<any>(
      'SELECT * FROM generations WHERE id = ? AND userId = ?',
      [id, userId],
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    if (generation.status !== 'pending' && generation.status !== 'processing') {
      throw new BadRequestException('Can only cancel pending or processing generations');
    }

    // Update status
    await this.db.run(
      `UPDATE generations SET status = 'cancelled', completedAt = datetime('now') WHERE id = ?`,
      [id],
    );

    // Refund credits
    await this.db.run('UPDATE users SET credits = credits + ? WHERE id = ?', [
      generation.credits,
      userId,
    ]);

    return { success: true, message: 'Generation cancelled, credits refunded' };
  }

  /**
   * Bulk delete generations
   */
  async bulkDelete(userId: string, dto: BulkDeleteDto) {
    const { ids } = dto;

    // Verify all generations belong to user
    const placeholders = ids.map(() => '?').join(', ');
    const generations = await this.db.getAll<any>(
      `SELECT id FROM generations WHERE id IN (${placeholders}) AND userId = ?`,
      [...ids, userId],
    );

    if (generations.length !== ids.length) {
      throw new ForbiddenException('Some generations do not exist or do not belong to you');
    }

    // Delete
    await this.db.run(`DELETE FROM generations WHERE id IN (${placeholders})`, ids);

    return { success: true, deleted: ids.length };
  }

  /**
   * Share generation with workspace
   */
  async share(userId: string, id: string, dto: ShareGenerationDto) {
    const generation = await this.db.getOne<any>(
      'SELECT * FROM generations WHERE id = ? AND userId = ?',
      [id, userId],
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    await this.db.run('UPDATE generations SET sharedWithWorkspace = ? WHERE id = ?', [
      dto.sharedWithWorkspace ? 1 : 0,
      id,
    ]);

    return {
      success: true,
      sharedWithWorkspace: dto.sharedWithWorkspace,
    };
  }
}
