import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(private db: DatabaseService) {}

  async findAll(userId: string) {
    return this.db.getAll<any>('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async create(userId: string, data: { name: string; description?: string; color?: string }) {
    const id = uuidv4();
    await this.db.run(
      'INSERT INTO projects (id, user_id, name, description, color, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, userId, data.name, data.description || '', data.color || '#8b5cf6'],
    );
    return { id, ...data };
  }

  async update(userId: string, id: string, data: any) {
    const project = await this.db.getOne<any>('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!project) throw new NotFoundException('Project not found');

    const updates: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (updates.length > 0) {
      params.push(id);
      await this.db.run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    return { success: true };
  }

  async remove(userId: string, id: string) {
    await this.db.run('DELETE FROM project_assets WHERE project_id = ?', [id]);
    await this.db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
    return { success: true };
  }

  async getAssets(userId: string, projectId: string) {
    return this.db.getAll<any>('SELECT * FROM project_assets WHERE project_id = ? ORDER BY added_at DESC', [projectId]);
  }

  async addAsset(userId: string, projectId: string, data: any) {
    const id = uuidv4();
    await this.db.run(
      'INSERT INTO project_assets (id, project_id, asset_url, asset_type, name, tag, added_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, projectId, data.assetUrl, data.assetType || 'image', data.name || '', data.tag || ''],
    );
    return { id, success: true };
  }
}
