import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { verify, hash } from 'argon2';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { ProfileRepository } from './repositories/profile.repository';
import { UpdateProfileDto } from './dto/updateAddress.dto';
import { UpsertAddressDto } from './dto/upsertAddress.dto';
import { AddressRepository } from './repositories/address.repository';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  createdAt: true,
  profile: {
    select: {
      rating: true,
      level: true,
      avatar: true,
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
     private readonly addressRepository: AddressRepository,
  ) {}

  async findAll(skip = 0, take = 20) {
    return this.userRepository.findAll({
      where: { isDeleted: false },
      select: PUBLIC_USER_SELECT,
      orderBy: { profile: { rating: 'desc' } },
      skip,
      take,
    });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      include: { profile: true, address: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safe } = user;
    return safe;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const updateData: any = {};

    if (dto.username) {
      const taken = await this.userRepository.findOne({
        where: { username: dto.username, NOT: { id: id } },
      });
      if (taken) throw new BadRequestException('Username already taken');
      updateData.username = dto.username;
    }

    await this.userRepository.update({
      where: { id },
      data: updateData,
    });

    if (dto.avatar !== undefined) {
      await this.profileRepository.update(id, { avatar: dto.avatar });
    }

    return this.getMe(id);
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.userRepository.findUnique({ where: { id: id } });
    if (!user?.password) throw new NotFoundException('User not found');

    const valid = await verify(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    const hashed = await hash(dto.newPassword);
    await this.userRepository.update({
      where: { id },
      data: {
        password: hashed,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(id: number) {
    await this.userRepository.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    return {
      message: 'Account deleted. You can restore it via POST /auth/restore.',
    };
  }

  async getAddress(userId: number) {
    const address = await this.addressRepository.findUnique({ where: { userId } });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async upsertAddress(userId: number, dto: UpsertAddressDto) {
    return this.addressRepository.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  async deleteAddress(userId: number) {
    await this.addressRepository.delete(userId);
    return { message: 'Address deleted' };
  }
}
