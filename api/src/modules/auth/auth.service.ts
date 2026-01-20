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
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto';

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
   * Generate JWT token
   */
  private generateToken(payload: { userId: string; email: string }): string {
    const secret = this.configService.get<string>('jwt.secret');
    const expiresIn = this.configService.get<string>('jwt.expiresIn');
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Ensure user has a default workspace and return it
   */
  private async ensureDefaultWorkspace(userId: string, userName: string): Promise<any> {
    try {
      let existing = await this.db.getOne<any>(
        'SELECT * FROM workspaces WHERE ownerId = ? AND isDefault = 1',
        [userId],
      );

      if (!existing) {
        const workspaceId = uuidv4();
        await this.db.run(
          `INSERT INTO workspaces (id, name, ownerId, credits, creditMode, isDefault)
           VALUES (?, ?, ?, 0, 'user', 1)`,
          [workspaceId, `${userName}'s Workspace`, userId],
        );

        await this.db.run(
          `INSERT INTO workspace_members (id, workspaceId, userId, role, allocatedCredits)
           VALUES (?, ?, ?, 'owner', 0)`,
          [uuidv4(), workspaceId, userId],
        );

        existing = await this.db.getOne<any>('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
      }

      if (existing?.privacySettings) {
        existing.privacySettings = typeof existing.privacySettings === 'string'
          ? JSON.parse(existing.privacySettings)
          : existing.privacySettings;
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
  async register(dto: RegisterDto) {
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
      `INSERT INTO users (id, email, password, name, credits, nickname, authProvider)
       VALUES (?, ?, ?, ?, ?, ?, 'email')`,
      [userId, email, hashedPassword, name, freeCredits, nickname],
    );

    // Create default workspace
    const defaultWorkspace = await this.ensureDefaultWorkspace(userId, name);

    // Generate token
    const token = this.generateToken({ userId, email });

    return {
      token,
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
  async login(dto: LoginDto) {
    const { email, password } = dto;

    // Find user
    const user = await this.db.getOne<{
      id: string;
      email: string;
      password: string;
      name: string;
      credits: number;
      nickname: string;
      avatarUrl: string;
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

    // Generate token
    const token = this.generateToken({ userId: user.id, email: user.email });

    return {
      token,
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
  async googleAuth(dto: GoogleAuthDto) {
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
      const { sub: googleId, email, name, picture } = payload;

      // Check if user exists with this googleId
      let user = await this.db.getOne<any>(
        'SELECT * FROM users WHERE googleId = ?',
        [googleId],
      );

      if (!user) {
        // Check if email exists
        user = await this.db.getOne<any>('SELECT * FROM users WHERE email = ?', [email]);

        if (user) {
          // Link Google account to existing user
          await this.db.run(
            'UPDATE users SET googleId = ?, authProvider = ?, avatarUrl = COALESCE(avatarUrl, ?) WHERE id = ?',
            [googleId, 'google', picture, user.id],
          );
          user.googleId = googleId;
          user.authProvider = 'google';
        } else {
          // Create new user with Google account
          const userId = uuidv4();
          const freeCredits = await this.getFreeCredits();
          const nickname = this.generateNickname();

          await this.db.run(
            `INSERT INTO users (id, email, name, googleId, authProvider, avatarUrl, credits, nickname)
             VALUES (?, ?, ?, ?, 'google', ?, ?, ?)`,
            [userId, email, name, googleId, picture, freeCredits, nickname],
          );

          user = {
            id: userId,
            email,
            name,
            googleId,
            authProvider: 'google',
            avatarUrl: picture,
            credits: freeCredits,
            nickname,
          };

          // Create default workspace
          await this.ensureDefaultWorkspace(userId, name);
        }
      }

      // Ensure default workspace exists
      const defaultWorkspace = await this.ensureDefaultWorkspace(user.id, user.name);

      // Generate token
      const token = this.generateToken({ userId: user.id, email: user.email });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
          avatarUrl: user.avatarUrl,
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
      createdAt: string;
    }>('SELECT id, email, name, credits, createdAt FROM users WHERE id = ?', [userId]);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Ensure default workspace exists
    await this.ensureDefaultWorkspace(userId, user.name);

    // Get all workspaces user is a member of (with full data like Express)
    const workspaces = await this.db.getAll<any>(
      `SELECT w.*, wm.role as userRole
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspaceId AND wm.userId = ?
       ORDER BY w.isDefault DESC, w.updatedAt DESC`,
      [userId],
    );

    // Parse privacySettings for each workspace
    const parsedWorkspaces = workspaces.map((w) => ({
      ...w,
      privacySettings: typeof w.privacySettings === 'string'
        ? JSON.parse(w.privacySettings || '{}')
        : w.privacySettings || {},
    }));

    // defaultWorkspace is first workspace with isDefault=1 or first in array
    const defaultWorkspace = parsedWorkspaces.find((w) => w.isDefault) || parsedWorkspaces[0] || null;

    return {
      ...user,
      workspaces: parsedWorkspaces,
      defaultWorkspace,
    };
  }
}
