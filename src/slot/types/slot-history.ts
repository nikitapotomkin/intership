import { SlotGrid } from "./slot.grid";
import { WinningLine } from "./winning-line.type";

export type  SlotHistory = {
  id: string;
  grid: SlotGrid;
  winningLines: WinningLine[];
  scatterCount: number;
  totalBet: number;
  totalPayout: number;
  isWin: boolean;
  createdAt: Date;
}