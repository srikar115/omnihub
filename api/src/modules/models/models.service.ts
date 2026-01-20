import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { CalculatePriceDto } from './dto';

@Injectable()
export class ModelsService {
  constructor(private db: DatabaseService) {}

  /**
   * Get profit margin from settings
   */
  private async getProfitMargin(modelType: string): Promise<number> {
    try {
      // Try specific margin first
      const specificKey = `profitMargin${modelType.charAt(0).toUpperCase() + modelType.slice(1)}`;
      let setting = await this.db.getOne<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [specificKey],
      );

      if (setting && setting.value) {
        return parseFloat(setting.value) / 100;
      }

      // Fall back to general margin
      setting = await this.db.getOne<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        ['profitMargin'],
      );

      return setting ? parseFloat(setting.value) / 100 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate base price for model options
   */
  private calculateBasePrice(model: any, selectedOptions: Record<string, string> = {}): number {
    let price = model.baseCost || model.credits || 0;
    const modelOptions = typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};

    for (const [key, value] of Object.entries(selectedOptions)) {
      const optionConfig = modelOptions[key];
      if (optionConfig?.choices) {
        const choice = optionConfig.choices.find((c: any) => String(c.value) === String(value));
        if (choice?.priceMultiplier) {
          price *= choice.priceMultiplier;
        }
      }
    }

    return price;
  }

  /**
   * Calculate final price with profit margin
   */
  private async calculateFinalPrice(
    model: any,
    selectedOptions: Record<string, string> = {},
  ): Promise<number> {
    const basePrice = this.calculateBasePrice(model, selectedOptions);
    const margin = await this.getProfitMargin(model.type || 'image');
    return Number((basePrice * (1 + margin)).toFixed(6));
  }

  /**
   * Get all models
   */
  async findAll() {
    const models = await this.db.getAll<any>(
      `SELECT * FROM models WHERE enabled = 1 ORDER BY displayOrder ASC, name ASC`,
    );

    // Parse JSON fields and calculate prices
    const modelsWithPrices = await Promise.all(
      models.map(async (model) => {
        const options = typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};
        const capabilities = typeof model.capabilities === 'string' ? JSON.parse(model.capabilities) : model.capabilities || {};
        const tags = typeof model.tags === 'string' ? JSON.parse(model.tags) : model.tags || [];

        // Calculate base price with margin
        const price = await this.calculateFinalPrice(model);

        return {
          ...model,
          options,
          capabilities,
          tags,
          credits: price,
          enabled: Boolean(model.enabled),
        };
      }),
    );

    return modelsWithPrices;
  }

  /**
   * Get model by ID
   */
  async findOne(id: string) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [id]);

    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found`);
    }

    const options = typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};
    const capabilities = typeof model.capabilities === 'string' ? JSON.parse(model.capabilities) : model.capabilities || {};
    const tags = typeof model.tags === 'string' ? JSON.parse(model.tags) : model.tags || [];

    const price = await this.calculateFinalPrice(model);

    return {
      ...model,
      options,
      capabilities,
      tags,
      credits: price,
      enabled: Boolean(model.enabled),
    };
  }

  /**
   * Calculate price for model with options
   */
  async calculatePrice(id: string, dto: CalculatePriceDto) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [id]);

    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found`);
    }

    const price = await this.calculateFinalPrice(model, dto.options || {});

    return {
      modelId: id,
      modelName: model.name,
      basePrice: model.baseCost || model.credits || 0,
      finalPrice: price,
      options: dto.options || {},
    };
  }

  /**
   * Get models by type (image, video, chat)
   */
  async findByType(type: string) {
    const models = await this.db.getAll<any>(
      `SELECT * FROM models WHERE enabled = 1 AND type = ? ORDER BY displayOrder ASC, name ASC`,
      [type],
    );

    return Promise.all(
      models.map(async (model) => {
        const options = typeof model.options === 'string' ? JSON.parse(model.options) : model.options || {};
        const price = await this.calculateFinalPrice(model);

        return {
          ...model,
          options,
          credits: price,
        };
      }),
    );
  }
}
