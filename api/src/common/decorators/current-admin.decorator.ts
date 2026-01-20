import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAdminData {
  id: string;
  isAdmin: boolean;
}

export const CurrentAdmin = createParamDecorator(
  (data: keyof CurrentAdminData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.admin;

    if (!admin) {
      return null;
    }

    return data ? admin[data] : admin;
  },
);
