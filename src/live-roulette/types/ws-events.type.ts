import { RoomPhase } from "./room-phase.type";
import { WinnerEntry } from "./winner-entry.type";

export type WsErrorEvent = {
  message: string;
}

export type WsBetPlacedEvent = {
  userId: number;
  betType: string;
  betValue: string;
  amount: number;
}

export type WsSpinResultEvent = {
  number: number;
  color: 'red' | 'black' | 'green';
  winners: WinnerEntry[];
}

export type WsTimerEvent = {
  phase: RoomPhase;
  timeLeft: number;
}