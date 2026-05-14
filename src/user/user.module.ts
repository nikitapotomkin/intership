import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { AddressRepository } from './repositories/address.repository';
import { ProfileRepository } from './repositories/profile.repository';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports:[WalletModule],
  providers: [UserService,UserRepository,AddressRepository,ProfileRepository],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}