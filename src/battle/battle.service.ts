import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import type { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import {
  BASE_STRIKE,
  BATTLE_ROOM_KEY,
  BATTLE_ROOM_TTL,
  BLOCK_REDUCTION,
  DUEL_REQUEST_COUNTER_KEY,
  DUEL_REQUEST_KEY,
  DUEL_REQUESTS_LIST_KEY,
  DUEL_REQUEST_TTL,
  INITIAL_HEALTH,
  MOVE_TIMEOUT_SECONDS,
  PLAYER_LOCK_KEY,
  ROOM_LOCK_KEY,
  PLAYER_ACTIVE_ROOM_KEY,
  DEFAULT_TTL_MS,
  RELEASE_SCRIPT,
  BATTLE_QUEUE,
  JobName,
} from './battle.constants';
import { BattleGateway } from './battle.gateway';
import { BattleRoom, DuelRequest, Move, RoundResult, Zone } from './types';
import { MakeMoveDto } from './dto/make-move.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BattleService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(forwardRef(() => BattleGateway))
    private readonly battleGateway: BattleGateway,
    @InjectQueue(BATTLE_QUEUE) private readonly battleQueue: Queue,
  ) {}

  async createDuelRequest(challengerId: number): Promise<DuelRequest> {
    return this.withLock(PLAYER_LOCK_KEY(challengerId), async () => {
      const existing = await this.getOpenRequestByChallenger(challengerId);
      if (existing) {
        throw new BadRequestException('You already have an open duel request');
      }

      await this.assertNotInBattle(challengerId);

      const id = await this.redis.incr(DUEL_REQUEST_COUNTER_KEY);

      const request: DuelRequest = {
        id,
        challengerId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await this.redis.setex(
        DUEL_REQUEST_KEY(id),
        DUEL_REQUEST_TTL,
        JSON.stringify(request),
      );
      await this.redis.zadd(DUEL_REQUESTS_LIST_KEY, Date.now(), String(id));

      return request;
    });
  }

  async listDuelRequests(): Promise<DuelRequest[]> {
    const ids = await this.redis.zrange(DUEL_REQUESTS_LIST_KEY, 0, -1);
    if (!ids.length) return [];

    const requests = await Promise.all(
      ids.map(async (id) => {
        const raw = await this.redis.get(DUEL_REQUEST_KEY(Number(id)));
        return raw ? (JSON.parse(raw) as DuelRequest) : null;
      }),
    );

    const valid = requests.filter(
      (r) => r !== null && r.status === 'pending',
    ) as DuelRequest[];

    const validIds = new Set(valid.map((r) => String(r.id)));
    const staleIds = ids.filter((id) => !validIds.has(id));
    if (staleIds.length) {
      await this.redis.zrem(DUEL_REQUESTS_LIST_KEY, ...staleIds);
    }

    return valid;
  }

  async acceptDuelRequest(
    requestId: number,
    opponentId: number,
  ): Promise<BattleRoom> {
    const request = await this.getDuelRequest(requestId);

    if (request.status !== 'pending') {
      throw new BadRequestException('Duel request is no longer pending');
    }
    if (request.challengerId === opponentId) {
      throw new BadRequestException('You cannot accept your own duel request');
    }

    const [firstId, secondId] =
      request.challengerId < opponentId
        ? [request.challengerId, opponentId]
        : [opponentId, request.challengerId];

    return this.withLock(PLAYER_LOCK_KEY(firstId), () =>
      this.withLock(PLAYER_LOCK_KEY(secondId), async () => {
        const fresh = await this.getDuelRequest(requestId);
        if (fresh.status !== 'pending') {
          throw new BadRequestException('Duel request is no longer pending');
        }

        await this.assertNotInBattle(opponentId);
        await this.assertNotInBattle(request.challengerId);

        const room = await this.createBattleRoom(
          request.challengerId,
          opponentId,
        );

        fresh.status = 'accepted';
        fresh.opponentId = opponentId;
        fresh.battleRoomId = room.id;

        await this.redis.setex(
          DUEL_REQUEST_KEY(requestId),
          DUEL_REQUEST_TTL,
          JSON.stringify(fresh),
        );
        await this.redis.zrem(DUEL_REQUESTS_LIST_KEY, String(requestId));

        this.scheduleAutoMove(room.id);
        return room;
      }),
    );
  }

  async rejectDuelRequest(requestId: number, userId: number): Promise<void> {
    const request = await this.getDuelRequest(requestId);

    if (request.challengerId !== userId) {
      throw new BadRequestException('You can only cancel your own request');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    request.status = 'rejected';
    await this.redis.setex(
      DUEL_REQUEST_KEY(requestId),
      60,
      JSON.stringify(request),
    );
    await this.redis.zrem(DUEL_REQUESTS_LIST_KEY, String(requestId));
  }

  async getBattleRoom(roomId: string): Promise<BattleRoom> {
    const raw = await this.redis.get(BATTLE_ROOM_KEY(roomId));
    if (!raw) throw new NotFoundException(`Battle room ${roomId} not found`);
    return JSON.parse(raw) as BattleRoom;
  }

  async getBattleRoomForUser(
    roomId: string,
    userId: number,
  ): Promise<BattleRoom> {
    const room = await this.getBattleRoom(roomId);

    if (room.player1Id !== userId && room.player2Id !== userId) {
      throw new ForbiddenException('You are not a participant of this battle');
    }

    return room;
  }

  async executeAutoMove(roomId: string): Promise<void> {
    await this.withLock(
      ROOM_LOCK_KEY(roomId),
      async () => {
        const room = await this.getBattleRoom(roomId).catch(() => null);
        if (!room || room.status === 'finished') return;
 
        const randomZone = (): Zone => {
          const zones: Zone[] = ['head', 'body', 'legs'];
          return zones[Math.floor(Math.random() * zones.length)];
        };
 
        if (!room.player1PendingMove) {
          room.player1PendingMove = {
            attackZone: randomZone(),
            defenseZone: randomZone(),
          };
        }
        if (!room.player2PendingMove) {
          room.player2PendingMove = {
            attackZone: randomZone(),
            defenseZone: randomZone(),
          };
        }
 
        await this.saveBattleRoom(room);

        await this.resolveRound(roomId);
      },
      { ttlMs: 5_000, retries: 10, retryMs: 100 },
    );
  }

  async makeMove(
    roomId: string,
    userId: number,
    dto: MakeMoveDto,
  ): Promise<void> {
    await this.withLock(
      ROOM_LOCK_KEY(roomId),
      async () => {
        const room = await this.getBattleRoom(roomId);

        if (room.status === 'finished') {
          throw new BadRequestException('Battle is already finished');
        }

        const isPlayer1 = room.player1Id === userId;
        const isPlayer2 = room.player2Id === userId;

        if (!isPlayer1 && !isPlayer2) {
          throw new BadRequestException(
            'You are not a participant of this battle',
          );
        }

        if (isPlayer1 && room.player1PendingMove) {
          throw new BadRequestException(
            'You already submitted a move this round',
          );
        }
        if (isPlayer2 && room.player2PendingMove) {
          throw new BadRequestException(
            'You already submitted a move this round',
          );
        }

        const pendingMove = {
          attackZone: dto.attackZone,
          defenseZone: dto.defenseZone,
        };
        if (isPlayer1) room.player1PendingMove = pendingMove;
        else room.player2PendingMove = pendingMove;

        await this.saveBattleRoom(room);

        if (room.player1PendingMove && room.player2PendingMove) {
          this.cancelAutoMove(room.id);
          setImmediate(() => this.resolveRoundLocked(room.id));
        }
      },
      { ttlMs: 3_000, retries: 15, retryMs: 50 },
    );
  }

  private async resolveRoundLocked(roomId: string): Promise<void> {
    await this.withLock(
      ROOM_LOCK_KEY(roomId),
      () => this.resolveRound(roomId),
      { ttlMs: 5_000, retries: 10, retryMs: 100 },
    );
  }

  private async resolveRound(roomId: string): Promise<void> {
    const room = await this.getBattleRoom(roomId);

    if (!room.player1PendingMove || !room.player2PendingMove) return;
    if (room.status === 'finished') return;

    const p1Move = room.player1PendingMove;
    const p2Move = room.player2PendingMove;

    const move1: Move = {
      playerId: room.player1Id,
      attackZone: p1Move.attackZone as Zone,
      defenseZone: p1Move.defenseZone as Zone,
      health: room.player1Health,
      strike: BASE_STRIKE,
    };
    const move2: Move = {
      playerId: room.player2Id,
      attackZone: p2Move.attackZone as Zone,
      defenseZone: p2Move.defenseZone as Zone,
      health: room.player2Health,
      strike: BASE_STRIKE,
    };

    const p1Blocked = move1.defenseZone === move2.attackZone;
    const p2Blocked = move2.defenseZone === move1.attackZone;

    const damageToP1 = p1Blocked
      ? Math.max(0, move2.strike - BLOCK_REDUCTION)
      : move2.strike;
    const damageToP2 = p2Blocked
      ? Math.max(0, move1.strike - BLOCK_REDUCTION)
      : move1.strike;

    const p1HealthAfter = Math.max(0, room.player1Health - damageToP1);
    const p2HealthAfter = Math.max(0, room.player2Health - damageToP2);

    const roundResult: RoundResult = {
      round: room.currentRound,
      player1Move: move1,
      player2Move: move2,
      player1HealthAfter: p1HealthAfter,
      player2HealthAfter: p2HealthAfter,
      player1Blocked: p1Blocked,
      player2Blocked: p2Blocked,
    };

    room.player1Health = p1HealthAfter;
    room.player2Health = p2HealthAfter;
    room.rounds.push(roundResult);
    room.currentRound++;
    room.player1PendingMove = null;
    room.player2PendingMove = null;

    const isFinished = p1HealthAfter <= 0 || p2HealthAfter <= 0;

    if (isFinished) {
      room.status = 'finished';

      if (p1HealthAfter <= 0 && p2HealthAfter <= 0) {
        room.winnerId = null;
        room.isDraw = true;
      } else if (p1HealthAfter <= 0) {
        room.winnerId = room.player2Id;
      } else {
        room.winnerId = room.player1Id;
      }

      await Promise.all([
        this.redis.del(PLAYER_ACTIVE_ROOM_KEY(room.player1Id)),
        this.redis.del(PLAYER_ACTIVE_ROOM_KEY(room.player2Id)),
      ]);
    }

    await this.saveBattleRoom(room);

    this.battleGateway.sendToRoom(room.id, 'battle:round_result', {
      roomId: room.id,
      player1Health: p1HealthAfter,
      player2Health: p2HealthAfter,
      currentRound: room.currentRound,
      status: room.status,
      lastRound: roundResult,
      winnerId: room.winnerId ?? null,
      isDraw: room.isDraw ?? false,
    });

    if (!isFinished) {
      this.scheduleAutoMove(room.id);
    }
  }

  async forfeit(roomId: string, userId: number): Promise<void> {
    await this.withLock(ROOM_LOCK_KEY(roomId), async () => {
      const room = await this.getBattleRoom(roomId).catch(() => null);
      if (!room || room.status === 'finished') return;

      const isParticipant =
        room.player1Id === userId || room.player2Id === userId;
      if (!isParticipant) return;

      this.cancelAutoMove(roomId);

      room.status = 'finished';
      room.isDraw = false;

      if (room.forfeitedBy) {
        room.winnerId = userId;
      } else {
        room.forfeitedBy = userId;
        room.winnerId =
          room.player1Id === userId ? room.player2Id : room.player1Id;
      }

      await Promise.all([
        this.saveBattleRoom(room),
        this.redis.del(PLAYER_ACTIVE_ROOM_KEY(room.player1Id)),
        this.redis.del(PLAYER_ACTIVE_ROOM_KEY(room.player2Id)),
      ]);

      this.battleGateway.sendToRoom(roomId, 'battle:forfeit', {
        roomId,
        forfeitedBy: userId,
        winnerId: room.winnerId,
        status: room.status,
      });
    });
  }

  private async scheduleAutoMove(roomId: string): Promise<void> {
    await this.cancelAutoMove(roomId);

    const ts = Date.now();

    for (let tick = 1; tick <= MOVE_TIMEOUT_SECONDS; tick++) {
      await this.battleQueue.add(
        JobName.AUTO_MOVE_TICK,
        { roomId, timeLeft: MOVE_TIMEOUT_SECONDS - tick },
        { delay: tick * 1_000, jobId: `timer-${roomId}-${tick}-${ts}` },
      );
    }
    await this.battleQueue.add(
      JobName.AUTO_MOVE,
      { roomId },
      { delay: MOVE_TIMEOUT_SECONDS * 1_000, jobId: `auto-move-${roomId}-${ts}` },
    );
  }

  async cancelAutoMove(roomId: string): Promise<void> {
    const jobs = await this.battleQueue.getJobs(['delayed', 'waiting']);
    await Promise.all(
      jobs.filter((j) => j.data?.roomId === roomId).map((j) => j.remove()),
    );
  }
  

  private async createBattleRoom(
    player1Id: number,
    player2Id: number,
  ): Promise<BattleRoom> {
    const room: BattleRoom = {
      id: randomUUID(),
      player1Id,
      player2Id,
      status: 'active',
      createdAt: new Date().toISOString(),
      player1Health: INITIAL_HEALTH,
      player2Health: INITIAL_HEALTH,
      player1PendingMove: null,
      player2PendingMove: null,
      rounds: [],
      currentRound: 1,
      winnerId: null,
      isDraw: false,
    };

    await this.saveBattleRoom(room);

    await Promise.all([
      this.redis.setex(
        PLAYER_ACTIVE_ROOM_KEY(player1Id),
        BATTLE_ROOM_TTL,
        room.id,
      ),
      this.redis.setex(
        PLAYER_ACTIVE_ROOM_KEY(player2Id),
        BATTLE_ROOM_TTL,
        room.id,
      ),
    ]);

    return room;
  }

  private async saveBattleRoom(room: BattleRoom): Promise<void> {
    await this.redis.setex(
      BATTLE_ROOM_KEY(room.id),
      BATTLE_ROOM_TTL,
      JSON.stringify(room),
    );
  }

  async getActiveRoomId(userId: number): Promise<string | null> {
    const roomId = await this.redis.get(PLAYER_ACTIVE_ROOM_KEY(userId));
    if (!roomId) return null;

    const raw = await this.redis.get(BATTLE_ROOM_KEY(roomId));
    if (!raw) {
      await this.redis.del(PLAYER_ACTIVE_ROOM_KEY(userId));
      return null;
    }

    const room = JSON.parse(raw) as BattleRoom;
    if (room.status === 'finished') {
      await this.redis.del(PLAYER_ACTIVE_ROOM_KEY(userId));
      return null;
    }

    return roomId;
  }

  private async getDuelRequest(id: number): Promise<DuelRequest> {
    const raw = await this.redis.get(DUEL_REQUEST_KEY(id));
    if (!raw) throw new NotFoundException(`Duel request #${id} not found`);
    return JSON.parse(raw) as DuelRequest;
  }

  private async getOpenRequestByChallenger(
    challengerId: number,
  ): Promise<DuelRequest | null> {
    const requests = await this.listDuelRequests();
    return requests.find((r) => r.challengerId === challengerId) ?? null;
  }

  private async assertNotInBattle(userId: number): Promise<void> {
    const activeRoomId = await this.redis.get(PLAYER_ACTIVE_ROOM_KEY(userId));

    if (!activeRoomId) return;

    const raw = await this.redis.get(BATTLE_ROOM_KEY(activeRoomId));
    if (!raw) {
      await this.redis.del(PLAYER_ACTIVE_ROOM_KEY(userId));
      return;
    }

    const room = JSON.parse(raw) as BattleRoom;
    if (room.status === 'finished') {
      await this.redis.del(PLAYER_ACTIVE_ROOM_KEY(userId));
      return;
    }

    throw new BadRequestException('You are already in an active battle');
  }

  async acquireLock(
    key: string,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<string | null> {
    const token = `${Date.now()}-${Math.random()}`;
    const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    await this.redis.eval(RELEASE_SCRIPT, 1, key, token);
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttlMs?: number; retries?: number; retryMs?: number } = {},
  ): Promise<T> {
    const { ttlMs = DEFAULT_TTL_MS, retries = 10, retryMs = 100 } = options;

    let token: string | null = null;
    for (let i = 0; i < retries; i++) {
      token = await this.acquireLock(key, ttlMs);
      if (token) break;
      await new Promise((r) => setTimeout(r, retryMs));
    }

    if (!token) {
      throw new Error(`withLock: failed to acquire lock — key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }
}
