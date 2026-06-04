import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import type { Redis } from 'ioredis';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomState } from './types';
import {
  ROOM_KEY,
  ROOMS_LIST_KEY,
  ROOM_STATE_TTL,
  ROOM_BETS_KEY,
} from './constants/live-roulette.constants';
import { LiveRouletteRoomRepository } from './repositories/live-roulette-room.repository';

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
        playerCount: 0,
        minBet: Number(room.minBet),
        maxBet: Number(room.maxBet),
        lastResult: null,
      };
      await this.saveRoomState(state);
      return state;
    }
    return JSON.parse(raw) as RoomState;
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

  async incrementPlayerCount(roomId: string): Promise<void> {
    const state = await this.getRoomState(roomId);
    state.playerCount = Math.max(0, state.playerCount + 1);
    await this.saveRoomState(state);
  }

  async decrementPlayerCount(roomId: string): Promise<void> {
    const state = await this.getRoomState(roomId);
    state.playerCount = Math.max(0, state.playerCount - 1);
    await this.saveRoomState(state);
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
    await this.redis.srem(ROOMS_LIST_KEY, roomId);

    await this.liveRouletteRoomRepository.delete(roomId);
  }
}
