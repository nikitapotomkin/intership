export const MOVE_TIMEOUT_SECONDS = 60;
export const INITIAL_HEALTH = 100;
export const BASE_STRIKE = 5;
export const BLOCK_REDUCTION = 2;
export const ROOM_LOCK_KEY = (roomId: string) => `lock:battle:room:${roomId}`;
export const PLAYER_ACTIVE_ROOM_KEY = (userId: number) =>
  `battle:player:${userId}:active_room`;
export const DUEL_REQUEST_TTL = 60 * 15;
export const BATTLE_ROOM_TTL = 60 * 60;
export const PLAYER_LOCK_KEY = (userId: number) =>
  `lock:battle:player:${userId}`;
export const DUEL_REQUEST_KEY = (id: number) => `battle:request:${id}`;
export const DUEL_REQUESTS_LIST_KEY = `battle:requests:pending`;
export const BATTLE_ROOM_KEY = (id: string) => `battle:room:${id}`;
export const FOR_FEIT_JOB_Id = (userId: number) => `forfeit-${userId}`;
export const BATTLE_MOVE_TIMER_KEY = (roomId: string) =>
  `battle:timer:${roomId}`;
export const DUEL_REQUEST_COUNTER_KEY = `battle:request:counter`;
export const DEFAULT_TTL_MS = 5_000;
export const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;
export const DISCONNECT_GRACE_MS = 15_000;
export const BATTLE_QUEUE = 'battle';
export const JobName = {
  AUTO_MOVE_TICK: 'auto-move-tick',
  AUTO_MOVE:      'auto-move',
  FORFEIT:        'forfeit',
} as const;