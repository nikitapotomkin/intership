import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/admin/guards/admin.guard';
import { UserService } from '../user/user.service';
import { FileService } from '../file/file.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { Response } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRecord } from 'src/common/interfaces/user-record.interface';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly fileService: FileService,
  ) {}

  @Get('users')
  async getAllUsers() {
    const users = await this.userService.findAll();
    const allFiles = await this.fileService.findAll();

    return users.map((u) => ({
      ...u,
      files: allFiles.filter((f) => f.userId === u.id),
    }));
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() currentUser: UserRecord,
  ) {
    return this.userService.updateUser(id, dto, currentUser);
  }

  @Get('files')
  async getAllFiles() {
    return this.fileService.findAll();
  }

  @Delete('files/:fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    await this.fileService.delete(fileId);
    return { success: true };
  }

  @Get('files/:fileId/download')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.fileService.findOne(fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );

    const stream = await this.fileService.getStreamById(fileId);
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).end('Streaming error');
      else res.destroy(err);
    });
    stream.pipe(res);
  }

  @Get(':fileId/view')
  async view(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.fileService.findOne(fileId);

    const inlineTypes = ['image/', 'application/pdf', 'text/', 'video/'];
    const isInline = inlineTypes.some((type) => file.mimeType.startsWith(type));

    const disposition = isInline ? 'inline' : 'attachment';
    const encodedName = encodeURIComponent(file.originalName);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodedName}`,
    );

    const stream = await this.fileService.getStreamById(fileId);

    stream.on('error', (err) => {
      console.error('Stream error:', err);

      if (!res.headersSent) {
        res.status(500).end('File streaming error');
      } else {
        res.destroy(err);
      }
    });

    stream.pipe(res);
  }
}
