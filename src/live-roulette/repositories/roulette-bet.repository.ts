import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, RouletteBet } from '@prisma/client';

@Injectable()
export class RouletteBetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.RouletteBetCreateArgs): Promise<RouletteBet> {
    return this.prisma.rouletteBet.create(args);
  }

  async findAll(args?: Prisma.RouletteBetFindManyArgs): Promise<RouletteBet[]> {
    return this.prisma.rouletteBet.findMany(args);
  }

  async update(args: Prisma.RouletteBetUpdateArgs): Promise<RouletteBet> {
    return this.prisma.rouletteBet.update(args);
  }

  async updateMany(args: Prisma.RouletteBetUpdateManyArgs) {
    return this.prisma.rouletteBet.updateMany(args);
  }
}