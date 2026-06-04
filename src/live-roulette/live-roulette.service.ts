import {
  Injectable,
  Inject,
  BadRequestException,
  OnModuleDestroy,
  forwardRef,
} from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import type { Redis } from 'ioredis';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { LiveRouletteRoomService } from './live-roulette-room.service';
import { LivePlaceBetDto } from './dto/live-place-bet.dto';
import {
  RoomState,
  RoomBetEntry,
  WinnerEntry,
  WsSpinResultEvent,
  SpinResult,
} from './types';
import {
  BETTING_PHASE_SECONDS,
  SPINNING_PHASE_SECONDS,
  RESULTS_PHASE_SECONDS,
  ROOM_BETS_KEY,
  RED_NUMBERS,
  ROULETTE_NUMBERS_COUNT,
} from './constants/live-roulette.constants';
import { createHash, createHmac, randomBytes } from 'crypto';
import { RouletteRoundRepository } from './repositories/roulette-round.repository';
import { GameSessionRepository } from './repositories/game-session.repository';
import { LiveRouletteGateway } from './live-roulette.gateway';
import { TransactionType } from '@prisma/client';

@Injectable()
export class LiveRouletteService implements OnModuleDestroy {
  private readonly roomTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,

    @Inject(forwardRef(() => LiveRouletteGateway))
    private readonly liveRouletteGateway: LiveRouletteGateway,
    private readonly liveRouletteRoomService: LiveRouletteRoomService,
    private readonly rouletteRoundRepository: RouletteRoundRepository,
    private readonly gameSessionRepository: GameSessionRepository,
  ) {}

  onModuleDestroy() {
    for (const [roomId, timer] of this.roomTimers) {
      clearInterval(timer);
    }
  }

  async startRoomLoop(roomId: string): Promise<void> {
    if (this.roomTimers.has(roomId)) return;

    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    if (!state.isActive) return;

    const acquired = await this.acquireRoomLock(roomId);
    if (!acquired) return;

    this.beginBettingPhase(roomId);
  }

  stopRoomLoop(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
      this.releaseRoomLock(roomId);
    }
  }

  private scheduleNext(
    roomId: string,
    delayMs: number,
    fn: () => Promise<void>,
  ): void {
    const timer = setTimeout(async () => {
      this.roomTimers.delete(roomId);
      try {
        await fn();
      } catch (err) {
        this.scheduleNext(roomId, 5_000, () => this.beginBettingPhase(roomId));
      }
    }, delayMs);
    this.roomTimers.set(roomId, timer);
  }

  private async beginBettingPhase(roomId: string): Promise<void> {
    await this.renewRoomLock(roomId);
    await this.redis.del(ROOM_BETS_KEY(roomId));

    const roundId = await this.createRoundForRoom(roomId);

    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'BETTING';
    state.timeLeft = BETTING_PHASE_SECONDS;
    state.currentRoundId = roundId;
    await this.liveRouletteRoomService.saveRoomState(state);

    this.broadcastState(roomId, state);
    this.runCountdown(roomId, BETTING_PHASE_SECONDS, () =>
      this.beginSpinningPhase(roomId),
    );
  }

  private async beginSpinningPhase(roomId: string): Promise<void> {
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'SPINNING';
    state.timeLeft = SPINNING_PHASE_SECONDS;
    await this.liveRouletteRoomService.saveRoomState(state);

    this.broadcastState(roomId, state);

    const spinPayload = await this.doSpin(roomId, state.currentRoundId!);

    this.scheduleNext(roomId, SPINNING_PHASE_SECONDS * 1_000, () =>
      this.beginResultsPhase(roomId, spinPayload),
    );
  }

  private async beginResultsPhase(
    roomId: string,
    spinResult: WsSpinResultEvent,
  ): Promise<void> {
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'RESULTS';
    state.timeLeft = RESULTS_PHASE_SECONDS;
    state.lastResult = { number: spinResult.number, color: spinResult.color };
    state.currentRoundId = null;
    await this.liveRouletteRoomService.saveRoomState(state);

    this.broadcastState(roomId, state);
    this.liveRouletteGateway.sendToRoom(
      roomId,
      'live_roulette:result',
      spinResult,
    );

    this.scheduleNext(roomId, RESULTS_PHASE_SECONDS * 1_000, () =>
      this.beginBettingPhase(roomId),
    );
  }

  private runCountdown(
    roomId: string,
    seconds: number,
    onDone: () => Promise<void>,
  ): void {
    let remaining = seconds;

    const tick = async () => {
      remaining--;
      if (remaining <= 0) {
        await onDone();
        return;
      }

      this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:timer', {
        timeLeft: remaining,
      });

      const timer = setTimeout(tick, 1_000);
      this.roomTimers.set(roomId, timer);
    };

    const timer = setTimeout(tick, 1_000);
    this.roomTimers.set(roomId, timer);
  }

  async placeBet(userId: number, dto: LivePlaceBetDto): Promise<void> {
    const state = await this.liveRouletteRoomService.getRoomState(dto.roomId);

    if (!state.isActive) {
      throw new BadRequestException('Room is not active');
    }

    if (state.phase !== 'BETTING') {
      throw new BadRequestException(
        'Bets are only accepted during the BETTING phase',
      );
    }
    if (dto.amount < state.minBet) {
      throw new BadRequestException(`Minimum bet is ${state.minBet}`);
    }
    if (dto.amount > state.maxBet) {
      throw new BadRequestException(`Maximum bet is ${state.maxBet}`);
    }

    const bet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rouletteBet.create({
        data: {
          roundId: state.currentRoundId!,
          userId,
          betType: dto.betType,
          betValue: dto.betValue,
          amount: new Decimal(dto.amount),
        },
      });
      await this.walletService.deductBet(
        tx,
        userId,
        new Decimal(dto.amount),
        TransactionType.ROULETTE_BET,
      );
      return created;
    });

    const entry: RoomBetEntry = {
      userId,
      betType: dto.betType,
      betValue: dto.betValue,
      amount: dto.amount,
      betId: bet.id,
    };
    await this.redis.rpush(ROOM_BETS_KEY(dto.roomId), JSON.stringify(entry));

    this.liveRouletteGateway.sendToRoom(
      dto.roomId,
      'live_roulette:bet_placed',
      {
        userId,
        betType: dto.betType,
        betValue: dto.betValue,
        amount: dto.amount,
      },
    );
  }

  private async createRoundForRoom(roomId: string): Promise<string> {
    const serverSeed = this.generateServerSeed();
    const serverHash = this.hashServerSeed(serverSeed);
    const clientSeed = `room-${roomId}`;

    const session = await this.gameSessionRepository.create({
      data: {
        liveRoomId: roomId,
        serverSeed,
        serverHash,
        clientSeed,
        nonce: 0,
      },
    });

    const round = await this.rouletteRoundRepository.create({
      data: {
        gameSessionId: session.id,
        status: 'PENDING',
      },
    });

    return round.id;
  }

  private async doSpin(
    roomId: string,
    roundId: string,
  ): Promise<WsSpinResultEvent> {
    const round = await this.rouletteRoundRepository.findUnique({
      where: { id: roundId },
      include: { gameSession: true },
    });

    if (!round) throw new Error(`Round ${roundId} not found`);

    const session = round.gameSession;
    const result = this.computeSpin(
      session.serverSeed,
      session.clientSeed ?? 'default',
      session.nonce,
    );

    const rawBets = await this.redis.lrange(ROOM_BETS_KEY(roomId), 0, -1);
    const bets: RoomBetEntry[] = rawBets.map((r) => JSON.parse(r));

    const winners: WinnerEntry[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.rouletteRound.update({
        where: { id: roundId },
        data: {
          status: 'FINISHED',
          winningNumber: result.number,
          winningColor: result.color,
          finishedAt: new Date(),
        },
      });

      const userBetsMap = new Map<number, WinnerEntry>();

      for (const bet of bets) {
        const payout = this.calculatePayout(
          bet.betType,
          bet.betValue,
          bet.amount,
          result,
        );
        const isWin = payout > 0;

        await tx.rouletteBet.update({
          where: { id: bet.betId },
          data: { payout: new Decimal(payout), isWin },
        });

        if (isWin) {
          await this.walletService.creditWin(
            tx,
            bet.userId,
            new Decimal(payout),
            TransactionType.ROULETTE_WIN,
          );
        }

        if (!userBetsMap.has(bet.userId)) {
          userBetsMap.set(bet.userId, {
            userId: bet.userId,
            payout: 0,
            bets: [],
          });
        }
        const entry = userBetsMap.get(bet.userId)!;
        entry.payout += payout;
        entry.bets.push({ betId: bet.betId, isWin, payout });
      }

      winners.push(...[...userBetsMap.values()].filter((w) => w.payout > 0));

      await tx.gameSession.update({
        where: { id: session.id },
        data: { isRevealed: true, nonce: { increment: 1 } },
      });
    });

    return { ...result, winners };
  }

  private broadcastState(roomId: string, state: RoomState): void {
    this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:state', state);
  }

  generateServerSeed(): string {
    return randomBytes(32).toString('hex');
  }

  hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex');
  }

  computeSpin(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): SpinResult {
    const message = `${clientSeed}:${nonce}`;
    const hmac = createHmac('sha256', serverSeed).update(message).digest('hex');

    const decimal = parseInt(hmac.slice(0, 8), 16);
    const number = decimal % ROULETTE_NUMBERS_COUNT;

    let color: 'red' | 'black' | 'green';
    if (number === 0) color = 'green';
    else if (RED_NUMBERS.has(number)) color = 'red';
    else color = 'black';

    return { number, color };
  }

  calculatePayout(
    betType: string,
    betValue: string,
    amount: number,
    result: SpinResult,
  ): number {
    const { number, color } = result;

    switch (betType) {
      case 'NUMBER':
        return parseInt(betValue) === number ? amount * 36 : 0;

      case 'COLOR':
        return betValue === color ? amount * 2 : 0;

      case 'ODD_EVEN': {
        if (number === 0) return 0;
        const isOdd = number % 2 !== 0;
        return (betValue === 'odd' && isOdd) || (betValue === 'even' && !isOdd)
          ? amount * 2
          : 0;
      }

      case 'HIGH_LOW': {
        if (number === 0) return 0;
        const isLow = number >= 1 && number <= 18;
        return (betValue === '1-18' && isLow) ||
          (betValue === '19-36' && !isLow)
          ? amount * 2
          : 0;
      }

      case 'DOZEN': {
        const ranges: Record<string, [number, number]> = {
          '1-12': [1, 12],
          '13-24': [13, 24],
          '25-36': [25, 36],
        };
        const range = ranges[betValue];
        if (!range) return 0;
        return number >= range[0] && number <= range[1] ? amount * 3 : 0;
      }

      case 'COLUMN': {
        if (number === 0) return 0;
        const col = ((number - 1) % 3) + 1;
        return col === parseInt(betValue) ? amount * 3 : 0;
      }

      default:
        return 0;
    }
  }

  private async acquireRoomLock(roomId: string): Promise<boolean> {
    const key = `live_roulette:lock:${roomId}`;
    const result = await this.redis.set(key, '1', 'EX', 60, 'NX');
    return result === 'OK';
  }

  private async releaseRoomLock(roomId: string): Promise<void> {
    await this.redis.del(`live_roulette:lock:${roomId}`);
  }

  private async renewRoomLock(roomId: string): Promise<void> {
    await this.redis.expire(`live_roulette:lock:${roomId}`, 60);
  }
}
