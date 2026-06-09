export type TickJobData  = { roomId: string; timeLeft: number };
export type PhaseJobData = { roomId: string; phase: 'BETTING' | 'SPINNING' | 'RESULTS'; spinResult?: any };