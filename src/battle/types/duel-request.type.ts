export type DuelRequestStatus = 'pending' | 'accepted' | 'rejected';

export type DuelRequest = {
  id: number;
  challengerId: number;
  opponentId?: number;
  status: DuelRequestStatus;
  createdAt: string;
  battleRoomId?: string;
};