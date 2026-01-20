import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommunityService {
  constructor(private db: DatabaseService) {}

  async findAll(params: { limit?: number; sort?: string; category?: string }) {
    const { limit = 20, sort = 'recent', category } = params;
    let query = `
      SELECT cp.*, u.nickname, u.avatar_url
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
    `;
    const queryParams: any[] = [];

    if (category && category !== 'all') {
      query += ' WHERE cp.category = ?';
      queryParams.push(category);
    }

    query += sort === 'popular' ? ' ORDER BY cp.like_count DESC' : ' ORDER BY cp.published_at DESC';
    query += ' LIMIT ?';
    queryParams.push(limit);

    return this.db.getAll<any>(query, queryParams);
  }

  async getCategories() {
    return [
      { id: 'all', name: 'All', icon: 'Grid' },
      { id: 'art', name: 'Art', icon: 'Palette' },
      { id: 'photography', name: 'Photography', icon: 'Camera' },
      { id: 'anime', name: 'Anime', icon: 'Sparkles' },
      { id: 'landscape', name: 'Landscape', icon: 'Mountain' },
      { id: 'portrait', name: 'Portrait', icon: 'User' },
      { id: 'other', name: 'Other', icon: 'MoreHorizontal' },
    ];
  }

  async publish(userId: string, data: any) {
    const id = uuidv4();
    const user = await this.db.getOne<{ nickname: string }>('SELECT nickname FROM users WHERE id = ?', [userId]);

    await this.db.run(
      `INSERT INTO community_posts (id, generation_id, user_id, nickname, title, category, image_url, prompt, model_name, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, data.generationId, userId, user?.nickname || 'Anonymous', data.title, data.category || 'other', data.imageUrl, data.prompt, data.modelName],
    );

    return { id, success: true };
  }

  async findOne(id: string) {
    const post = await this.db.getOne<any>(
      `SELECT cp.*, u.nickname, u.avatar_url FROM community_posts cp JOIN users u ON cp.user_id = u.id WHERE cp.id = ?`,
      [id],
    );
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async toggleLike(userId: string, postId: string) {
    const existing = await this.db.getOne<any>(
      'SELECT * FROM community_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId],
    );

    if (existing) {
      await this.db.run('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await this.db.run('UPDATE community_posts SET like_count = like_count - 1 WHERE id = ?', [postId]);
      return { liked: false };
    } else {
      await this.db.run(
        'INSERT INTO community_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, NOW())',
        [uuidv4(), postId, userId],
      );
      await this.db.run('UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
      return { liked: true };
    }
  }

  async getUserPosts(userId: string) {
    return this.db.getAll<any>('SELECT * FROM community_posts WHERE user_id = ? ORDER BY published_at DESC', [userId]);
  }

  async remove(userId: string, id: string) {
    await this.db.run('DELETE FROM community_posts WHERE id = ? AND user_id = ?', [id, userId]);
    return { success: true };
  }
}
