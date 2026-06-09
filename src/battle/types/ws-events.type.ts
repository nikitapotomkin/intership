import type { BattleStatus } from "./battle.type";
import type { RoundResult } from "./round-result.type";

export type WsBattleStateEvent = {
  roomId: string;
  player1Health: number;
  player2Health: number;
  currentRound: number;
  status: BattleStatus;
  lastRound?: RoundResult;
  winnerId?: number;
};

export type WsMoveTimerEvent = {
  roomId: string;
  timeLeft: number;
};

export type WsBattleErrorEvent = {
  message: string;
};