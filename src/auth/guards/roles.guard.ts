import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";

const ROLE_HIERARCHY: Record<string, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const userRole = request.user.role;

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const minRequired = Math.min(...roles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException(
        'Insufficient rights. You do not have access rights to this resource.',
      );
    }

    return true;
  }
}