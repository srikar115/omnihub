import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class UpscaleService {
  constructor(private db: DatabaseService) {}

  /**
   * Get upscale models - matches Express GET /api/upscale/models
   */
  async getModels(type?: string) {
    const models = await this.db.getAll<any>(
      `SELECT id, name, provider, type, credits, options, providerName, docUrl, tags
       FROM models WHERE enabled = 1 AND category = 'upscale'
       ORDER BY displayOrder`,
    );

    // Parse JSON fields
    const parsedModels = models.map((m) => ({
      ...m,
      options: typeof m.options === 'string' ? JSON.parse(m.options || '{}') : m.options || {},
      tags: typeof m.tags === 'string' ? JSON.parse(m.tags || '[]') : m.tags || [],
    }));

    // Filter by type if specified
    if (type === 'image') {
      return parsedModels.filter((m) => m.type === 'image');
    } else if (type === 'video') {
      return parsedModels.filter((m) => m.type === 'video');
    }

    return parsedModels;
  }

  /**
   * Calculate upscale cost - matches Express POST /api/upscale/calculate
   */
  async calculateCost(
    userId: string,
    data: { generationId: string; modelId: string; options?: Record<string, any> },
  ) {
    // Get source generation to determine type
    const sourceGen = await this.db.getOne<any>(
      'SELECT * FROM generations WHERE id = ? AND userId = ?',
      [data.generationId, userId],
    );

    if (!sourceGen) {
      throw new NotFoundException('Source generation not found');
    }

    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [data.modelId]);
    if (!model) {
      throw new BadRequestException('Invalid model');
    }

    // Calculate price with options (matches Express calculatePrice)
    let price = model.credits || model.baseCost || 0;
    const modelOptions = typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};

    if (data.options) {
      for (const [key, value] of Object.entries(data.options)) {
        const optionConfig = modelOptions[key];
        if (optionConfig?.choices) {
          const choice = optionConfig.choices.find((c: any) => String(c.value) === String(value));
          if (choice?.priceMultiplier) {
            price *= choice.priceMultiplier;
          }
        }
      }
    }

    return {
      price,
      basePrice: model.credits,
      model: model.name,
      sourceType: sourceGen.type,
    };
  }

  async upscale(userId: string, data: any) {
    // Stub implementation - integrate with actual provider
    return {
      success: true,
      message: 'Upscale job queued. Provider integration pending.',
      jobId: `upscale-${Date.now()}`,
    };
  }
}
