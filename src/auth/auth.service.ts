import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { hash, verify } from 'argon2';
import { RestoreAccountDto } from './dto/restore-account.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, TokenType, User } from '@prisma/client';
import { UserRepository } from 'src/user/repositories/user.repository';
import { MailerService } from 'src/mailer/mailer.service';
import { randomUUID } from 'crypto';
import { TokenRepository } from './repositories/token.repository';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OAuthUserData } from './types/oauth-user-data.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserProviderRepository } from './repositories/user-provider.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly tokenRepository: TokenRepository,
    private readonly userProviderRepository: UserProviderRepository,
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
        profile: { create: {} },
      },
      include: {
        profile: true,
      },
    });

    await this.sendToken(dto.email, TokenType.VERIFICATION);

    return this.buildResponse(user);
  }

  async validateOAuthUser(oauthUserData: OAuthUserData) {
    const { provider, providerId, email, username, avatar } = oauthUserData;

    const userProvider = await this.userProviderRepository.findUnique({
      where: {
        provider_providerId: {
          provider: provider as AuthProvider,
          providerId,
        },
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (userProvider) return this.buildResponse(userProvider.user);

    const existingUser = await this.userRepository.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (existingUser) {
      await this.userProviderRepository.create({
        data: {
          userId: existingUser.id,
          provider: provider as AuthProvider,
          providerId,
        },
      });
      return this.buildResponse(existingUser);
    }

    const user = await this.userRepository.create({
      data: {
        email,
        username: await this.generateUniqueUsername(username),
        isVerified: true,
        profile: {
          create: { avatar },
        },
        providers: {
          create: {
            provider: provider as AuthProvider,
            providerId,
          },
        },
      },
      include: { profile: true },
    });

    return this.buildResponse(user);
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    const slug = base.toLowerCase().replace(/\s+/g, '_');

    const exists = await this.userRepository.findOne({
      where: { username: slug },
    });

    if (!exists) return slug;

    return `${slug}_${Math.random().toString(36).slice(2, 6)}`;
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

    if (!user.isVerified) throw new ForbiddenException('Email is not verified');
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

  async sendToken(email: string, token: TokenType) {
    const verificationToken = await this.generateToken(email, token);

    if (token === TokenType.VERIFICATION) {
      return await this.mailerService.sendConfirmationEmail(
        verificationToken.email,
        verificationToken.token,
      );
    }

    await this.mailerService.sendPasswordResetEmail(
      verificationToken.email,
      verificationToken.token,
    );
  }

  async generateToken(email: string, type: TokenType) {
    const token = randomUUID();
    const expiresIn = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await this.tokenRepository.findOne({
      where: { email, type },
    });

    if (existingToken) {
      await this.tokenRepository.delete({ where: { id: existingToken.id } });
    }

    const newToken = await this.tokenRepository.create({
      data: { email, token, expiresIn, type },
    });

    return newToken;
  }

  async verifyEmail(req: Request, dto: VerifyEmailDto) {
    const existingToken = await this.tokenRepository.findUnique({
      where: { token: dto.token },
    });
    if (!existingToken) {
      throw new NotFoundException(
        'Verification token not found. Please make sure you have the correct token',
      );
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new token for verification',
      );
    }

    const existingUser = await this.userRepository.findUnique({
      where: {
        email: existingToken.email,
      },
    });

    if (!existingUser) {
      throw new NotFoundException(
        'User not found. Please check the email address you entered and try again',
      );
    }

    existingUser.isVerified = true;

    await this.userRepository.update({
      where: { id: existingUser.id },
      data: { isVerified: true },
    });

    await this.tokenRepository.delete({
      where: { id: existingToken.id, type: TokenType.VERIFICATION },
    });

    const { user: safeUser } = this.buildResponse(existingUser);

    return this.saveSession(req, safeUser);
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
              `Failed to establish session. There may be a problem with the server or the session has already been terminated`,
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
              `Failed to save session. Check if session parameters are configured correctly`,
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

  async resetPassword(dto: ResetPasswordDto) {
    const existingUser = await this.userRepository.findUnique({
      where: { email: dto.email },
      include: { providers: true },
    });

    if (!existingUser) {
      throw new NotFoundException(
        'User not found. Please check the email address you entered and try again',
      );
    }

    if (existingUser.providers.length > 0) {
      throw new ForbiddenException("You can't change your password");
    }

    await this.sendToken(existingUser.email, TokenType.RESET_PASSWORD);

    return { message: 'Message to reset password sent to email' };
  }

  async changePassword(dto: ChangePasswordDto, token: string) {
    const existingToken = await this.tokenRepository.findUnique({
      where: { token },
    });

    if (!existingToken) {
      throw new NotFoundException(
        'Token not found. Please check if the token you entered is correct or request a new one',
      );
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        'Token has expired. Please request a new token to confirm password reset',
      );
    }

    const existingUser = await this.userRepository.findUnique({
      where: { email: existingToken.email },
    });

    if (!existingUser) {
      throw new NotFoundException(
        'User not found. Please check the email address you entered and try again',
      );
    }

    await this.userRepository.update({
      where: { id: existingUser.id },
      data: { password: await hash(dto.password) },
    });

    await this.tokenRepository.delete({
      where: { id: existingToken.id },
    });

    return { message: 'Password changed successfully' };
  }
}
