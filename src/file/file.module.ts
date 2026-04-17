import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { UserRepository } from 'src/user/user.repository';
import { FileRepository } from './file.repository';

@Module({
  imports: [],
  controllers: [FileController],
  providers: [FileService,UserRepository,FileRepository],
})
export class FileModule {}