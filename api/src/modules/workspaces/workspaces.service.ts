import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberDto,
  AddCreditsDto,
  AllocateCreditsDto,
} from './dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * List user's workspaces with improved credit display
   */
  async findAll(userId: string) {
    // Get user's personal credits for default workspace display
    const user = await this.db.getOne<{ credits: number }>(
      'SELECT credits FROM users WHERE id = ?',
      [userId],
    );
    const userCredits = user?.credits || 0;

    const workspaces = await this.db.getAll<any>(
      `SELECT w.*, wm.role as user_role, wm.allocated_credits,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = ?
       ORDER BY w.is_default DESC, w.updated_at DESC`,
      [userId],
    );

    return workspaces.map((ws) => {
      const privacySettings =
        typeof ws.privacy_settings === 'string'
          ? JSON.parse(ws.privacy_settings)
          : ws.privacy_settings || {};

      // For default/personal workspaces, show user's personal credits
      // For team workspaces, show workspace shared credits
      const displayCredits = ws.is_default ? userCredits : (ws.credits || 0);

      return {
        ...ws,
        isDefault: ws.is_default,
        userRole: ws.user_role,
        allocatedCredits: ws.allocated_credits,
        memberCount: ws.member_count,
        privacySettings,
        displayCredits,
      };
    });
  }

  /**
   * Create a new workspace - matches Express POST /api/workspaces
   */
  async create(userId: string, dto: CreateWorkspaceDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Workspace name is required');
    }

    const id = uuidv4();

    await this.db.run(
      `INSERT INTO workspaces (id, name, owner_id, credits, credit_mode, is_default, created_at, updated_at)
       VALUES (?, ?, ?, 0, 'shared', false, NOW(), NOW())`,
      [id, dto.name.trim(), userId],
    );

    // Add creator as owner
    await this.db.run(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, allocated_credits, joined_at)
       VALUES (?, ?, ?, 'owner', 0, NOW())`,
      [uuidv4(), id, userId],
    );

    // Return full workspace object (matches Express getWorkspace)
    const workspace = await this.db.getOne<any>('SELECT * FROM workspaces WHERE id = ?', [id]);
    return {
      ...workspace,
      privacySettings:
        typeof workspace.privacy_settings === 'string'
          ? JSON.parse(workspace.privacy_settings || '{}')
          : workspace.privacy_settings || {},
    };
  }

  /**
   * Get workspace by ID - matches Express GET /api/workspaces/:id
   */
  async findOne(userId: string, id: string) {
    const workspace = await this.db.getOne<any>('SELECT * FROM workspaces WHERE id = ?', [id]);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is a member or owner
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [id, userId],
    );

    if (!member && workspace.owner_id !== userId) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    // Get member count
    const memberCount = await this.db.getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ?',
      [id],
    );

    return {
      ...workspace,
      privacySettings:
        typeof workspace.privacy_settings === 'string'
          ? JSON.parse(workspace.privacy_settings)
          : workspace.privacy_settings || {},
      userRole: member?.role || 'owner',
      memberCount: memberCount?.count || 0,
    };
  }

  /**
   * Update workspace
   */
  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [id, userId],
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Only owners and admins can update workspace');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.name) {
      updates.push('name = ?');
      params.push(dto.name);
    }
    if (dto.creditMode) {
      updates.push('credit_mode = ?');
      params.push(dto.creditMode);
    }
    if (dto.privacySettings) {
      updates.push('privacy_settings = ?');
      params.push(JSON.stringify(dto.privacySettings));
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(id);

      await this.db.run(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return { success: true };
  }

  /**
   * Delete workspace
   */
  async remove(userId: string, id: string) {
    const workspace = await this.db.getOne<any>(
      'SELECT * FROM workspaces WHERE id = ? AND owner_id = ?',
      [id, userId],
    );

    if (!workspace) {
      throw new ForbiddenException('Only owner can delete workspace');
    }

    if (workspace.is_default) {
      throw new BadRequestException('Cannot delete default workspace');
    }

    await this.db.run('DELETE FROM workspace_members WHERE workspace_id = ?', [id]);
    await this.db.run('DELETE FROM workspace_invites WHERE workspace_id = ?', [id]);
    await this.db.run('DELETE FROM workspaces WHERE id = ?', [id]);

    return { success: true };
  }

  /**
   * List workspace members
   */
  async listMembers(userId: string, workspaceId: string) {
    // Verify user is a member
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const members = await this.db.getAll<any>(
      `SELECT wm.*, u.name, u.email, u.avatar_url
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = ?`,
      [workspaceId],
    );

    return members;
  }

  /**
   * Invite a member
   */
  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Not authorized to invite members');
    }

    const token = uuidv4();
    const inviteId = uuidv4();

    await this.db.run(
      `INSERT INTO workspace_invites (id, workspace_id, invited_email, invited_by, token, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [inviteId, workspaceId, dto.email, userId, token],
    );

    const frontendUrl = this.configService.get<string>('frontendUrl');

    return {
      success: true,
      inviteLink: `${frontendUrl}/join/${token}`,
      token,
    };
  }

  /**
   * Get invite by token
   */
  async getInvite(token: string) {
    const invite = await this.db.getOne<any>(
      `SELECT wi.*, w.name as workspace_name
       FROM workspace_invites wi
       JOIN workspaces w ON wi.workspace_id = w.id
       WHERE wi.token = ? AND wi.status = 'pending'`,
      [token],
    );

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    return invite;
  }

  /**
   * Join workspace with token
   */
  async joinWorkspace(userId: string, token: string) {
    const invite = await this.db.getOne<any>(
      `SELECT * FROM workspace_invites WHERE token = ? AND status = 'pending'`,
      [token],
    );

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    // Check if already a member
    const existing = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [invite.workspace_id, userId],
    );

    if (existing) {
      throw new BadRequestException('Already a member of this workspace');
    }

    // Add as member
    await this.db.run(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, allocated_credits, joined_at)
       VALUES (?, ?, ?, 'member', 0, NOW())`,
      [uuidv4(), invite.workspace_id, userId],
    );

    // Update invite status
    await this.db.run(`UPDATE workspace_invites SET status = 'accepted' WHERE id = ?`, [invite.id]);

    return { success: true, workspaceId: invite.workspace_id };
  }

  /**
   * Update member role
   */
  async updateMember(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    const myRole = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!myRole || myRole.role !== 'owner') {
      throw new ForbiddenException('Only owner can change member roles');
    }

    await this.db.run(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
      [dto.role, workspaceId, memberId],
    );

    return { success: true };
  }

  /**
   * Remove member
   */
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    const myRole = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!myRole || (myRole.role !== 'owner' && myRole.role !== 'admin')) {
      throw new ForbiddenException('Not authorized to remove members');
    }

    const targetMember = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, memberId],
    );

    if (targetMember?.role === 'owner') {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    await this.db.run('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [
      workspaceId,
      memberId,
    ]);

    return { success: true };
  }

  /**
   * Add credits to workspace
   */
  async addCredits(userId: string, workspaceId: string, dto: AddCreditsDto) {
    const member = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Only owner can add credits');
    }

    // Deduct from user, add to workspace
    const user = await this.db.getOne<{ credits: number }>('SELECT credits FROM users WHERE id = ?', [userId]);

    if (!user || user.credits < dto.amount) {
      throw new BadRequestException('Insufficient personal credits');
    }

    await this.db.run('UPDATE users SET credits = credits - ? WHERE id = ?', [dto.amount, userId]);
    await this.db.run('UPDATE workspaces SET credits = credits + ? WHERE id = ?', [
      dto.amount,
      workspaceId,
    ]);

    return { success: true, added: dto.amount };
  }

  /**
   * Get credits usage
   */
  async getCreditsUsage(userId: string, workspaceId: string) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const workspace = await this.db.getOne<{ credits: number }>(
      'SELECT credits FROM workspaces WHERE id = ?',
      [workspaceId],
    );

    // Get usage stats
    const usage = await this.db.getAll<any>(
      `SELECT user_id, SUM(credits) as total_used
       FROM generations
       WHERE workspace_id = ?
       GROUP BY user_id`,
      [workspaceId],
    );

    return {
      workspaceCredits: workspace?.credits || 0,
      usageByMember: usage,
    };
  }

  /**
   * Get workspace gallery
   */
  async getGallery(userId: string, workspaceId: string, type?: string) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    let query = `
      SELECT g.*, u.name as user_name
      FROM generations g
      JOIN users u ON g.user_id = u.id
      WHERE g.workspace_id = ? AND g.shared_with_workspace = true AND g.status = 'completed'
    `;
    const params: any[] = [workspaceId];

    if (type) {
      query += ' AND g.type = ?';
      params.push(type);
    }

    query += ' ORDER BY g.completed_at DESC LIMIT 100';

    return this.db.getAll<any>(query, params);
  }
}
