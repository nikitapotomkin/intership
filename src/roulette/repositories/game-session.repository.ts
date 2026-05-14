import { Injectable } from '@nestjs/common';
import { Prisma, GameSession } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class GameSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.GameSessionCreateArgs): Promise<GameSession> {
    return this.prisma.gameSession.create(args);
  }

  async findOne(args: Prisma.GameSessionFindFirstArgs): Promise<GameSession | null> {
    return this.prisma.gameSession.findFirst(args);
  }

  async findUnique(args: Prisma.GameSessionFindUniqueArgs): Promise<GameSession | null> {
    return this.prisma.gameSession.findUnique(args);
  }

  async update(args: Prisma.GameSessionUpdateArgs): Promise<GameSession> {
    return this.prisma.gameSession.update(args);
  }
}