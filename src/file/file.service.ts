import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { FileRepository } from './file.repository';
import { UserRepository } from 'src/user/user.repository';
import { FileRecord } from './interfaces/file-record.interface';
import { UserRecord } from 'src/common/interfaces/user-record.interface';
import { join } from 'path';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly uploadDir = join('data', 'uploads');
  private readonly tempDir = join('temp');

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async onModuleInit() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async upload(user: UserRecord, file: Express.Multer.File) {
    const dbUser = await this.userRepository.findById(user.id);

    if (!dbUser) throw new NotFoundException();

    const available = dbUser.quotaBytes - dbUser.usedBytes;

    if (file.size > available) {
      throw new BadRequestException('Quota exceeded');
    }

    const originalName = this.fixEncoding(file.originalname);
    const safeName = this.safeName(originalName);
    const storedName = `${randomUUID()}-${safeName}`;
    const dest = `${this.uploadDir}/${storedName}`;

    await this.moveFile(file.path, dest);

    const record: FileRecord = {
      id: randomUUID(),
      userId: user.id,
      originalName,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };

    try {
      await this.fileRepository.create(record);

      dbUser.usedBytes += file.size;
      await this.userRepository.update(dbUser);

      return record;
    } catch (e) {
      await this.safeDelete(dest);
      throw e;
    }
  }

  async findByUser(user: UserRecord): Promise<FileRecord[]> {
    return this.fileRepository.findByUser(user.id);
  }

  safeName(name: string) {
    return name
      .replace(/[^a-zA-Z0-9._\-а-яА-ЯіІїЇєЄ\u0400-\u04FF]/gu, '_')
      .replace(/\.\.+/g, '.');
  }

  async findOne(user: UserRecord, fileId: string) {
    const file = await this.fileRepository.findById(fileId);

    if (!file) throw new NotFoundException();

    if (file.userId !== user.id) {
      throw new ForbiddenException();
    }

    return file;
  }

  private fixEncoding(name: string): string {
    try {
      return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
      return name;
    }
  }

  async getStream(user: UserRecord, fileId: string) {
    const file = await this.findOne(user, fileId);

    return createReadStream(`${this.uploadDir}/${file.storedName}`);
  }

  async delete(user: UserRecord, fileId: string) {
    const file = await this.findOne(user, fileId);

    await this.fileRepository.delete(file.id);
    await this.safeDelete(`${this.uploadDir}/${file.storedName}`);

    const dbUser = await this.userRepository.findById(user.id);

    if (dbUser) {
      dbUser.usedBytes = Math.max(0, dbUser.usedBytes - file.sizeBytes);
      await this.userRepository.update(dbUser);
    }
  }

  private async moveFile(src: string, dest: string) {
    try {
      await fs.rename(src, dest);
    } catch {
      await pipeline(createReadStream(src), createWriteStream(dest));
      await fs.unlink(src);
    }
  }

  private async safeDelete(path: string) {
    try {
      await fs.unlink(path);
    } catch {}
  }

  async deleteAllByUser(userId: string) {
  const files = await this.fileRepository.findByUser(userId);

  for (const file of files) {
    this.safeDelete(join(this.uploadDir,file.storedName))
  }

  await this.fileRepository.deleteByUser(userId);

}
}
