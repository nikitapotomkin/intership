import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

import { confirmationEmail } from './templates/confirmation-email';
import { resetPasswordEmail } from './templates/reset-password';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  public constructor(
    private readonly mailerService: NestMailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendConfirmationEmail(email: string, token: string) {
    const redirectBase =
      this.configService.getOrThrow<string>('ALLOWED_ORIGIN');
    const confirmLink = `${redirectBase}/verify-email?token=${token}`;
    const html = confirmationEmail(confirmLink);

    return this.sendMail(email, 'Email Confirmation', html);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const redirectBase =
      this.configService.getOrThrow<string>('ALLOWED_ORIGIN');
    const resetLink = `${redirectBase}/new-password?token=${token}`;
    const html = resetPasswordEmail(resetLink);

    return this.sendMail(email, 'Password Reset', html);
  }

  private sendMail(email: string, subject: string, html: string) {
    return this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
