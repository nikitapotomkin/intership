import { Injectable } from '@nestjs/common';
import { Prisma, UserProvider } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { UserRepository } from 'src/user/repositories/user.repository';

@Injectable()
export class UserProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.UserProviderCreateArgs): Promise<UserProvider> {
    return this.prisma.userProvider.create(args);
  }

  async findUnique<T extends Prisma.UserProviderFindUniqueArgs>(
    args: T,
  ): Promise<Prisma.UserProviderGetPayload<T> | null> {
    return this.prisma.userProvider.findUnique(args) as any;
  }

  async findOne(
    args: Prisma.UserProviderFindFirstArgs,
  ): Promise<UserProvider | null> {
    return this.prisma.userProvider.findFirst(args);
  }
}
