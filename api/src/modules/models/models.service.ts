import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { CalculatePriceDto } from './dto';

@Injectable()
export class ModelsService {
  constructor(private db: DatabaseService) {}

  /**
   * Get profit margin from settings (returns percentage value like Express backend)
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
        return parseFloat(setting.value);
      }

      // Fall back to general margin
      setting = await this.db.getOne<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        ['profitMargin'],
      );

      return setting ? parseFloat(setting.value) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get credit price from settings
   */
  private async getCreditPrice(): Promise<number> {
    try {
      const setting = await this.db.getOne<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        ['creditPrice'],
      );
      return setting ? parseFloat(setting.value) : 1;
    } catch {
      return 1;
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
   * Calculate final price with profit margin (like Express calculatePrice)
   */
  private async calculateFinalPrice(
    model: any,
    selectedOptions: Record<string, string> = {},
  ): Promise<number> {
    const basePrice = this.calculateBasePrice(model, selectedOptions);
    const margin = await this.getProfitMargin(model.type || 'image');
    const creditPrice = await this.getCreditPrice();
    
    // Apply margin and convert to credits (same as Express backend)
    const priceWithMargin = basePrice * (1 + margin / 100);
    const creditsPerDollar = 1 / creditPrice;
    return Number((priceWithMargin * creditsPerDollar).toFixed(6));
  }

  /**
   * Get all models - matches Express GET /api/models response
   */
  async findAll() {
    const models = await this.db.getAll<any>(
      `SELECT id, name, provider, type, credits, baseCost, options, imageInput, maxInputImages, 
              thumbnail, logoUrl, heading, subheading, tags, displayOrder, category, 
              providerName, docUrl, imageParamName, imageParamType, capabilities
       FROM models WHERE enabled = 1 ORDER BY type, displayOrder, credits`,
    );

    // Parse JSON fields (same as Express backend)
    return models.map((model) => ({
      ...model,
      options: typeof model.options === 'string' ? JSON.parse(model.options || '{}') : model.options || {},
      tags: typeof model.tags === 'string' ? JSON.parse(model.tags || '[]') : model.tags || [],
      capabilities: typeof model.capabilities === 'string' ? JSON.parse(model.capabilities || '{}') : model.capabilities || {},
    }));
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
   * Returns same response structure as Express backend
   */
  async calculatePrice(id: string, dto: CalculatePriceDto) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [id]);

    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found`);
    }

    const basePrice = this.calculateBasePrice(model, dto.options || {});
    const userCredits = await this.calculateFinalPrice(model, dto.options || {});
    const margin = await this.getProfitMargin(model.type || 'image');
    const creditPrice = await this.getCreditPrice();

    return {
      price: userCredits,           // User-facing credits (with margin + conversion)
      basePrice: basePrice,         // Base API cost in credits
      baseCost: model.baseCost,     // Raw USD cost from API
      profitMargin: margin,
      creditPrice: creditPrice,
      // Calculation breakdown
      breakdown: {
        apiCost: basePrice,
        marginPercent: margin,
        priceWithMargin: basePrice * (1 + margin / 100),
        creditsPerDollar: 1 / creditPrice,
        finalCredits: userCredits,
      },
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
