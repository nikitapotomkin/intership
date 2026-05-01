import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { AddressRepository } from './repositories/address.repository';
import { ProfileRepository } from './repositories/profile.repository';

@Module({
  providers: [UserService,UserRepository,AddressRepository,ProfileRepository],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}