import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { BattleService } from './battle.service';
import { MakeMoveDto } from './dto/make-move.dto';

@ApiTags('Battle')
@ApiCookieAuth('connect.sid')
@Controller('battles')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('duel-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a duel request',
    description: 'Creates a pending duel request visible to all players.',
  })
  @ApiOkResponse({ description: 'DuelRequest' })
  createDuelRequest(@CurrentUser() user: User) {
    return this.battleService.createDuelRequest(user.id);
  }

  @Get('duel-requests')
  @ApiOperation({ summary: 'List all open duel requests' })
  @ApiOkResponse({ description: 'DuelRequest[]' })
  listDuelRequests() {
    return this.battleService.listDuelRequests();
  }

  @Post('duel-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept a duel request',
    description:
      'Accepts a pending duel request. Creates a battle room and returns it.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'BattleRoom' })
  acceptDuelRequest(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.battleService.acceptDuelRequest(id, user.id);
  }

  @Delete('duel-requests/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel your own duel request' })
  @ApiParam({ name: 'id', type: Number })
  cancelDuelRequest(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.battleService.rejectDuelRequest(id, user.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get current battle state' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'BattleRoom' })
  getBattleStatus(@Param('id') id: string) {
    return this.battleService.getBattleRoom(id);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Make a move in battle',
    description: `
      Submit your attack and defense zones for the current round.
      Once both players submit, the round is resolved automatically.
      If a player doesn't submit within ${30} seconds, a random move is made.

      Zones: "head" | "body" | "legs"

      Damage rules:
      - Hit lands: opponent loses strike points (${3})
      - Hit blocked: opponent loses (strike - ${2}) points
    `,
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: '{ message: "Move submitted" }' })
  async makeMove(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: MakeMoveDto,
  ) {
    await this.battleService.makeMove(id, user.id, dto);
    return { message: 'Move submitted' };
  }
}
