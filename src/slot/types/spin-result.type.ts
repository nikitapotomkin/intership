import { SlotGrid } from "./slot.grid";
import { WinningLine } from "./winning-line.type";

export type SpinResult = {
  grid: SlotGrid;
  winningLines: WinningLine[];
  scatterCount: number;
  scatterPayout: number;
  totalPayout: number;
  betPerLine: number;
  totalBet: number;
  multiplier: number;
}