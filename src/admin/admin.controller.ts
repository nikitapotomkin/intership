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
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiCookieAuth('connect.sid')
@ApiUnauthorizedResponse({ description: 'Session missing or invalid' })
@ApiForbiddenResponse({ description: 'Requires ADMIN (or MODERATOR) role' })
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

 
  @Get()
  @Roles(Role.MODERATOR)          
  @ApiOperation({
    summary: 'List all users (admin panel)',
    description:
      'Supports pagination (`skip`, `take`), filtering by `role`, `isBanned`, ' +
      '`isDeleted`, and full-text `search` by username/email.',
  })
  @ApiOkResponse({ description: '{ data: User[], total, skip, take }' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  
  @Get(':id')
  @Roles(Role.MODERATOR)
  @ApiOperation({ summary: 'Get full user record by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Full user object (no password)' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUser(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user fields (role, isBanned, isDeleted, banEndAt)',
    description: 'Only provided fields are updated.',
  })
  @ApiParam({ name: 'id', type: Number })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Post(':id/ban')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MODERATOR)
  @ApiOperation({
    summary: 'Ban a user',
    description: 'Set `banEndAt` to a future date for a temporary ban, omit for permanent.',
  })
  @ApiParam({ name: 'id', type: Number })
  banUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(id, dto);
  }

  @Post(':id/unban')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MODERATOR)
  @ApiOperation({ summary: 'Remove ban from a user' })
  @ApiParam({ name: 'id', type: Number })
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unbanUser(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a user account' })
  @ApiParam({ name: 'id', type: Number })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.softDeleteUser(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted user account' })
  @ApiParam({ name: 'id', type: Number })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.restoreUser(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change user role (USER | MODERATOR | ADMIN)' })
  @ApiParam({ name: 'id', type: Number })
  changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
  ) {
    return this.adminService.changeRole(id, role);
  }

  @Patch(':id/balance')
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
    return this.adminService.adjustBalance(id, dto);
  }

  @Get('stats')
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
    return this.adminService.getStats();
  }
}
