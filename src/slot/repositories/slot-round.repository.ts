import { Injectable } from '@nestjs/common';
import { Prisma, SlotRound } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class SlotRoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.SlotRoundCreateArgs): Promise<SlotRound> {
    return this.prisma.slotRound.create(args);
  }

  async findAll(args?: Prisma.SlotRoundFindManyArgs): Promise<SlotRound[]> {
    return this.prisma.slotRound.findMany(args);
  }
}
