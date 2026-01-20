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
   * List user's workspaces
   */
  async findAll(userId: string) {
    const workspaces = await this.db.getAll<any>(
      `SELECT w.*, wm.role as userRole
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspaceId
       WHERE wm.userId = ?
       ORDER BY w.isDefault DESC, w.name ASC`,
      [userId],
    );

    return workspaces.map((ws) => ({
      ...ws,
      privacySettings:
        typeof ws.privacySettings === 'string'
          ? JSON.parse(ws.privacySettings)
          : ws.privacySettings,
    }));
  }

  /**
   * Create a new workspace
   */
  async create(userId: string, dto: CreateWorkspaceDto) {
    const id = uuidv4();

    await this.db.run(
      `INSERT INTO workspaces (id, name, ownerId, credits, creditMode, isDefault, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, 'shared', 0, datetime('now'), datetime('now'))`,
      [id, dto.name, userId],
    );

    // Add creator as owner
    await this.db.run(
      `INSERT INTO workspace_members (id, workspaceId, userId, role, allocatedCredits, joinedAt)
       VALUES (?, ?, ?, 'owner', 0, datetime('now'))`,
      [uuidv4(), id, userId],
    );

    return { id, name: dto.name, ownerId: userId };
  }

  /**
   * Get workspace by ID
   */
  async findOne(userId: string, id: string) {
    // Check if user is a member
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [id, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const workspace = await this.db.getOne<any>('SELECT * FROM workspaces WHERE id = ?', [id]);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      ...workspace,
      privacySettings:
        typeof workspace.privacySettings === 'string'
          ? JSON.parse(workspace.privacySettings)
          : workspace.privacySettings,
      userRole: member.role,
    };
  }

  /**
   * Update workspace
   */
  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
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
      updates.push('creditMode = ?');
      params.push(dto.creditMode);
    }
    if (dto.privacySettings) {
      updates.push('privacySettings = ?');
      params.push(JSON.stringify(dto.privacySettings));
    }

    if (updates.length > 0) {
      updates.push("updatedAt = datetime('now')");
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
      'SELECT * FROM workspaces WHERE id = ? AND ownerId = ?',
      [id, userId],
    );

    if (!workspace) {
      throw new ForbiddenException('Only owner can delete workspace');
    }

    if (workspace.isDefault) {
      throw new BadRequestException('Cannot delete default workspace');
    }

    await this.db.run('DELETE FROM workspace_members WHERE workspaceId = ?', [id]);
    await this.db.run('DELETE FROM workspace_invites WHERE workspaceId = ?', [id]);
    await this.db.run('DELETE FROM workspaces WHERE id = ?', [id]);

    return { success: true };
  }

  /**
   * List workspace members
   */
  async listMembers(userId: string, workspaceId: string) {
    // Verify user is a member
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const members = await this.db.getAll<any>(
      `SELECT wm.*, u.name, u.email, u.avatarUrl
       FROM workspace_members wm
       JOIN users u ON wm.userId = u.id
       WHERE wm.workspaceId = ?`,
      [workspaceId],
    );

    return members;
  }

  /**
   * Invite a member
   */
  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto) {
    const member = await this.db.getOne<any>(
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId],
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Not authorized to invite members');
    }

    const token = uuidv4();
    const inviteId = uuidv4();

    await this.db.run(
      `INSERT INTO workspace_invites (id, workspaceId, invitedEmail, invitedBy, token, status, createdAt)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
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
      `SELECT wi.*, w.name as workspaceName
       FROM workspace_invites wi
       JOIN workspaces w ON wi.workspaceId = w.id
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
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [invite.workspaceId, userId],
    );

    if (existing) {
      throw new BadRequestException('Already a member of this workspace');
    }

    // Add as member
    await this.db.run(
      `INSERT INTO workspace_members (id, workspaceId, userId, role, allocatedCredits, joinedAt)
       VALUES (?, ?, ?, 'member', 0, datetime('now'))`,
      [uuidv4(), invite.workspaceId, userId],
    );

    // Update invite status
    await this.db.run(`UPDATE workspace_invites SET status = 'accepted' WHERE id = ?`, [invite.id]);

    return { success: true, workspaceId: invite.workspaceId };
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
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId],
    );

    if (!myRole || myRole.role !== 'owner') {
      throw new ForbiddenException('Only owner can change member roles');
    }

    await this.db.run(
      'UPDATE workspace_members SET role = ? WHERE workspaceId = ? AND userId = ?',
      [dto.role, workspaceId, memberId],
    );

    return { success: true };
  }

  /**
   * Remove member
   */
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    const myRole = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId],
    );

    if (!myRole || (myRole.role !== 'owner' && myRole.role !== 'admin')) {
      throw new ForbiddenException('Not authorized to remove members');
    }

    const targetMember = await this.db.getOne<any>(
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, memberId],
    );

    if (targetMember?.role === 'owner') {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    await this.db.run('DELETE FROM workspace_members WHERE workspaceId = ? AND userId = ?', [
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
      'SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?',
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
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
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
      `SELECT userId, SUM(credits) as totalUsed
       FROM generations
       WHERE workspaceId = ?
       GROUP BY userId`,
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
      'SELECT * FROM workspace_members WHERE workspaceId = ? AND userId = ?',
      [workspaceId, userId],
    );

    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    let query = `
      SELECT g.*, u.name as userName
      FROM generations g
      JOIN users u ON g.userId = u.id
      WHERE g.workspaceId = ? AND g.sharedWithWorkspace = 1 AND g.status = 'completed'
    `;
    const params: any[] = [workspaceId];

    if (type) {
      query += ' AND g.type = ?';
      params.push(type);
    }

    query += ' ORDER BY g.completedAt DESC LIMIT 100';

    return this.db.getAll<any>(query, params);
  }
}
