import { Injectable } from '@nestjs/common';
import { Prisma, RouletteRound } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class RouletteRoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.RouletteRoundCreateArgs): Promise<RouletteRound> {
    return this.prisma.rouletteRound.create(args);
  }

  async findOne<T extends Prisma.RouletteRoundFindFirstArgs>(
    args: T,
  ): Promise<Prisma.RouletteRoundGetPayload<T> | null> {
    return this.prisma.rouletteRound.findFirst(args) as any;
  }

  async findUnique<T extends Prisma.RouletteRoundFindUniqueArgs>(
  args: T,
): Promise<Prisma.RouletteRoundGetPayload<T> | null> {
  return this.prisma.rouletteRound.findUnique(args) as any;
}

  async findAll(
    args?: Prisma.RouletteRoundFindManyArgs,
  ): Promise<RouletteRound[]> {
    return this.prisma.rouletteRound.findMany(args);
  }

  async update(args: Prisma.RouletteRoundUpdateArgs): Promise<RouletteRound> {
    return this.prisma.rouletteRound.update(args);
  }

  async count(where?: Prisma.RouletteRoundWhereInput): Promise<number> {
    return this.prisma.rouletteRound.count({ where });
  }
}
