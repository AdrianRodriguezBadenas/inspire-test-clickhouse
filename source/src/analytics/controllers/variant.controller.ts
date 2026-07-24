import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VariantService } from '../application/variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryVariantsDto } from './dto/query-variants.dto';
import {
  CreateVariantResponseDto,
  VariantPageDto,
} from './dto/variant-response.dto';

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

  @Post('query')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Query the current variants with a structured query, paginated.',
  })
  @ApiOkResponse({ type: VariantPageDto })
  async query(@Body() dto: QueryVariantsDto): Promise<VariantPageDto> {
    const page = await this.service.query({
      where: dto.where,
      order_by: dto.order_by,
      limit: dto.limit,
      cursor: dto.cursor,
    });
    return new VariantPageDto(page);
  }
}
