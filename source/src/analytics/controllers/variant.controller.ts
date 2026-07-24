import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VariantService } from '../application/variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateVariantResponseDto } from './dto/variant-response.dto';

@ApiTags('variants')
@Controller('variants')
export class VariantController {
  constructor(private readonly service: VariantService) {}

  @Post()
  @ApiOperation({ summary: 'Insert a variant record.' })
  @ApiResponse({ status: 201, type: CreateVariantResponseDto })
  async create(@Body() dto: CreateVariantDto): Promise<CreateVariantResponseDto> {
    const result = await this.service.create(dto);
    return new CreateVariantResponseDto(result);
  }
}
