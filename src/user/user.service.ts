import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { UserRecord } from 'src/common/interfaces/user-record.interface';
import { FileService } from 'src/file/file.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
     private readonly fileService:FileService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<Omit<UserRecord, 'password'>> {
    const existing = await this.userRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    const password = await argon2.hash(dto.password);
    const user: UserRecord = {
      id: randomUUID(),
      email: dto.email,
      password,
      quotaBytes: dto.quotaMb * 1024 * 1024,
      usedBytes: 0,
      createdAt: new Date().toISOString(),
    };

    this.userRepository.create(user);
    return this.sanitize(user);
  }

  async findAll(): Promise<Omit<UserRecord, 'password'>[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string): Promise<Omit<UserRecord, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.sanitize(user);
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    await this.fileService.deleteAllByUser(id);
    await this.userRepository.delete(id);

    return { message: `User ${id} deleted` };
  }

  private sanitize(user: UserRecord): Omit<UserRecord, 'password'> {
    const { password, ...safe } = user;
    return safe;
  }

  
}
