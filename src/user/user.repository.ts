import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { UserRecord } from 'src/common/interfaces/user-record.interface';
import { watch, FSWatcher } from 'fs';

interface Database {
  users: UserRecord[];
}

@Injectable()
export class UserRepository implements OnModuleInit, OnModuleDestroy {
  private readonly dbPath = path.resolve(process.cwd(), 'data', 'users.json');
  private db: Database = { users: [] };

  private writeQueue = Promise.resolve();
  private watcher: FSWatcher;

  async onModuleInit() {
    await fs.mkdir('data', { recursive: true });
    await this.load();

    this.watcher = watch(this.dbPath, async (eventType) => {
      if (eventType === 'change') {
        await this.load();
      }
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

  async create(user: UserRecord) {
    this.db.users.push(user);
    await this.persist();
    return user;
  }

  async findById(id: string) {
    return this.db.users.find(u => u.id === id);
  }

  async findByEmail(email: string) {
    return this.db.users.find(u => u.email === email);
  }

  async findAll() {
    return this.db.users;
  }

  async update(user: UserRecord) {
    const i = this.db.users.findIndex(u => u.id === user.id);
    if (i !== -1) {
      this.db.users[i] = user;
      await this.persist();
    }
  }

  async delete(id: string) {
    this.db.users = this.db.users.filter(u => u.id !== id);
    await this.persist();
  }
}