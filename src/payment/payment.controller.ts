import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public-decorator';
import { PaymentService } from './payment.service';
import { DepositDto } from './dto/deposit.dto';

@ApiTags('Payment')
@ApiCookieAuth('connect.sid')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create checkout session',
    description:
      'Returns a provider checkout URL. Redirect user to this URL to complete payment.',
  })
  @ApiOkResponse({ description: '{ url: string }' })
  createDeposit(@CurrentUser() user: User, @Body() dto: DepositDto) {
    return this.paymentService.createDeposit(user, dto);
  }

  @Post('webhook/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentService.handleWebhook(provider, req);
  }
}
