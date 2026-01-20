import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class UpscaleService {
  constructor(private db: DatabaseService) {}

  async getModels(type?: string) {
    const query = type
      ? `SELECT * FROM models WHERE category = 'upscale' AND enabled = 1 AND type = ?`
      : `SELECT * FROM models WHERE category = 'upscale' AND enabled = 1`;
    return this.db.getAll<any>(query, type ? [type] : []);
  }

  async calculateCost(data: { modelId: string; sourceType: string; scaleFactor: number }) {
    const model = await this.db.getOne<any>('SELECT * FROM models WHERE id = ?', [data.modelId]);
    if (!model) throw new BadRequestException('Model not found');

    const baseCost = model.baseCost || 0.01;
    const cost = baseCost * Math.pow(data.scaleFactor, 2);

    return {
      modelId: data.modelId,
      estimatedCost: Number(cost.toFixed(6)),
      scaleFactor: data.scaleFactor,
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
