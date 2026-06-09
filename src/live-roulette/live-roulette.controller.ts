import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LiveRouletteRoomService } from './services/live-roulette-room.service';

@ApiTags('Live Roulette')
@ApiCookieAuth('connect.sid')
@Controller('live-roulette/rooms')
export class LiveRouletteController {
  constructor(
    private readonly roomService: LiveRouletteRoomService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all live roulette rooms' })
  @ApiOkResponse({ description: 'Array of RoomState' })
  listRooms() {
    return this.roomService.listRooms();
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get current state of a room' })
  getRoom(@Param('roomId') roomId: string) {
    return this.roomService.getRoomState(roomId);
  }
}
