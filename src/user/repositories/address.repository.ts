import { Injectable } from "@nestjs/common";
import { Address, Prisma } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(args: Prisma.AddressFindUniqueArgs): Promise<Address | null> {
    return this.prisma.address.findUnique(args);
  }

  async upsert(args: Prisma.AddressUpsertArgs): Promise<Address> {
      return this.prisma.address.upsert(args);
    }

    async delete(userId: number): Promise<Address> {
        return this.prisma.address.delete({ where: { userId } });
      }
}