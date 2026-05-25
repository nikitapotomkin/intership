import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';
import { Request } from 'express';
import { Public } from 'src/common/decorators/public-decorator';
import { Put } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { WalletService } from 'src/wallet/wallet.service';

@ApiTags('User')
@ApiCookieAuth('connect.sid')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService,private readonly walletService:WalletService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get public user list (leaderboard)',
    description:
      'Returns limited info per user: username, rating, level, avatar, createdAt. ' +
      'Used for the game statistics page.',
  })
  @ApiOkResponse({ description: 'Paginated user list' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.userService.findAll(Number(skip) || 0, Number(take) || 20);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get my full profile',
    description:
      'Returns the full authenticated user object including profile and address. ' +
      'Password hash is stripped from the response.',
  })
  @ApiOkResponse({ description: 'Full user object (no password)' })
  getMe(@CurrentUser() user: User) {
    return this.userService.findMe(user.id);
  }

  @Get('address')
  @ApiOperation({ summary: 'Get my delivery address' })
  @ApiOkResponse({ description: 'Address object' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  getAddress(@CurrentUser() user: User) {
    return this.userService.findAddress(user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get public stats for a specific user',
    description:
      'Returns: username, rating, level, avatar, createdAt. ' +
      'Does not expose email, IP or other private fields.',
  })
  @ApiOkResponse({ description: 'Public user stats' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update username and/or avatar' })
  @ApiOkResponse({ description: 'Updated user object' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }
 
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete my account',
    description:
      'Sets `isDeleted = true`. The account can be restored later via `POST /auth/restore`.',
  })
  @ApiOkResponse({ description: 'Account deleted message' })
  deleteAccount(@CurrentUser() user: User) {
    return this.userService.deleteAccount(user.id);
  }
 
  @Put('address')
  @ApiOperation({
    summary: 'Create or update my delivery address (upsert)',
    description: 'Creates the address if it does not exist; updates it if it does.',
  })
  @ApiOkResponse({ description: 'Upserted address object' })
  upsertAddress(@CurrentUser() user: User, @Body() dto: UpsertAddressDto) {
    return this.userService.upsertAddress(user.id, dto);
  }
 
  @Delete('address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my delivery address' })
  @ApiOkResponse({ description: '{ message: "Address deleted" }' })
  deleteAddress(@CurrentUser() user: User) {
    return this.userService.deleteAddress(user.id);
  }
}