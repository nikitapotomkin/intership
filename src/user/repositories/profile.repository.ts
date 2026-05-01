import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, Profile } from '@prisma/client';

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProfileCreateInput): Promise<Profile> {
    return this.prisma.profile.create({ data });
  }

  async findOne(args: Prisma.ProfileFindFirstArgs): Promise<Profile | null> {
    return this.prisma.profile.findFirst(args);
  }

  async findAll(args?: Prisma.ProfileFindManyArgs): Promise<Profile[]> {
    return this.prisma.profile.findMany(args);
  }

  async findUnique(args: Prisma.ProfileFindUniqueArgs): Promise<Profile | null> {
    return this.prisma.profile.findUnique(args);
  }

  async update(userId: number, data: Prisma.ProfileUpdateInput): Promise<Profile> {
    return this.prisma.profile.update({ where: { userId }, data });
  }

  async count(where?: Prisma.ProfileWhereInput): Promise<number> {
    return this.prisma.profile.count({ where });
  }

  async delete(userId: number): Promise<Profile> {
    return this.prisma.profile.delete({ where: { userId } });
  }
}