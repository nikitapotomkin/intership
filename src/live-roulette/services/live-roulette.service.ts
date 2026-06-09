import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import type { Redis } from 'ioredis';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { LiveRouletteRoomService } from './live-roulette-room.service';
import { LivePlaceBetDto } from '../dto/live-place-bet.dto';
import {
  RoomState,
  RoomBetEntry,
  WinnerEntry,
  WsSpinResultEvent,
  SpinResult,
} from '../types';
import {
  BETTING_PHASE_SECONDS,
  SPINNING_PHASE_SECONDS,
  RESULTS_PHASE_SECONDS,
  ROOM_BETS_KEY,
  RED_NUMBERS,
  ROULETTE_NUMBERS_COUNT,
  LIVE_ROULETTE_QUEUE,
  LiveJobName,
  ROOM_LOCK_TTL,
  ROOM_LOCK_KEY,
} from '../live-roulette.constants';
import { createHash, createHmac, randomBytes } from 'crypto';
import { RouletteRoundRepository } from '../repositories/roulette-round.repository';
import { GameSessionRepository } from '../repositories/game-session.repository';
import { LiveRouletteGateway } from '../live-roulette.gateway';
import { TransactionType } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class LiveRouletteService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => LiveRouletteGateway))
    private readonly liveRouletteGateway: LiveRouletteGateway,
    private readonly liveRouletteRoomService: LiveRouletteRoomService,
    private readonly rouletteRoundRepository: RouletteRoundRepository,
    private readonly gameSessionRepository: GameSessionRepository,
    @InjectQueue(LIVE_ROULETTE_QUEUE) private readonly queue: Queue,
  ) {}
 
  async startRoomLoop(roomId: string): Promise<void> {
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    if (!state.isActive) return;
 
    const acquired = await this.acquireRoomLock(roomId);
    if (!acquired) return;
 
    const existingJob = await this.queue.getJob(`phase-${roomId}`);
    if (existingJob) return;
 
    await this.beginBettingPhase(roomId);
  }
 
  async stopRoomLoop(roomId: string): Promise<void> {
    await this.cancelRoomJobs(roomId);
    await this.releaseRoomLock(roomId);
  }
 
  async beginBettingPhase(roomId: string): Promise<void> {
    await this.renewRoomLock(roomId);
    await this.redis.del(ROOM_BETS_KEY(roomId));
 
    const roundId = await this.createRoundForRoom(roomId);
 
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'BETTING';
    state.timeLeft = BETTING_PHASE_SECONDS;
    state.currentRoundId = roundId;
    await this.liveRouletteRoomService.saveRoomState(state);
 
    this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:state', state);
 
    await this.scheduleCountdownAndPhase(
      roomId,
      BETTING_PHASE_SECONDS,
      'SPINNING',
    );
  }
 
  async beginSpinningPhase(roomId: string): Promise<void> {
    await this.renewRoomLock(roomId);
 
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'SPINNING';
    state.timeLeft = SPINNING_PHASE_SECONDS;
    await this.liveRouletteRoomService.saveRoomState(state);
 
    this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:state', state);
 
    const spinResult = await this.doSpin(roomId, state.currentRoundId!);
 
    const ts = Date.now();
    await this.queue.add(
      LiveJobName.PHASE,
      { roomId, phase: 'RESULTS', spinResult },
      {
        delay: SPINNING_PHASE_SECONDS * 1_000,
        jobId: `phase-${roomId}-${ts}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
 
  async beginResultsPhase(
    roomId: string,
    spinResult: WsSpinResultEvent,
  ): Promise<void> {
    await this.renewRoomLock(roomId);
 
    const state = await this.liveRouletteRoomService.getRoomState(roomId);
    state.phase = 'RESULTS';
    state.timeLeft = RESULTS_PHASE_SECONDS;
    state.lastResult = { number: spinResult.number, color: spinResult.color };
    state.currentRoundId = null;
    await this.liveRouletteRoomService.saveRoomState(state);
 
    this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:state', state);
    this.liveRouletteGateway.sendToRoom(roomId, 'live_roulette:result', spinResult);
 
    await this.scheduleCountdownAndPhase(
      roomId,
      RESULTS_PHASE_SECONDS,
      'BETTING',
    );
  }
 
  async placeBet(userId: number, dto: LivePlaceBetDto): Promise<void> {
    const state = await this.liveRouletteRoomService.getRoomState(dto.roomId);
 
    if (!state.isActive) throw new BadRequestException('Room is not active');
    if (!state.currentRoundId) throw new BadRequestException('No active round available');
    if (state.phase !== 'BETTING') throw new BadRequestException('Bets are only accepted during the BETTING phase');
    if (dto.amount < state.minBet) throw new BadRequestException(`Minimum bet is ${state.minBet}`);
    if (dto.amount > state.maxBet) throw new BadRequestException(`Maximum bet is ${state.maxBet}`);
 
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
 
    this.liveRouletteGateway.sendToRoom(dto.roomId, 'live_roulette:bet_placed', {
      userId,
      betType: dto.betType,
      betValue: dto.betValue,
      amount: dto.amount,
    });
  }
 
  private async scheduleCountdownAndPhase(
    roomId: string,
    seconds: number,
    nextPhase: 'BETTING' | 'SPINNING' | 'RESULTS',
  ): Promise<void> {
    const ts = Date.now();
 
    for (let tick = 1; tick < seconds; tick++) {
      await this.queue.add(
        LiveJobName.TICK,
        { roomId, timeLeft: seconds - tick },
        {
          delay: tick * 1_000,
          jobId: `tick-${roomId}-${tick}-${ts}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
 
    await this.queue.add(
      LiveJobName.PHASE,
      { roomId, phase: nextPhase },
      {
        delay: seconds * 1_000,
        jobId: `phase-${roomId}-${ts}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
 
  private async cancelRoomJobs(roomId: string): Promise<void> {
    const jobs = await this.queue.getJobs(['delayed', 'waiting']);
    await Promise.all(
      jobs
        .filter((j) => j.data?.roomId === roomId)
        .map((j) => j.remove()),
    );
  }
 
  private async createRoundForRoom(roomId: string): Promise<string> {
    const serverSeed = this.generateServerSeed();
    const serverHash = this.hashServerSeed(serverSeed);
    const clientSeed = `room-${roomId}`;
 
    const session = await this.gameSessionRepository.create({
      data: { liveRoomId: roomId, serverSeed, serverHash, clientSeed, nonce: 0 },
    });
 
    const round = await this.rouletteRoundRepository.create({
      data: { gameSessionId: session.id, status: 'PENDING' },
    });
 
    return round.id;
  }
 
  private async doSpin(roomId: string, roundId: string): Promise<WsSpinResultEvent> {
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
        const payout = this.calculatePayout(bet.betType, bet.betValue, bet.amount, result);
        const isWin = payout > 0;
 
        await tx.rouletteBet.update({
          where: { id: bet.betId },
          data: { payout: new Decimal(payout), isWin },
        });
 
        if (isWin) {
          await this.walletService.creditWin(
            tx, bet.userId, new Decimal(payout), TransactionType.ROULETTE_WIN,
          );
        }
 
        if (!userBetsMap.has(bet.userId)) {
          userBetsMap.set(bet.userId, { userId: bet.userId, payout: 0, bets: [] });
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
 
  private async acquireRoomLock(roomId: string): Promise<boolean> {
    const result = await this.redis.set(
      ROOM_LOCK_KEY(roomId), '1', 'EX', ROOM_LOCK_TTL, 'NX',
    );
    return result === 'OK';
  }
 
  private async releaseRoomLock(roomId: string): Promise<void> {
    await this.redis.del(ROOM_LOCK_KEY(roomId));
  }
 
  private async renewRoomLock(roomId: string): Promise<void> {
    await this.redis.expire(ROOM_LOCK_KEY(roomId), ROOM_LOCK_TTL);
  }
 
  generateServerSeed(): string {
    return randomBytes(32).toString('hex');
  }
 
  hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex');
  }
 
  computeSpin(serverSeed: string, clientSeed: string, nonce: number): SpinResult {
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
 
  calculatePayout(betType: string, betValue: string, amount: number, result: SpinResult): number {
    const { number, color } = result;
    switch (betType) {
      case 'NUMBER':
        return parseInt(betValue) === number ? amount * 36 : 0;
      case 'COLOR':
        return betValue === color ? amount * 2 : 0;
      case 'ODD_EVEN': {
        if (number === 0) return 0;
        const isOdd = number % 2 !== 0;
        return (betValue === 'odd' && isOdd) || (betValue === 'even' && !isOdd) ? amount * 2 : 0;
      }
      case 'HIGH_LOW': {
        if (number === 0) return 0;
        const isLow = number >= 1 && number <= 18;
        return (betValue === '1-18' && isLow) || (betValue === '19-36' && !isLow) ? amount * 2 : 0;
      }
      case 'DOZEN': {
        const ranges: Record<string, [number, number]> = {
          '1-12': [1, 12], '13-24': [13, 24], '25-36': [25, 36],
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
}