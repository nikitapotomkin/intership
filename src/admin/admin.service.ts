import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';

import { UserRepository } from 'src/user/repositories/user.repository';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { ProfileRepository } from 'src/user/repositories/profile.repository';

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const { skip = 0, take = 20, role, isBanned, isDeleted, search } = query;

    const where: any = {};
    if (role !== undefined) where.role = role;
    if (isBanned !== undefined) where.isBanned = isBanned;
    if (isDeleted !== undefined) where.isDeleted = isDeleted;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userRepository.findAll({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      this.userRepository.count(),
    ]);
    const safe = users.map(({ password, ...u }) => u);
    return { data: safe, total, skip, take };
  }

  async getUser(id: number) {
    const user = await this.userRepository.findUnique({
      where: { id },
      include: { profile: true, address: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return this.buildResponse(user);
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const data: any = {};

    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isBanned !== undefined) data.isBanned = dto.isBanned;
    if (dto.banEndAt !== undefined) data.banEndAt = new Date(dto.banEndAt);
    if (dto.isDeleted !== undefined) {
      data.isDeleted = dto.isDeleted;
      data.deletedAt = dto.isDeleted ? new Date() : null;
    }

    const updated = await this.userRepository.update({
      where: { id },
      data,
    });
    return this.buildResponse(updated);
  }

  async softDeleteUser(id: number) {
    await this.ensureExists(id);
    const updated = await this.userRepository.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    return this.buildResponse(updated);
  }

  async banUser(id: number, dto: BanUserDto) {
    return this.updateUser(id, {
      isBanned: true,
      banEndAt: dto.banEndAt,
    });
  }

  async unbanUser(id: number) {
    return this.updateUser(id, { isBanned: false, banEndAt: undefined });
  }

  async restoreUser(id: number) {
    return this.updateUser(id, { isDeleted: false });
  }

  async changeRole(id: number, role: Role) {
    return this.updateUser(id, { role });
  }

  async adjustBalance(id: number, dto: AdjustBalanceDto) {
    const profile = await this.profileRepository.findUnique({
      where: { userId: id },
    });
    if (!profile)
      throw new NotFoundException(`Profile for user #${id} not found`);

    const current = Number(profile.balance);
    const next = current + dto.amount;
    if (next < 0) throw new BadRequestException('Balance cannot go below zero');

    return this.profileRepository.update(id, { balance: next });
  }

  async getStats() {
    const [total, banned, deleted, byRole] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ isBanned: true }),
      this.userRepository.count({ isDeleted: true }),
      this.userRepository.groupBy({ by: ['role'], _count: { id: true } }),
    ]);

    return {
      totalUsers: total,
      bannedUsers: banned,
      deletedUsers: deleted,
      activeUsers: total - deleted,
      usersByRole: byRole.map((r) => ({ role: r.role, count: r._count.id })),
    };
  }

  private async ensureExists(id: number) {
    const user = await this.userRepository.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private buildResponse(user: User) {
    const { password, ...safeUser } = user;

    return {
      user: safeUser,
    };
  }
}
