import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { RestoreAccountDto } from './dto/restore-account.dto';
import { Public } from 'src/common/decorators/public-decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ description: 'user object' })
  @ApiConflictResponse({ description: 'Email or username already taken' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login — returns full user object including profile',
    description: 'Accepts email **or** username as the `login` field.',
  })
  @ApiOkResponse({ description: 'User object' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a soft-deleted account',
    description:
      "Verifies the user's credentials and un-marks `isDeleted`. " +
      'Returns a new session on success.',
  })
  @ApiOkResponse({ description: 'User object' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  restore(@Req() req: Request, @Body() dto: RestoreAccountDto) {
    return this.authService.restore(req, dto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verifies the email using a token sent to the user. Logs in the user after successful verification.',
  })
  @ApiOkResponse({ description: 'Email verified, session created' })
  @ApiBadRequestResponse({ description: 'Token has expired' })
  @ApiNotFoundResponse({ description: 'Token or user not found' })
  async newVerification(@Req() req: Request, @Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(req, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Destroys the session and clears the session cookie.',
  })
  @ApiOkResponse({ description: '{ success: true }' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req, res);
    return { success: true };
  }

  @Get('google')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  @ApiResponse({ status: 302, description: 'Redirects to Google login page' })
  googleAuth() {}

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend on success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    await this.authService.saveSession(req, req.user as User);
    res.redirect(
      `${this.configService.getOrThrow<string>('ALLOWED_ORIGIN')}/auth/success`,
    );
  }

  @Post('password-recovery/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'User registered via OAuth' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('password-recovery/new/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set new password using reset token' })
  @ApiParam({ name: 'token', description: 'Password reset token from email' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async newPassword(
    @Body() dto: ChangePasswordDto,
    @Param('token') token: string,
  ) {
    return this.authService.changePassword(dto, token);
  }
}
