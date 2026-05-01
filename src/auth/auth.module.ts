import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BannedUserGuard } from './guards/banned-user.guard';
import { UserRepository } from 'src/user/repositories/user.repository';

@Module({
  imports: [],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: BannedUserGuard },
    UserRepository
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
