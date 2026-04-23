import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserService } from '../user/user.service';
import { FileService } from '../file/file.service';
import { UserRepository } from '../user/user.repository';
import { FileRepository } from '../file/file.repository';

@Module({
  controllers: [AdminController],
  providers: [UserService, FileService, UserRepository, FileRepository],
})
export class AdminModule {}