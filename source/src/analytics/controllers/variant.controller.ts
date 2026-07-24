import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VariantService } from '../application/variant.service';
import { Variant } from '../domain/variant';
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
  @ApiOperation({ summary: 'List variants matching optional filters, paginated.' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single variant by id.' })
  @ApiOkResponse({ description: 'The matching variant.' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<Variant> {
    const variant = await this.service.get(id);
    if (variant === null) {
      throw new NotFoundException({
        code: 'variant_not_found',
        message: 'No variant found with the given id.',
      });
    }
    return variant;
  }
}
