import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LiveRouletteService } from './services/live-roulette.service';
import { LiveRouletteGateway } from './live-roulette.gateway';
import { LIVE_ROULETTE_QUEUE, LiveJobName } from './live-roulette.constants';
import { PhaseJobData, TickJobData } from './types';

@Processor(LIVE_ROULETTE_QUEUE)
export class LiveRouletteProcessor extends WorkerHost {
  constructor(
    private readonly liveService: LiveRouletteService,
    private readonly gateway: LiveRouletteGateway,
  ) {
    super()
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case LiveJobName.TICK: {
        const { roomId, timeLeft } = job.data as TickJobData;
        this.gateway.sendToRoom(roomId, 'live_roulette:timer', { timeLeft });
        break;
      }

      case LiveJobName.PHASE: {
        const { roomId, phase, spinResult } = job.data as PhaseJobData;
        switch (phase) {
          case 'BETTING':
            await this.liveService.beginBettingPhase(roomId);
            break;
          case 'SPINNING':
            await this.liveService.beginSpinningPhase(roomId);
            break;
          case 'RESULTS':
            await this.liveService.beginResultsPhase(roomId, spinResult);
            break;
        }
        break;
      }
    }
  }
}