import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { ResponseDto } from './dto/response.dto';
import { RestoreAccountDto } from './dto/restore-account.dto';
import { Public } from 'src/common/decorators/public-decorator';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiOkResponse({ type: ResponseDto })
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
  @ApiOkResponse({ type: ResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  restore(@Req() req: Request, @Body() dto: RestoreAccountDto) {
    return this.authService.restore(req, dto);
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
}
