import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, UseGuards } from '@nestjs/common';
import { LiveRouletteService } from './live-roulette.service';
import { LiveRouletteRoomService } from './live-roulette-room.service';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { LivePlaceBetDto } from './dto/live-place-bet.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { REDIS_CLIENT, REDIS_PUB, REDIS_SUB } from 'src/redis/redis.module';
import Redis from 'ioredis';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/live-roulette',
  cors: {
    origin: true, //process.env.ALLOWED_ORIGIN_ALL?.split(','),
    credentials: true,
  },
})
@Injectable()
export class LiveRouletteGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(forwardRef(() => LiveRouletteService))
    private readonly liveService: LiveRouletteService,
    private readonly roomService: LiveRouletteRoomService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_PUB) private readonly pubClient: Redis,
    @Inject(REDIS_SUB) private readonly subClient: Redis,
  ) {}

  @WebSocketServer()
  server: Server;

  sendToRoom(room: string, event: string, message: any) {
    this.server.to(room).emit(event, message);
  }

  async handleConnection() {
    console.log('Connected successfully to WS!');
  }

  async handleDisconnect(client: Socket) {
    const rooms = await this.redis.smembers(`socket:rooms:${client.id}`);
    for (const roomId of rooms) {
      await this.leaveRoom(client, roomId);
    }
    await this.redis.del(`socket:rooms:${client.id}`);
  }

  @SubscribeMessage('live_roulette:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    try {
      const state = await this.roomService.getRoomState(dto.roomId);

      if (!state.isActive) {
        client.emit('live_roulette:error', { message: 'Room is not active' });
        return;
      }
      
      client.join(dto.roomId);
      await this.redis.sadd(`socket:rooms:${client.id}`, dto.roomId);
      await this.redis.expire(`socket:rooms:${client.id}`, 3600);
      await this.roomService.incrementPlayerCount(dto.roomId);

      this.liveService.startRoomLoop(dto.roomId);

      client.emit(
        'live_roulette:state',
        await this.roomService.getRoomState(dto.roomId),
      );
    } catch (err) {
      client.emit('live_roulette:error', {
        message: err instanceof Error ? err.message : 'Failed to join room',
      });
    }
  }

  @SubscribeMessage('live_roulette:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LeaveRoomDto,
  ) {
    await this.redis.srem(`socket:rooms:${client.id}`, dto.roomId);
    await this.leaveRoom(client, dto.roomId);
  }

  @SubscribeMessage('live_roulette:place_bet')
  async onPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LivePlaceBetDto,
  ) {
    const userId = client.data.user.id;

    try {
      await this.liveService.placeBet(userId, dto);
    } catch (err) {
      client.emit('live_roulette:error', {
        message: err instanceof Error ? err.message : 'bet Failed',
      });
    }
  }

  @SubscribeMessage('live_roulette:rooms')
  async onListRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms;
    } catch (err) {
      client.emit('live_roulette:error', { message: 'Failed to list rooms' });
    }
  }

  private async leaveRoom(client: Socket, roomId: string): Promise<void> {
    client.leave(roomId);
    await this.roomService.decrementPlayerCount(roomId);
  }
}
