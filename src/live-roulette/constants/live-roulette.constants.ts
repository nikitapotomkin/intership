export const BETTING_PHASE_SECONDS = 15;
export const SPINNING_PHASE_SECONDS = 6;
export const RESULTS_PHASE_SECONDS = 5;

export const ROOM_STATE_TTL = 60 * 60;

export const ROOM_KEY = (roomId: string) => `live_roulette:room:${roomId}:state`;
export const ROOM_BETS_KEY = (roomId: string) => `live_roulette:room:${roomId}:bets`;
export const ROOMS_LIST_KEY = `live_roulette:rooms`;

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const ROULETTE_NUMBERS_COUNT = 37;