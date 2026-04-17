import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRecord } from '../interfaces/user-record.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserRecord => {
    const request = ctx.switchToHttp().getRequest();
    return request.currentUser;
  },
);