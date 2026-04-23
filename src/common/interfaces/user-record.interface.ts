export interface UserRecord {
  id: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isBlocked: boolean;
  quotaBytes: number;
  usedBytes: number;
  createdAt: string;
}