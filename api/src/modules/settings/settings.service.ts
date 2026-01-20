import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class SettingsService {
  constructor(private db: DatabaseService) {}

  /**
   * Get a setting value by key
   */
  private async getSetting(key: string): Promise<string | null> {
    const setting = await this.db.getOne<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return setting?.value || null;
  }

  async getGoogleClientId() {
    return this.getSetting('googleClientId');
  }

  async getRazorpayKeyId() {
    return this.getSetting('razorpayKeyId');
  }

  /**
   * Get public pricing settings (no auth required, excludes sensitive data)
   */
  async getPricingSettings() {
    return {
      profitMargin: parseFloat((await this.getSetting('profitMargin')) || '0'),
      profitMarginImage: parseFloat((await this.getSetting('profitMarginImage')) || '0'),
      profitMarginVideo: parseFloat((await this.getSetting('profitMarginVideo')) || '0'),
      profitMarginChat: parseFloat((await this.getSetting('profitMarginChat')) || '0'),
      creditPrice: parseFloat((await this.getSetting('creditPrice')) || '1'),
      freeCredits: parseFloat((await this.getSetting('freeCredits')) || '10'),
    };
  }

  async getLandingFeatured() {
    const featured = await this.db.getAll<any>(
      'SELECT * FROM landing_featured WHERE isActive = 1 ORDER BY displayOrder ASC',
    );
    return featured;
  }
}
