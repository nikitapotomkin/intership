import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { verify, hash } from 'argon2';
import { ProfileRepository } from './repositories/profile.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';
import { AddressRepository } from './repositories/address.repository';
import { Role, User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import Redis from 'ioredis';
import { PUBLIC_USER_SELECT } from './user.constants';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly addressRepository: AddressRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findAll(skip = 0, take = 20) {
    return this.userRepository.findAll({
      where: { isDeleted: false },
      select: PUBLIC_USER_SELECT,
      orderBy: { profile: { rating: 'desc' } },
      skip,
      take,
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      include: { profile: true, address: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safe } = user;
    return safe;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const updateData: any = {};

    if (dto.username) {
      const taken = await this.userRepository.findOne({
        where: { username: dto.username, NOT: { id: id } },
      });
      if (taken) throw new BadRequestException('Username already taken');
      updateData.username = dto.username;
    }

    await this.userRepository.update({
      where: { id },
      data: updateData,
    });

    if (dto.avatar !== undefined) {
      await this.profileRepository.update(id, { avatar: dto.avatar });
    }

    return this.findMe(id);
  }

  async deleteAccount(id: number) {
    await this.userRepository.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    return {
      message: 'Account deleted. You can restore it via POST /auth/restore.',
    };
  }

  async findAddress(userId: number) {
    const address = await this.addressRepository.findUnique({
      where: { userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async upsertAddress(userId: number, dto: UpsertAddressDto) {
    return this.addressRepository.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  async deleteAddress(userId: number) {
    await this.addressRepository.delete(userId);
    return { message: 'Address deleted' };
  }

  async findAllAdmin(query: ListUsersQueryDto) {
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

    await this.redis.del(`user:${id}`);
    
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
