import { RoomPhase, SpinResultPayload } from ".";

export type RoomState = {
  roomId: string;
  name: string;
  phase: RoomPhase;
  isActive: boolean;
  timeLeft: number;
  currentRoundId: string | null;
  playerCount: number;
  minBet: number;
  maxBet: number;
  lastResult: SpinResultPayload | null;
}

export type WsRoomStateEvent = RoomState;