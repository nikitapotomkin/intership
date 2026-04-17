import { Module } from '@nestjs/common';
import { UsersController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { FileService } from 'src/file/file.service';
import { FileRepository } from 'src/file/file.repository';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UserService,FileService,FileRepository  ,UserRepository],
})
export class UserModule {}