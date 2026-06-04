import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { LiveRouletteRoom, Prisma } from '@prisma/client';

@Injectable()
export class LiveRouletteRoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    args: Prisma.LiveRouletteRoomCreateArgs,
  ): Promise<LiveRouletteRoom> {
    return this.prisma.liveRouletteRoom.create(args);
  }

  async findUnique(
    args: Prisma.LiveRouletteRoomFindUniqueArgs,
  ): Promise<LiveRouletteRoom | null> {
    return this.prisma.liveRouletteRoom.findUnique(args);
  }

   async update(args: Prisma.LiveRouletteRoomUpdateArgs): Promise<LiveRouletteRoom> {
      return this.prisma.liveRouletteRoom.update(args);
    }

    async delete(id: string): Promise<LiveRouletteRoom> {
        return this.prisma.liveRouletteRoom.delete({ where: { id } });
      }
}
