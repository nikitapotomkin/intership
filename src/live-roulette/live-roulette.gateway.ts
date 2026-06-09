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
import { LiveRouletteService } from './services/live-roulette.service';
import { LiveRouletteRoomService } from './services/live-roulette-room.service';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { LivePlaceBetDto } from './dto/live-place-bet.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import Redis from 'ioredis';
import { SOCKET_ROOMS_KEY, SOCKET_ROOMS_TTL } from './live-roulette.constants';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/live-roulette',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class LiveRouletteGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => LiveRouletteService))
    private readonly liveService: LiveRouletteService,
    private readonly roomService: LiveRouletteRoomService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  sendToRoom<T>(roomId: string, event: string, data: T): void {
    this.server.to(roomId).emit(event, data);
  }

  handleConnection(client: Socket) {
    console.log(`LiveRoulette connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const rooms = await this.redis.smembers(SOCKET_ROOMS_KEY(client.id));

    await Promise.allSettled(
      rooms.map((roomId) => this.leaveRoom(client, roomId)),
    );

    await this.redis.del(SOCKET_ROOMS_KEY(client.id));
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

      const alreadyJoined = await this.redis.sismember(
        SOCKET_ROOMS_KEY(client.id),
        dto.roomId,
      );
      if (alreadyJoined) {
        client.emit('live_roulette:state', await this.roomService.getRoomState(dto.roomId));
        return;
      }

      client.join(dto.roomId);
      await this.redis.sadd(SOCKET_ROOMS_KEY(client.id), dto.roomId);
      await this.redis.expire(SOCKET_ROOMS_KEY(client.id), SOCKET_ROOMS_TTL);
      await this.roomService.incrementPlayerCount(dto.roomId);

      await this.liveService.startRoomLoop(dto.roomId);

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
    const wasJoined = await this.redis.srem(SOCKET_ROOMS_KEY(client.id), dto.roomId);
    if (wasJoined) {
      await this.leaveRoom(client, dto.roomId);
    }
  }

  @SubscribeMessage('live_roulette:place_bet')
  async onPlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LivePlaceBetDto,
  ) {
    const userId = client.data.user.id;

    const isJoined = await this.redis.sismember(
      SOCKET_ROOMS_KEY(client.id),
      dto.roomId,
    );

    if (!isJoined) {
      client.emit('live_roulette:error', { message: 'Join room first' });
      return;
    }

    try {
      await this.liveService.placeBet(userId, dto);
    } catch (err) {
      client.emit('live_roulette:error', {
        message: err instanceof Error ? err.message : 'Bet failed',
      });
    }
  }

  @SubscribeMessage('live_roulette:rooms')
  async onListRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = await this.roomService.listRooms();
      client.emit('live_roulette:rooms', rooms);
    } catch (err) {
      client.emit('live_roulette:error', { message: 'Failed to list rooms' });
    }
  }

  private async leaveRoom(client: Socket, roomId: string): Promise<void> {
    client.leave(roomId);
    await this.roomService.decrementPlayerCount(roomId);
  }
}