import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BattleService } from './battle.service';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';
import { BATTLE_QUEUE, DISCONNECT_GRACE_MS, FOR_FEIT_JOB_Id, JobName } from './battle.constants';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/battle',
  cors: { origin: true, credentials: true },
})
export class BattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => BattleService))
    private readonly battleService: BattleService,
    @InjectQueue(BATTLE_QUEUE) private readonly battleQueue: Queue,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.data?.user?.id;
    if (!userId) return;

    const job = await this.battleQueue.getJob(FOR_FEIT_JOB_Id(userId));
    if (job) await job.remove();
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.user?.id;
    if (!userId) return;

    const roomId = await this.battleService.getActiveRoomId(userId);
    if (!roomId) return;

    await this.battleQueue.add(
      JobName.FORFEIT,
      { roomId, userId },
      {
        delay: DISCONNECT_GRACE_MS,
        jobId: FOR_FEIT_JOB_Id(userId),
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  @SubscribeMessage('battle:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ) {
    try {
      const userId = client.data.user.id;

      const room = await this.battleService.getBattleRoomForUser(
        roomId,
        userId,
      );
      client.join(roomId);

      client.emit('battle:state', {
        roomId: room.id,
        player1Health: room.player1Health,
        player2Health: room.player2Health,
        currentRound: room.currentRound,
        status: room.status,
        winnerId: room.winnerId,
      });
    } catch (err) {
      client.emit('battle:error', {
        message: err instanceof Error ? err.message : 'Failed to join room',
      });
    }
  }

  @SubscribeMessage('battle:leave')
  onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ) {
    client.leave(roomId);
  }

  sendToRoom<T>(roomId: string, event: string, data: T): void {
    this.server.to(roomId).emit(event, data);
  }
}
