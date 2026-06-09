import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import type { Redis } from 'ioredis';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomState } from '../types';
import {
  ROOM_KEY,
  ROOMS_LIST_KEY,
  ROOM_STATE_TTL,
  ROOM_BETS_KEY,
  ROOM_PLAYER_COUNT_KEY,
} from '../live-roulette.constants';
import { LiveRouletteRoomRepository } from '../repositories/live-roulette-room.repository';

@Injectable()
export class LiveRouletteRoomService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly liveRouletteRoomRepository: LiveRouletteRoomRepository,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<RoomState> {
    if (dto.minBet >= dto.maxBet) {
      throw new BadRequestException('minBet must be less than maxBet');
    }

    const room = await this.liveRouletteRoomRepository.create({
      data: {
        name: dto.name,
        minBet: dto.minBet,
        maxBet: dto.maxBet,
      },
    });

    const state: RoomState = {
      roomId: room.id,
      name: room.name,
      phase: 'WAITING',
      isActive: true,
      timeLeft: 0,
      currentRoundId: null,
      playerCount: 0,
      minBet: dto.minBet,
      maxBet: dto.maxBet,
      lastResult: null,
    };

    await this.saveRoomState(state);
    await this.redis.set(ROOM_PLAYER_COUNT_KEY(room.id), 0);
    await this.redis.sadd(ROOMS_LIST_KEY, room.id);

    return state;
  }

  async getRoomState(roomId: string): Promise<RoomState> {
    const raw = await this.redis.get(ROOM_KEY(roomId));

    if (!raw) {
      const room = await this.liveRouletteRoomRepository.findUnique({
        where: { id: roomId },
      });
      if (!room) throw new NotFoundException(`Room ${roomId} not found`);

      const state: RoomState = {
        roomId: room.id,
        name: room.name,
        isActive: room.isActive,
        phase: 'WAITING',
        timeLeft: 0,
        currentRoundId: null,
        playerCount: await this.getPlayerCount(roomId),
        minBet: Number(room.minBet),
        maxBet: Number(room.maxBet),
        lastResult: null,
      };
      await this.saveRoomState(state);
      return state;
    }

    const state = JSON.parse(raw) as RoomState;
    state.playerCount = await this.getPlayerCount(roomId);
    return state;
  }

  async saveRoomState(state: RoomState): Promise<void> {
    await this.redis.setex(
      ROOM_KEY(state.roomId),
      ROOM_STATE_TTL,
      JSON.stringify(state),
    );
  }

  async listRooms(): Promise<RoomState[]> {
    const roomIds = await this.redis.smembers(ROOMS_LIST_KEY);
    if (!roomIds.length) return [];

    const states = await Promise.all(
      roomIds.map((id) =>
        this.redis
          .get(ROOM_KEY(id))
          .then((raw) => (raw ? (JSON.parse(raw) as RoomState) : null)),
      ),
    );

    return states.filter(Boolean) as RoomState[];
  }

  async incrementPlayerCount(roomId: string): Promise<number> {
    const count = await this.redis.incr(ROOM_PLAYER_COUNT_KEY(roomId));
    return count;
  }

  async decrementPlayerCount(roomId: string): Promise<number> {
    const script = `
      local val = redis.call("decr", KEYS[1])
      if val < 0 then
        redis.call("set", KEYS[1], 0)
        return 0
      end
      return val
    `;
    const count = await this.redis.eval(
      script,
      1,
      ROOM_PLAYER_COUNT_KEY(roomId),
    ) as number;
    return count;
  }

  async getPlayerCount(roomId: string): Promise<number> {
    const val = await this.redis.get(ROOM_PLAYER_COUNT_KEY(roomId));
    return val ? parseInt(val) : 0;
  }

  async deactivateRoom(roomId: string): Promise<void> {
    const room = await this.liveRouletteRoomRepository.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);

    await this.liveRouletteRoomRepository.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    const state = await this.getRoomState(roomId);
    state.phase = 'WAITING';
    state.isActive = false;
    await this.saveRoomState(state);

    await this.redis.srem(ROOMS_LIST_KEY, roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const room = await this.liveRouletteRoomRepository.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);

    await this.redis.del(ROOM_KEY(roomId));
    await this.redis.del(ROOM_BETS_KEY(roomId));
    await this.redis.del(ROOM_PLAYER_COUNT_KEY(roomId));
    await this.redis.srem(ROOMS_LIST_KEY, roomId);

    await this.liveRouletteRoomRepository.delete(roomId);
  }
}
