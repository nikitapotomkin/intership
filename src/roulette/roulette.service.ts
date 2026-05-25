import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoundStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { RouletteRoundRepository } from './repositories/roulette-round.repository';
import { RouletteBetRepository } from './repositories/roulette-bet.repository';
import { GameSessionRepository } from './repositories/game-session.repository';
import { PlaceBetDto } from './dto/place-bet.dto';
import { SetClientSeedDto } from './dto/set-client-seed.dto';
import { BetResult } from './types/bet-result.type';
import { createHash, randomBytes, createHmac } from 'crypto';
import { SpinResult } from './types/spin-result.type';
import { RED_NUMBERS, ROULETTE_NUMBERS_COUNT } from './constants/roulette.constants';




@Injectable()
export class RouletteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly roundRepository: RouletteRoundRepository,
    private readonly betRepository: RouletteBetRepository,
    private readonly sessionRepository: GameSessionRepository,
  ) {}

  async getOrCreateSession(userId: number) {
    const existing = await this.sessionRepository.findOne({
      where: {
        userId,
        isRevealed: false,
        round: { is: null },
      },
    });

    if (existing)
      return {
        id: existing.id,
        serverHash: existing.serverHash,
        clientSeed: existing.clientSeed,
        nonce: existing.nonce,
      };

    const serverSeed = this.generateServerSeed();
    const serverHash = this.hashServerSeed(serverSeed);

    const session = await this.sessionRepository.create({
      data: { userId, serverSeed, serverHash },
    });

    return {
      id: session.id,
      serverHash: session.serverHash,
      clientSeed: session.clientSeed,
      nonce: session.nonce,
    };
  }

  async setClientSeed(userId: number, dto: SetClientSeedDto) {
    const session = await this.sessionRepository.findOne({
      where: { userId, isRevealed: false, round: { is: null } },
    });
    if (!session) throw new NotFoundException('Active session not found');

    await this.sessionRepository.update({
      where: { id: session.id },
      data: { clientSeed: dto.clientSeed },
    });

    return { message: 'Client seed updated' };
  }

  async createRound(userId: number) {
    const session = await this.sessionRepository.findOne({
      where: { userId, isRevealed: false, round: { is: null } },
    });
    if (!session)
      throw new NotFoundException(
        'No active session. Call GET /roulette/session first.',
      );

    const round = await this.roundRepository.create({
      data: {
        gameSessionId: session.id,
        status: RoundStatus.PENDING,
      },
      include: {
        gameSession: {
          select: { serverHash: true, clientSeed: true, nonce: true },
        },
      },
    });

    return round;
  }

  async getCurrentRound(userId: number) {
    const round = await this.roundRepository.findOne({
      where: {
        status: { in: [RoundStatus.PENDING, RoundStatus.SPINNING] },
        gameSession: { userId },
      },
      include: {
        bets: { where: { userId } },
        gameSession: {
          select: { serverHash: true, clientSeed: true, nonce: true },
        },
      },
    });
    if (!round) throw new NotFoundException('No active round');
    return round;
  }

  async placeBet(userId: number, dto: PlaceBetDto) {
    const round = await this.roundRepository.findOne({
      where: {
        status: RoundStatus.PENDING,
        gameSession: { userId },
      },
    });

    if (!round) {
      throw new BadRequestException(
        'No active round. Call POST /roulette/round first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const bet = await tx.rouletteBet.create({
        data: {
          roundId: round.id,
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
        bet.id,
      );

      return bet;
    });
  }

  async spin(userId: number) {
    const round = await this.roundRepository.findOne({
      where: {
        status: RoundStatus.PENDING,
        gameSession: { userId },
      },
      include: {
        bets: true,
        gameSession: true,
      },
    });

    if (!round) throw new NotFoundException('No pending round');
    if (!round.bets.length)
      throw new BadRequestException('Place at least one bet before spinning');

    const session = round.gameSession;
    const clientSeed = session.clientSeed ?? 'default-client-seed';

    const result = this.computeSpin(session.serverSeed, clientSeed, session.nonce);

    return this.prisma.$transaction(async (tx) => {
      await tx.rouletteRound.update({
        where: { id: round.id },
        data: {
          status: RoundStatus.FINISHED,
          winningNumber: result.number,
          winningColor: result.color,
          finishedAt: new Date(),
        },
      });

      const betResults: BetResult[] = [];
      for (const bet of round.bets) {
        const payout = this.calculatePayout(
          bet.betType,
          bet.betValue,
          Number(bet.amount),
          result,
        );
        const isWin = payout > 0;

        await tx.rouletteBet.update({
          where: { id: bet.id },
          data: { payout: new Decimal(payout), isWin },
        });

        if (isWin) {
          await this.walletService.creditWin(
            tx,
            userId,
            new Decimal(payout),
            bet.id,
          );
        }

        betResults.push({ betId: bet.id, isWin, payout });
      }

      await tx.gameSession.update({
        where: { id: session.id },
        data: {
          nonce: { increment: 1 },
          isRevealed: true,
        },
      });

      return {
        result,
        serverSeed: session.serverSeed,
        clientSeed,
        nonce: session.nonce,
        bets: betResults,
      };
    });
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    return this.roundRepository.findAll({
      where: { gameSession: { userId } },
      include: {
        bets: { where: { userId } },
        gameSession: {
          select: {
            serverSeed: true,
            serverHash: true,
            clientSeed: true,
            nonce: true,
            isRevealed: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take,
    });
  }

  async verifyRound(roundId: string) {
    const round = await this.roundRepository.findUnique({
      where: { id: roundId },
      include: { gameSession: true },
    });

    if (!round) throw new NotFoundException('Round not found');
    if (!round.gameSession.isRevealed) {
      throw new BadRequestException(
        'Round is not finished yet — serverSeed not revealed',
      );
    }

    const session = round.gameSession;
    const clientSeed = session.clientSeed ?? 'default-client-seed';
    const computed = this.computeSpin(session.serverSeed, clientSeed, session.nonce);

    return {
      roundId: round.id,
      serverSeed: session.serverSeed,
      serverHash: session.serverHash,
      clientSeed,
      nonce: session.nonce,
      computedNumber: computed.number,
      computedColor: computed.color,
      storedNumber: round.winningNumber,
      storedColor: round.winningColor,
      isValid:
        computed.number === round.winningNumber &&
        computed.color === round.winningColor,
    };
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
}
