import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';

@Injectable()
export class SettingsService {
  constructor(private db: DatabaseService) {}

  async getGoogleClientId() {
    const setting = await this.db.getOne<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['googleClientId'],
    );
    return setting?.value || null;
  }

  async getRazorpayKeyId() {
    const setting = await this.db.getOne<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['razorpayKeyId'],
    );
    return setting?.value || null;
  }

  async getLandingFeatured() {
    const featured = await this.db.getAll<any>(
      'SELECT * FROM landing_featured WHERE isActive = 1 ORDER BY displayOrder ASC',
    );
    return featured;
  }
}
