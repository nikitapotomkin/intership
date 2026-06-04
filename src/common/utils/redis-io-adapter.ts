import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  constructor(
    app,
    private readonly pubClient,
    private readonly subClient,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: any): Server {
    const server = super.createIOServer(port, options);

    server.adapter(
      createAdapter(this.pubClient, this.subClient),
    );

    return server;
  }
}