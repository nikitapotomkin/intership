import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BattleService } from './battle.service';
import { BattleGateway } from './battle.gateway';
import { BATTLE_QUEUE, JobName } from './battle.constants';
import { AutoMoveJob, AutoMoveTickJob, ForfeitJob } from './types';

@Processor(BATTLE_QUEUE)
export class BattleProcessor extends WorkerHost {
  constructor(
    private readonly battleService: BattleService,
    private readonly battleGateway: BattleGateway,
  ) {
    super()
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JobName.AUTO_MOVE_TICK: {
        const { roomId, timeLeft } = job.data as AutoMoveTickJob;
        this.battleGateway.sendToRoom(roomId, 'battle:timer', {
          roomId,
          timeLeft,
        });
        break;
      }

      case JobName.AUTO_MOVE: {
        const { roomId } = job.data as AutoMoveJob;
        await this.battleService.executeAutoMove(roomId);
        break;
      }

      case JobName.FORFEIT: {
        const { roomId, userId } = job.data as ForfeitJob;
        await this.battleService.forfeit(roomId, userId);
        break;
      }
    }
  }
}