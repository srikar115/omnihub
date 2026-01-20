import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Admin login
   */
  async login(username: string, password: string) {
    const admin = await this.db.getOne<any>(
      'SELECT * FROM admins WHERE username = ?',
      [username],
    );

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.configService.get<string>('jwt.secret');
    const token = jwt.sign({ adminId: admin.id, isAdmin: true }, secret, { expiresIn: '24h' });

    return { token, admin: { id: admin.id, username: admin.username } };
  }

  /**
   * Get dashboard stats
   */
  async getStats() {
    const [users, generations, models] = await Promise.all([
      this.db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM users'),
      this.db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM generations'),
      this.db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM models WHERE enabled = 1'),
    ]);

    return {
      totalUsers: users?.count || 0,
      totalGenerations: generations?.count || 0,
      activeModels: models?.count || 0,
    };
  }

  /**
   * Get all models for admin
   */
  async getModels() {
    return this.db.getAll<any>('SELECT * FROM models ORDER BY displayOrder ASC');
  }

  /**
   * Update model
   */
  async updateModel(id: string, data: any) {
    const updates: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await this.db.run(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return { success: true };
  }

  /**
   * Get all users
   */
  async getUsers() {
    return this.db.getAll<any>(
      'SELECT id, email, name, credits, createdAt, nickname FROM users ORDER BY createdAt DESC',
    );
  }

  /**
   * Update user credits
   */
  async updateUserCredits(userId: string, credits: number) {
    await this.db.run('UPDATE users SET credits = ? WHERE id = ?', [credits, userId]);
    return { success: true };
  }

  /**
   * Get settings
   */
  async getSettings() {
    const settings = await this.db.getAll<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
    );
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  /**
   * Update settings
   */
  async updateSettings(settings: Record<string, any>) {
    for (const [key, value] of Object.entries(settings)) {
      await this.db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?`,
        [key, String(value), String(value)],
      );
    }
    return { success: true };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(limit = 100) {
    return this.db.getAll<any>(
      'SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT ?',
      [limit],
    );
  }

  /**
   * Get error logs
   */
  async getErrorLogs(limit = 100) {
    return this.db.getAll<any>(
      'SELECT * FROM error_logs ORDER BY createdAt DESC LIMIT ?',
      [limit],
    );
  }
}
