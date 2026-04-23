import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { UserRecord } from 'src/common/interfaces/user-record.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  findOne(@CurrentUser() currentUser: UserRecord) {
    return this.userService.findOne(currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Delete()
  delete(@CurrentUser() currentUser: UserRecord) {
    return this.userService.deleteUser(currentUser.id);
  }
}