import type { Move } from "./move.type";

export type RoundResult = {
  round: number;
  player1Move: Move;
  player2Move: Move;
  player1HealthAfter: number;
  player2HealthAfter: number;
  player1Blocked: boolean;
  player2Blocked: boolean;
};