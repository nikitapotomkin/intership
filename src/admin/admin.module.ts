import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController} from './admin.controller';
import { ProfileRepository } from 'src/user/repositories/profile.repository';
import { UserRepository } from 'src/user/repositories/user.repository';

@Module({
  providers: [AdminService,ProfileRepository,UserRepository],
  controllers: [AdminController],
})
export class AdminModule {}