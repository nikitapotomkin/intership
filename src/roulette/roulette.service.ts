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
import {
  generateServerSeed,
  hashServerSeed,
  computeSpin,
  calculatePayout,
} from './provably-fair.helper';
import { BetResult } from './types/bet-results.type';

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

    if (existing) return { id: existing.id, serverHash: existing.serverHash, clientSeed: existing.clientSeed, nonce: existing.nonce };

    const serverSeed = generateServerSeed();
    const serverHash = hashServerSeed(serverSeed);

    const session = await this.sessionRepository.create({
      data: { userId, serverSeed, serverHash },
    });

    return { id: session.id, serverHash: session.serverHash, clientSeed: session.clientSeed, nonce: session.nonce };
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
    if (!session) throw new NotFoundException('No active session. Call GET /roulette/session first.');

    const round = await this.roundRepository.create({
      data: {
        gameSessionId: session.id,
        status: RoundStatus.PENDING,
      },
      include: { gameSession: { select: { serverHash: true, clientSeed: true, nonce: true } } },
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
        gameSession: { select: { serverHash: true, clientSeed: true, nonce: true } },
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
      throw new BadRequestException('No active round. Call POST /roulette/round first.');
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

      await this.walletService.deductBet(tx, userId, new Decimal(dto.amount), bet.id);

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
    if (!round.bets.length) throw new BadRequestException('Place at least one bet before spinning');

    const session = round.gameSession;
    const clientSeed = session.clientSeed ?? 'default-client-seed';

    const result = computeSpin(session.serverSeed, clientSeed, session.nonce);

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
        const payout = calculatePayout(
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
          await this.walletService.creditWin(tx, userId, new Decimal(payout), bet.id);
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
          select: { serverSeed: true, serverHash: true, clientSeed: true, nonce: true, isRevealed: true },
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
      throw new BadRequestException('Round is not finished yet — serverSeed not revealed');
    }

    const session = round.gameSession;
    const clientSeed = session.clientSeed ?? 'default-client-seed';
    const computed = computeSpin(session.serverSeed, clientSeed, session.nonce);

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
}