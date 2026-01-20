import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No admin token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = this.configService.get<string>('jwt.secret') || '';
      const decoded = jwt.verify(token, secret) as unknown as { adminId: string; isAdmin: boolean };

      if (!decoded.isAdmin) {
        throw new UnauthorizedException('Not an admin token');
      }

      // Attach admin to request
      request.admin = {
        id: decoded.adminId,
        isAdmin: true,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
