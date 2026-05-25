import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiCookieAuth,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Role, WithdrawStatus } from '@prisma/client';
import { ListUsersQueryDto } from 'src/user/dto/list-users-query.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { AdjustBalanceDto } from '../user/dto/adjust-balance.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserService } from 'src/user/user.service';
import { WalletService } from 'src/wallet/wallet.service';
import { ReviewWithdrawDto } from 'src/wallet/dto/review-withdraw.dto';

@ApiTags('Admin')
@ApiCookieAuth('connect.sid')
@ApiUnauthorizedResponse({ description: 'Session missing or invalid' })
@ApiForbiddenResponse({ description: 'Requires ADMIN (or MODERATOR) role' })
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  @Get('users')
  @Roles(Role.MODERATOR)
  @ApiOperation({
    summary: 'List all users (admin panel)',
    description:
      'Supports pagination (`skip`, `take`), filtering by `role`, `isBanned`, ' +
      '`isDeleted`, and full-text `search` by username/email.',
  })
  @ApiOkResponse({ description: '{ data: User[], total, skip, take }' })
  findAllUsers(@Query() query: ListUsersQueryDto) {
    return this.userService.findAllAdmin(query);
  }

  @Get('users/stats')
  @ApiOperation({
    summary: 'Platform statistics',
    description:
      'Returns totals: totalUsers, bannedUsers, deletedUsers, activeUsers, usersByRole.',
  })
  @ApiOkResponse({
    description: 'Platform statistics object',
    schema: {
      example: {
        totalUsers: 500,
        bannedUsers: 12,
        deletedUsers: 7,
        activeUsers: 493,
        usersByRole: [
          { role: 'USER', count: 100 },
          { role: 'MODERATOR', count: 3 },
          { role: 'ADMIN', count: 1 },
        ],
      },
    },
  })
  getStats() {
    return this.userService.getStats();
  }

  @Get('users/:id')
  @Roles(Role.MODERATOR)
  @ApiOperation({ summary: 'Get full user record by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Full user object (no password)' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update user fields (role, isBanned, isDeleted, banEndAt)',
    description: 'Only provided fields are updated.',
  })
  @ApiParam({ name: 'id', type: Number })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, dto);
  }
  
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a user account' })
  @ApiParam({ name: 'id', type: Number })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.softDeleteUser(id);
  }

  @Patch('users/:id/balance')
  @ApiOperation({
    summary: 'Adjust user balance',
    description:
      'Pass a positive number to add funds, negative to subtract. ' +
      'Balance cannot go below 0.',
  })
  @ApiParam({ name: 'id', type: Number })
  adjustBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.userService.adjustBalance(id, dto);
  }

  @Get('withdrawals')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'List all withdrawal requests',
    description:
      'Filter by status: PENDING | APPROVED | REJECTED. Supports pagination.',
  })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawStatus })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated list of withdrawal requests with user info',
  })
  getAllWithdrawRequests(
    @Query('status') status?: WithdrawStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.walletService.getAllWithdrawRequests(
      status,
      Number(skip) || 0,
      Number(take) || 20,
    );
  }

  @Patch('withdrawals/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or reject a withdrawal request',
    description:
      'APPROVED — request is closed, admin sends money manually. ' +
      'REJECTED — balance is automatically refunded to the user.',
  })
  @ApiParam({ name: 'id', type: String, description: 'WithdrawRequest UUID' })
  @ApiOkResponse({
    description: '{ message: "Request approved" | "Request rejected" }',
  })
  @ApiNotFoundResponse({ description: 'Withdraw request not found' })
  @ApiBadRequestResponse({ description: 'Request already reviewed' })
  reviewWithdrawRequest(
    @Param('id') id: string,
    @Body() dto: ReviewWithdrawDto,
  ) {
    return this.walletService.reviewWithdrawRequest(id, dto);
  }
}
