import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileRecord } from './interfaces/file-record.interface';
import { watch, FSWatcher } from 'fs';

interface Database {
  files: FileRecord[];
}

@Injectable()
export class FileRepository implements OnModuleInit, OnModuleDestroy {
  private readonly dbPath = path.resolve(process.cwd(), 'data', 'files.json');
  private db: Database = { files: [] };

  private writeQueue = Promise.resolve();
  private watcher: FSWatcher;
  private reloadTimeout: NodeJS.Timeout;

  async onModuleInit() {
    await fs.mkdir('data', { recursive: true });
    await this.load();

    this.watcher = watch(this.dbPath, () => {
      clearTimeout(this.reloadTimeout);
      this.reloadTimeout = setTimeout(() => this.load(), 50);
    });
  }

  onModuleDestroy() {
    this.watcher?.close();
  }

  private async load() {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      this.db = JSON.parse(raw);
    } catch {
      await this.persist();
    }
  }

  private async persist() {
    this.writeQueue = this.writeQueue.then(() =>
      fs.writeFile(this.dbPath, JSON.stringify(this.db, null, 2)),
    );
    return this.writeQueue;
  }

  async create(file: FileRecord) {
    this.db.files.push(file);
    await this.persist();
    return file;
  }

  async findById(id: string) {
    return this.db.files.find(f => f.id === id);
  }

  async findByUser(userId: string) {
    return this.db.files.filter(f => f.userId === userId);
  }

  async delete(id: string) {
    this.db.files = this.db.files.filter(f => f.id !== id);
    await this.persist();
  }

  async deleteByUser(userId: string) {
    this.db.files = this.db.files.filter(f => f.userId !== userId);
    await this.persist();
  }
}