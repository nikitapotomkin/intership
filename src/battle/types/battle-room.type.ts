import type { BattleStatus } from './battle.type';
import type { Move } from './move.type';
import type { RoundResult } from './round-result.type';

export type BattleRoom = {
  id: string;
  player1Id: number;
  player2Id: number;
  status: BattleStatus;
  createdAt: string;

  player1Health: number;
  player2Health: number;

  player1PendingMove?: Pick<Move, 'attackZone' | 'defenseZone'> | null;
  player2PendingMove?: Pick<Move, 'attackZone' | 'defenseZone'> | null;

  rounds: RoundResult[];
  winnerId?: number | null;
  currentRound: number;
  isDraw:boolean
  forfeitedBy?: number | null;
};