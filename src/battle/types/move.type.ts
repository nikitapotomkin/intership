import type { Zone } from "./battle.type";

export type Move = {
  playerId: number;
  attackZone: Zone;
  defenseZone: Zone;
  health: number;
  strike: number;
};