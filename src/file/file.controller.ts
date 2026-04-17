import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as multer from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { FileService } from './file.service';
import { pipeline } from 'stream/promises';
import { UserRecord } from 'src/common/interfaces/user-record.interface';
import { join } from 'path';

const tempStorage = multer.diskStorage({
  destination: join(process.cwd(), 'temp'),
  filename: (_req, file, cb) =>
    cb(null, `tmp-${Date.now()}-${file.originalname}`),
});

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  @UseGuards(AuthGuard)
  async findByUser(@CurrentUser() currentUser: UserRecord) {
    return this.fileService.findByUser(currentUser);
  }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: tempStorage }))
  async upload(
    @CurrentUser() currentUser: UserRecord,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.fileService.upload(currentUser, file);
  }

  @UseGuards(AuthGuard)
  @Get(':fileId')
  async findOne(
    @CurrentUser() currentUser: UserRecord,
    @Param('fileId') fileId: string,
  ) {
    return this.fileService.findOne(currentUser, fileId);
  }

  @UseGuards(AuthGuard)
  @Get(':fileId/download')
  async download(
    @CurrentUser() user: UserRecord,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.fileService.findOne(user, fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );

    const stream = await this.fileService.getStream(user, fileId);

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

  @UseGuards(AuthGuard)
  @Delete(':fileId')
  async delete(
    @CurrentUser() currentUser: UserRecord,
    @Param('fileId') fileId: string,
  ) {
    await this.fileService.delete(currentUser, fileId);

    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Get(':fileId/view')
  async view(
    @CurrentUser() user: UserRecord,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.fileService.findOne(user, fileId);

    const inlineTypes = ['image/', 'application/pdf', 'text/', 'video/'];
    const isInline = inlineTypes.some((type) => file.mimeType.startsWith(type));

    const disposition = isInline ? 'inline' : 'attachment';
    const encodedName = encodeURIComponent(file.originalName);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodedName}`,
    );

    const stream = await this.fileService.getStream(user, fileId);

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
