import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SlotService } from './slot.service';
import { SpinDto } from './dto/spin.dto';

@ApiTags('Slot')
@ApiCookieAuth('connect.sid')
@Controller('slots')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Spin the slot machine',
    description: `
      Spins a 3x5 slot machine with 20 paylines.
      Deducts betPerLine * activeLines from balance.
      Returns grid, winning lines, scatter payout and total payout.

      Symbols (high → low): SEVEN, DIAMOND, BELL, HORSESHOE, HEART, SPADE, CLUB, LEMON, CHERRY
      Special: WILD (substitutes any), SCATTER (pays anywhere, min 3)
    `,
  })
  @ApiOkResponse({ description: 'SpinResult' })
  spin(@CurrentUser() user: User, @Body() dto: SpinDto) {
    return this.slotService.spin(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get spin history' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  getHistory(
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.slotService.getHistory(
      user.id,
      Number(skip) || 0,
      Number(take) || 20,
    );
  }

  @Get('paytable')
  @ApiOperation({
    summary: 'Get paytable, paylines and symbol info',
    description: 'Returns all payout multipliers, scatter payouts and payline definitions.',
  })
  getPaytable() {
    return this.slotService.getPaytable();
  }
}