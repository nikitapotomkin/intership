import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpsertAddressDto {
  @ApiProperty({ example: 'Nik' })
  @IsString()
  firstName: string;
 
  @ApiProperty({ example: 'Pot' })
  @IsString()
  lastName: string;
 
  @ApiProperty({ example: '+380991234435' })
  @IsString()
  phoneNumber: string;
 
  @ApiProperty({ example: 'Khreschatyk St, 1' })
  @IsString()
  address: string;
 
  @ApiPropertyOptional({ example: 'Apt. 5' })
  @IsOptional()
  @IsString()
  address2?: string;
 
  @ApiPropertyOptional({ example: 'UA' })
  @IsOptional()
  @IsString()
  country?: string;
 
  @ApiProperty({ example: '01001' })
  @IsString()
  postalCode: string;
 
  @ApiProperty({ example: 'Kyiv' })
  @IsString()
  city: string;
}