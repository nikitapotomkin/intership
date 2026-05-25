import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BannedUserGuard } from './guards/banned-user.guard';
import { UserRepository } from 'src/user/repositories/user.repository';
import { MailerModule } from 'src/mailer/mailer.module';
import { TokenRepository } from './repositories/token.repository';
import { PaymentModule } from 'src/payment/payment.module';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [MailerModule,PaymentModule],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: BannedUserGuard },
    UserRepository,
    TokenRepository,
    GoogleStrategy
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
