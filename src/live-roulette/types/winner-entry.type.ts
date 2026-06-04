export type WinnerEntry = {
  userId: number;
  payout: number;
  bets: { betId: string; isWin: boolean; payout: number }[];
}