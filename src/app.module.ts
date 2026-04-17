import { Module } from '@nestjs/common';
import { FileModule } from './file/file.module';
import { UserModule } from './user/user.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    UserModule,
    FileModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), 
      serveRoot: '/static',
    }),
  ],
})
export class AppModule {}
