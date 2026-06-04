import {
  Injectable,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { SpinDto } from './dto/spin.dto';
import {
  REEL_STRIP,
  REELS_COUNT,
  ROWS_COUNT,
  PAYLINES,
  PAYTABLE,
  SCATTER_PAYTABLE,
  SlotSymbol,
} from './constants/slot.constants';
import { SlotGrid } from './types/slot.grid';
import { WinningLine } from './types/winning-line.type';
import { SpinResult } from './types/spin-result.type';
import { SlotRoundRepository } from './repositories/slot-round.repository';
import { TransactionType } from '@prisma/client';

@Injectable()
export class SlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly slotRoundRepository: SlotRoundRepository
  ) {}

  async spin(userId: number, dto: SpinDto): Promise<SpinResult> {
    const totalBet = dto.betPerLine * dto.activeLines;

    return this.prisma.$transaction(async (tx) => {
      await this.walletService.deductBet(
        tx,
        userId,
        new Decimal(totalBet),
        TransactionType.SLOT_BET,
      );

      const grid = this.generateGrid();

      const result = this.calculateWin(grid, dto.betPerLine, dto.activeLines, totalBet);

      const round = await tx.slotRound.create({
        data: {
          userId,
          grid: JSON.stringify(grid),
          betPerLine: new Decimal(dto.betPerLine),
          activeLines: dto.activeLines,
          totalBet: new Decimal(totalBet),
          totalPayout: new Decimal(result.totalPayout),
          scatterCount: result.scatterCount,
          isWin: result.totalPayout > 0,
          winningLines: JSON.stringify(result.winningLines),
        },
      });

      if (result.totalPayout > 0) {
        await this.walletService.creditWin(
          tx,
          userId,
          new Decimal(result.totalPayout),
          TransactionType.SLOT_WIN
        );
      }

      return result;
    });
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    const rounds = await this.slotRoundRepository.findAll({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return rounds.map((r) => ({
      ...r,
      grid: JSON.parse(r.grid as string),
      winningLines: JSON.parse(r.winningLines as string),
    }));
  }

  getPaytable() {
    return {
      symbols: PAYTABLE,
      scatter: SCATTER_PAYTABLE,
      paylines: PAYLINES,
      reelsCount: REELS_COUNT,
      rowsCount: ROWS_COUNT,
    };
  }

  generateGrid(): SlotGrid {
    const grid: SlotGrid = [];

    for (let reel = 0; reel < REELS_COUNT; reel++) {
      const reelSymbols: SlotSymbol[] = [];
      for (let row = 0; row < ROWS_COUNT; row++) {
        reelSymbols.push(this.randomSymbol());
      }
      grid.push(reelSymbols);
    }

    return grid;
  }

  private randomSymbol(): SlotSymbol {
    const index = Math.floor(Math.random() * REEL_STRIP.length);
    return REEL_STRIP[index];
  }

  calculateWin(
    grid: SlotGrid,
    betPerLine: number,
    activeLines: number,
    totalBet: number,
  ): SpinResult {
    const winningLines: WinningLine[] = [];
    let linePayout = 0;

    for (let lineIdx = 0; lineIdx < activeLines; lineIdx++) {
      const line = PAYLINES[lineIdx];
      const lineWin = this.checkLine(grid, line, lineIdx, betPerLine);
      if (lineWin) {
        winningLines.push(lineWin);
        linePayout += lineWin.payout;
      }
    }

    const scatterCount = this.countScatters(grid);
    const scatterMultiplier = SCATTER_PAYTABLE[scatterCount] ?? 0;
    const scatterPayout = scatterMultiplier > 0 ? totalBet * scatterMultiplier : 0;

    const totalPayout = linePayout + scatterPayout;
    const multiplier = totalBet > 0 ? totalPayout / totalBet : 0;

    return {
      grid,
      winningLines,
      scatterCount,
      scatterPayout,
      totalPayout,
      betPerLine,
      totalBet,
      multiplier,
    };
  }

  private checkLine(
    grid: SlotGrid,
    line: number[],
    lineIndex: number,
    betPerLine: number,
  ): WinningLine | null {
    const symbols = line.map((row, reel) => grid[reel][row]);

    const baseSymbol = symbols.find((s) => s !== SlotSymbol.WILD);

    const matchSymbol = baseSymbol ?? SlotSymbol.SEVEN;

    if (matchSymbol === SlotSymbol.SCATTER) return null;

    let matchCount = 0;
    for (const sym of symbols) {
      if (sym === matchSymbol || sym === SlotSymbol.WILD) {
        matchCount++;
      } else {
        break; 
      }
    }

    if (matchCount < 3) return null;

    const payoutIndex = matchCount - 3;
    const payout = PAYTABLE[matchSymbol][payoutIndex] * betPerLine;

    if (payout <= 0) return null;

    return {
      lineIndex,
      symbols,
      matchCount,
      symbol: matchSymbol,
      payout,
    };
  }

  private countScatters(grid: SlotGrid): number {
    let count = 0;
    for (const reel of grid) {
      for (const sym of reel) {
        if (sym === SlotSymbol.SCATTER) count++;
      }
    }
    return count;
  }
}