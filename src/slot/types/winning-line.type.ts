import { SlotSymbol } from "../slot.constants";

export type WinningLine = {
  lineIndex: number;       
  symbols: SlotSymbol[];  
  matchCount: number;      
  symbol: SlotSymbol;      
  payout: number;         
}