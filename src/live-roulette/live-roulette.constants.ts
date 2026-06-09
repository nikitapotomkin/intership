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

export const ROOM_LOCK_TTL = Math.max(BETTING_PHASE_SECONDS, SPINNING_PHASE_SECONDS, RESULTS_PHASE_SECONDS) + 10;
 
export const ROULETTE_NUMBERS_COUNT = 37;

export const LIVE_ROULETTE_QUEUE = 'live-roulette';
 
export const LiveJobName = {
  TICK:    'tick',    
  PHASE:   'phase',
} as const;
 
export type LiveJobName = typeof LiveJobName[keyof typeof LiveJobName];
 
export const ROOM_PLAYER_COUNT_KEY = (roomId: string) =>
  `live_roulette:room:${roomId}:player_count`;
 
export const ROOM_LOCK_KEY = (roomId: string) =>
  `live_roulette:lock:${roomId}`;

export const SOCKET_ROOMS_KEY = (socketId: string) => `socket-rooms-${socketId}`;

export const SOCKET_ROOMS_TTL = 3600;