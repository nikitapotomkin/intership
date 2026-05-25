import { Injectable } from '@nestjs/common';
import { Prisma, Token } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.TokenCreateArgs): Promise<Token> {
    return this.prisma.token.create(args);
  }

  async findOne(args: Prisma.TokenFindFirstArgs): Promise<Token | null> {
    return this.prisma.token.findFirst(args);
  }

  async findUnique(args: Prisma.TokenFindUniqueArgs): Promise<Token | null> {
    return this.prisma.token.findUnique(args);
  }

  async delete(args: Prisma.TokenDeleteArgs): Promise<Token> {
    return this.prisma.token.delete(args);
  }
}