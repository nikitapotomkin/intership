import { RoomPhase } from ".";

export type WsTimerEvent = {
  phase: RoomPhase;
  timeLeft: number;
}