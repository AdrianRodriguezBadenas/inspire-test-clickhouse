import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VariantService } from '../application/variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ListVariantsDto } from './dto/list-variants.dto';
import {
  CreateVariantResponseDto,
  ListVariantsResponseDto,
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

  @Get()
  @ApiOperation({
    summary: 'Query current variants matching optional filters, paginated.',
  })
  @ApiOkResponse({ type: ListVariantsResponseDto })
  async list(@Query() query: ListVariantsDto): Promise<ListVariantsResponseDto> {
    const page = await this.service.list({
      filters: {
        project_id: query.project_id,
        collection: query.collection,
        uri: query.uri,
        created_from: query.created_from,
        created_to: query.created_to,
      },
      limit: query.limit,
      cursor: query.cursor,
    });
    return new ListVariantsResponseDto(page);
  }
}
