import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RouletteService } from './roulette.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { SetClientSeedDto } from './dto/set-client-seed.dto';

@ApiTags('Roulette')
@ApiCookieAuth('connect.sid')
@Controller('roulette')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @Get('session')
  @ApiOperation({
    summary: 'Get or create active game session',
    description:
      'Returns serverHash (SHA256 of serverSeed) which the user can verify after the round. ' +
      'Call this before creating a round.',
  })
  @ApiOkResponse({
    description: '{ id, serverHash, clientSeed, nonce }',
  })
  getSession(@CurrentUser() user: User) {
    return this.rouletteService.getOrCreateSession(user.id);
  }

  @Post('session/client-seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set custom client seed',
    description:
      'Optionally set your own client seed before spinning. ' +
      'Must be 8-64 characters. Can only be changed before a round starts.',
  })
  @ApiOkResponse({ description: '{ message: "Client seed updated" }' })
  setClientSeed(@CurrentUser() user: User, @Body() dto: SetClientSeedDto) {
    return this.rouletteService.setClientSeed(user.id, dto);
  }

  @Post('round')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a new round',
    description:
      'Creates a PENDING round tied to your active session. ' +
      'You must have an active session (GET /roulette/session). ' +
      'Only one active round per user at a time.',
  })
  @ApiOkResponse({ description: 'RouletteRound object' })
  createRound(@CurrentUser() user: User) {
    return this.rouletteService.createRound(user.id);
  }

  @Get('round/current')
  @ApiOperation({
    summary: 'Get current active round with your bets',
  })
  @ApiOkResponse({ description: 'RouletteRound with bets array' })
  getCurrentRound(@CurrentUser() user: User) {
    return this.rouletteService.getCurrentRound(user.id);
  }


  @Post('bet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Place a bet on the current round',
    description: `
      Bet types and accepted values:
      - NUMBER  → "0" to "36"
      - COLOR   → "red" | "black" | "green"
      - ODD_EVEN → "odd" | "even"
      - HIGH_LOW → "1-18" | "19-36"
      - DOZEN   → "1-12" | "13-24" | "25-36"
      - COLUMN  → "1" | "2" | "3"

      Payouts:
      - NUMBER  → 36x
      - COLOR   → 2x
      - ODD_EVEN → 2x
      - HIGH_LOW → 2x
      - DOZEN   → 3x
      - COLUMN  → 3x
    `,
  })
  @ApiOkResponse({ description: 'RouletteBet object' })
  placeBet(@CurrentUser() user: User, @Body() dto: PlaceBetDto) {
    return this.rouletteService.placeBet(user.id, dto);
  }

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Spin the wheel',
    description:
      'Finalizes the round. Computes result via Provably Fair (HMAC-SHA256). ' +
      'Pays out winning bets. Reveals serverSeed for verification. ' +
      'Automatically increments nonce for the next round.',
  })
  @ApiOkResponse({
    description: '{ result: { number, color }, serverSeed, clientSeed, nonce, bets: [{ betId, isWin, payout }] }',
  })
  spin(@CurrentUser() user: User) {
    return this.rouletteService.spin(user.id);
  }


  @Get('history')
  @ApiOperation({ summary: 'Get my round history with bets' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  getHistory(
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.rouletteService.getHistory(
      user.id,
      Number(skip) || 0,
      Number(take) || 20,
    );
  }

  @Get('verify/:roundId')
  @ApiOperation({
    summary: 'Verify a finished round (Provably Fair)',
    description:
      'Recomputes the spin result from serverSeed + clientSeed + nonce ' +
      'and compares with the stored result. Returns isValid: true/false.',
  })
  @ApiParam({ name: 'roundId', type: String })
  @ApiOkResponse({
    description:
      '{ roundId, serverSeed, serverHash, clientSeed, nonce, computedNumber, computedColor, storedNumber, storedColor, isValid }',
  })
  verifyRound(@Param('roundId') roundId: string) {
    return this.rouletteService.verifyRound(roundId);
  }
}