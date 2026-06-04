import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.UserCreateArgs): Promise<User> {
    return this.prisma.user.create(args);
  }

  async findOne(args: Prisma.UserFindFirstArgs): Promise<User | null> {
    return this.prisma.user.findFirst(args);
  }

  async findAll(args?: Prisma.UserFindManyArgs): Promise<User[]> {
    return this.prisma.user.findMany(args);
  }

  async findUnique<T extends Prisma.UserFindUniqueArgs>(
    args: T,
  ): Promise<Prisma.UserGetPayload<T> | null> {
    return this.prisma.user.findUnique(args) as any;
  }
  
  async update(args: Prisma.UserUpdateArgs): Promise<User> {
    return this.prisma.user.update(args);
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  async delete(id: number): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async upsert(args: Prisma.UserUpsertArgs): Promise<User> {
    return this.prisma.user.upsert(args);
  }

  async groupBy(args: Prisma.UserGroupByArgs): Promise<any[]> {
    return this.prisma.user.groupBy(args as any);
  }
}
