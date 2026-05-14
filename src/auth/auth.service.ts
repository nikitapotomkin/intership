import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { hash, verify } from 'argon2';
import { RestoreAccountDto } from './dto/restore-account.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { UserRepository } from 'src/user/repositories/user.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (exists) {
      throw new ConflictException('Email or username already taken');
    }

    const hashed = await hash(dto.password);

    const user = await this.userRepository.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashed,
        profile: { create: { rating: 0, balance: 0, level: 0 } },
      },
      include: {
        profile: true,
      },
    });

    return this.buildResponse(user);
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.userRepository.findOne({
      where: {
        OR: [{ email: dto.login }, { username: dto.login }],
      },
      include: { profile: true, address: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verify(user.password, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.isDeleted)
      throw new ForbiddenException('Account has been deleted');
    if (user.isBanned) {
      const info = user.banEndAt ? ` until ${user.banEndAt.toISOString()}` : '';
      throw new ForbiddenException(`Account is banned${info}`);
    }

    await this.userRepository.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: req.ip,
      },
    });

    const { user: safeUser } = this.buildResponse(user);

    return await this.saveSession(req, safeUser);
  }

  async restore(req: Request, dto: RestoreAccountDto) {
    const user = await this.userRepository.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');
    if (!user.isDeleted) throw new ConflictException('Account is not deleted');

    const valid = await verify(user.password, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const restored = await this.userRepository.update({
      where: { id: user.id },
      data: { isDeleted: false, deletedAt: null },
      include: { profile: true, address: true },
    });

    const { user: safeUser } = this.buildResponse(restored);
    return this.saveSession(req, safeUser);
  }

  async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              `Failed to establish session. There may be a problem with the server or the session has already been terminated.`,
            ),
          );
        }
        res.clearCookie(this.configService.getOrThrow<string>('SESSION_NAME'));
        resolve();
      });
    });
  }

  async saveSession(req: Request, user: User | Omit<User, 'password'>) {
    return new Promise((resolve, reject) => {
      req.session.userId = user.id;

      req.session.save((err) => {
        if (err) {
          console.log(err, user);
          return reject(
            new InternalServerErrorException(
              `Failed to save session. Check if session parameters are configured correctly.`,
            ),
          );
        }

        resolve(user);
      });
    });
  }

  private buildResponse(user: any) {
    const { password, ...safeUser } = user;

    return {
      user: safeUser,
    };
  }
}
