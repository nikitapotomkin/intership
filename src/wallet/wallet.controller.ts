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
import { WalletService } from './wallet.service';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';

@ApiTags('Wallet')
@ApiCookieAuth('connect.sid')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get my balance' })
  @ApiOkResponse({ description: '{ balance: "100.00" }' })
  getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw funds' })
  @ApiOkResponse({ description: 'Transaction object' })
  withdraw(@CurrentUser() user: User, @Body() dto: CreateWithdrawDto) {
    return this.walletService.createWithdrawRequest(user.id, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get my withdrawal requests' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated list of my withdrawal requests' })
  getWithdrawals(
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.walletService.getMyWithdrawRequests(
      user.id,
      Number(skip) || 0,
      Number(take) || 20,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  getHistory(
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.walletService.getHistory(
      user.id,
      Number(skip) || 0,
      Number(take) || 20,
    );
  }
}
