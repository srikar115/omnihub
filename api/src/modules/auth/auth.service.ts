import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@database/database.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { RegisterDto, LoginDto, GoogleAuthDto, RefreshTokenDto } from './dto';

// Nickname generator
const NICKNAME_ADJECTIVES = [
  'Cosmic', 'Stellar', 'Neon', 'Cyber', 'Pixel', 'Quantum', 'Digital',
  'Electric', 'Atomic', 'Mystic', 'Shadow', 'Crystal', 'Golden', 'Silver',
];

const NICKNAME_NOUNS = [
  'Phoenix', 'Dragon', 'Wolf', 'Falcon', 'Tiger', 'Raven', 'Serpent',
  'Lion', 'Eagle', 'Panther', 'Hawk', 'Fox', 'Bear', 'Owl',
];

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random nickname
   */
  private generateNickname(): string {
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
    const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
  }

  /**
   * Get free credits for new users
   */
  private async getFreeCredits(): Promise<number> {
    try {
      const setting = await this.db.getOne<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        ['freeCredits'],
      );
      return setting ? parseFloat(setting.value) : 10;
    } catch {
      return 10;
    }
  }

  /**
   * Generate short-lived access token (JWT)
   */
  private generateAccessToken(payload: { userId: string; email: string }): string {
    const secret = this.configService.get<string>('jwt.secret') || 'default-secret';
    const expiresIn = this.configService.get<string>('jwt.accessTokenExpiry') || '15m';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate and store refresh token in database
   */
  private async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const token = uuidv4();
    const refreshTokenExpiryMs = this.configService.get<number>('jwt.refreshTokenExpiryMs') || 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshTokenExpiryMs);

    await this.db.run(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, token, expiresAt.toISOString(), userAgent || null, ipAddress || null],
    );

    return token;
  }

  /**
   * Get token expiry info for response
   */
  private getTokenExpiryInfo() {
    return {
      accessTokenExpiresIn: this.configService.get<number>('jwt.accessTokenExpirySeconds') || 900,
      refreshTokenExpiresIn: Math.floor((this.configService.get<number>('jwt.refreshTokenExpiryMs') || 7 * 24 * 60 * 60 * 1000) / 1000),
    };
  }

  /**
   * Generate both access and refresh tokens
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const accessToken = this.generateAccessToken({ userId, email });
    const refreshToken = await this.generateRefreshToken(userId, userAgent, ipAddress);
    const { accessTokenExpiresIn, refreshTokenExpiresIn } = this.getTokenExpiryInfo();

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
      refreshExpiresIn: refreshTokenExpiresIn,
    };
  }

  /**
   * Ensure user has a default workspace and return it
   */
  private async ensureDefaultWorkspace(userId: string, userName: string): Promise<any> {
    try {
      let existing = await this.db.getOne<any>(
        'SELECT * FROM workspaces WHERE owner_id = ? AND is_default = true',
        [userId],
      );

      if (!existing) {
        const workspaceId = uuidv4();
        await this.db.run(
          `INSERT INTO workspaces (id, name, owner_id, credits, credit_mode, is_default)
           VALUES (?, ?, ?, 0, 'user', true)`,
          [workspaceId, `${userName}'s Workspace`, userId],
        );

        await this.db.run(
          `INSERT INTO workspace_members (id, workspace_id, user_id, role, allocated_credits)
           VALUES (?, ?, ?, 'owner', 0)`,
          [uuidv4(), workspaceId, userId],
        );

        existing = await this.db.getOne<any>('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
      }

      if (existing?.privacy_settings) {
        existing.privacySettings = typeof existing.privacy_settings === 'string'
          ? JSON.parse(existing.privacy_settings)
          : existing.privacy_settings;
      }

      return existing;
    } catch (error) {
      console.error('[AUTH] Error creating default workspace:', error.message);
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const { email, password, name } = dto;

    // Check if email already exists
    const existing = await this.db.getOne<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email],
    );

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const freeCredits = await this.getFreeCredits();
    const nickname = this.generateNickname();

    // Insert user
    await this.db.run(
      `INSERT INTO users (id, email, password, name, credits, nickname, auth_provider)
       VALUES (?, ?, ?, ?, ?, ?, 'email')`,
      [userId, email, hashedPassword, name, freeCredits, nickname],
    );

    // Create default workspace
    const defaultWorkspace = await this.ensureDefaultWorkspace(userId, name);

    // Generate token pair (access + refresh)
    const tokens = await this.generateTokenPair(userId, email, userAgent, ipAddress);

    return {
      ...tokens,
      user: {
        id: userId,
        email,
        name,
        credits: freeCredits,
      },
      defaultWorkspace,
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const { email, password } = dto;

    // Find user
    const user = await this.db.getOne<{
      id: string;
      email: string;
      password: string;
      name: string;
      credits: number;
      nickname: string;
      avatar_url: string;
    }>('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure default workspace exists
    const defaultWorkspace = await this.ensureDefaultWorkspace(user.id, user.name);

    // Generate token pair (access + refresh)
    const tokens = await this.generateTokenPair(user.id, user.email, userAgent, ipAddress);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
      },
      defaultWorkspace,
    };
  }

  /**
   * Authenticate with Google OAuth
   */
  async googleAuth(dto: GoogleAuthDto, userAgent?: string, ipAddress?: string) {
    const { credential } = dto;

    const googleClientId = this.configService.get<string>('google.clientId');

    if (!googleClientId) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    try {
      // Verify the Google token
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }
      const { sub: googleId, email, name: rawName, picture } = payload;
      const name = rawName || email?.split('@')[0] || 'User';

      // Check if user exists with this google_id
      let user = await this.db.getOne<any>(
        'SELECT * FROM users WHERE google_id = ?',
        [googleId],
      );

      if (!user) {
        // Check if email exists
        user = await this.db.getOne<any>('SELECT * FROM users WHERE email = ?', [email]);

        if (user) {
          // Link Google account to existing user
          await this.db.run(
            'UPDATE users SET google_id = ?, auth_provider = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
            [googleId, 'google', picture, user.id],
          );
          user.google_id = googleId;
          user.auth_provider = 'google';
        } else {
          // Create new user with Google account
          const userId = uuidv4();
          const freeCredits = await this.getFreeCredits();
          const nickname = this.generateNickname();

          await this.db.run(
            `INSERT INTO users (id, email, name, google_id, auth_provider, avatar_url, credits, nickname)
             VALUES (?, ?, ?, ?, 'google', ?, ?, ?)`,
            [userId, email, name, googleId, picture, freeCredits, nickname],
          );

          user = {
            id: userId,
            email,
            name,
            google_id: googleId,
            auth_provider: 'google',
            avatar_url: picture,
            credits: freeCredits,
            nickname,
          };

          // Create default workspace
          await this.ensureDefaultWorkspace(userId, name);
        }
      }

      // Ensure default workspace exists
      const defaultWorkspace = await this.ensureDefaultWorkspace(user.id, user.name);

      // Generate token pair (access + refresh)
      const tokens = await this.generateTokenPair(user.id, user.email, userAgent, ipAddress);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
          avatarUrl: user.avatar_url,
        },
        defaultWorkspace,
      };
    } catch (error) {
      console.error('[GOOGLE_AUTH] Error:', error.message);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  /**
   * Get current user profile - matches Express GET /api/auth/me
   */
  async getMe(userId: string) {
    const user = await this.db.getOne<{
      id: string;
      email: string;
      name: string;
      credits: number;
      created_at: string;
    }>('SELECT id, email, name, credits, created_at FROM users WHERE id = ?', [userId]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Ensure default workspace exists
    await this.ensureDefaultWorkspace(userId, user.name);

    // Get all workspaces user is a member of (with full data like Express)
    const workspaces = await this.db.getAll<any>(
      `SELECT w.*, wm.role as user_role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
       ORDER BY w.is_default DESC, w.updated_at DESC`,
      [userId],
    );

    // Parse privacySettings for each workspace
    const parsedWorkspaces = workspaces.map((w) => ({
      ...w,
      isDefault: w.is_default,
      userRole: w.user_role,
      privacySettings: typeof w.privacy_settings === 'string'
        ? JSON.parse(w.privacy_settings || '{}')
        : w.privacy_settings || {},
    }));

    // defaultWorkspace is first workspace with is_default=true or first in array
    const defaultWorkspace = parsedWorkspaces.find((w) => w.is_default) || parsedWorkspaces[0] || null;

    return {
      ...user,
      workspaces: parsedWorkspaces,
      defaultWorkspace,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    // Find the refresh token in database
    const storedToken = await this.db.getOne<{
      id: string;
      user_id: string;
      token: string;
      expires_at: string;
      revoked_at: string | null;
    }>(
      `SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL`,
      [refreshToken],
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user
    const user = await this.db.getOne<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE id = ?',
      [storedToken.user_id],
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate tokens: Revoke old token
    const newRefreshToken = uuidv4();
    await this.db.run(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, replaced_by_token = ? WHERE id = ?`,
      [newRefreshToken, storedToken.id],
    );

    // Create new refresh token
    const refreshTokenExpiryMs = this.configService.get<number>('jwt.refreshTokenExpiryMs') || 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshTokenExpiryMs);

    await this.db.run(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, newRefreshToken, expiresAt.toISOString(), userAgent || null, ipAddress || null],
    );

    // Generate new access token
    const accessToken = this.generateAccessToken({ userId: user.id, email: user.email });
    const { accessTokenExpiresIn, refreshTokenExpiresIn } = this.getTokenExpiryInfo();

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: accessTokenExpiresIn,
      refreshExpiresIn: refreshTokenExpiresIn,
    };
  }

  /**
   * Logout - revoke specific refresh token
   */
  async logout(refreshToken: string) {
    const result = await this.db.run(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = ? AND revoked_at IS NULL`,
      [refreshToken],
    );

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices - revoke all user's refresh tokens
   */
  async logoutAll(userId: string) {
    await this.db.run(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );

    return { success: true, message: 'Logged out from all devices successfully' };
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string) {
    const sessions = await this.db.getAll<{
      id: string;
      created_at: string;
      expires_at: string;
      user_agent: string | null;
      ip_address: string | null;
    }>(
      `SELECT id, created_at, expires_at, user_agent, ip_address 
       FROM refresh_tokens 
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [userId],
    );

    return sessions.map(s => ({
      id: s.id,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      userAgent: s.user_agent,
      ipAddress: s.ip_address,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const result = await this.db.run(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
      [sessionId, userId],
    );

    return { success: true, message: 'Session revoked successfully' };
  }
}
