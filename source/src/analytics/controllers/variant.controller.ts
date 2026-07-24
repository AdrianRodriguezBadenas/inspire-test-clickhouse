import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { GetVariantDto } from './dto/get-variant.dto';
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
  @ApiOperation({ summary: 'List current variants matching optional filters, paginated.' })
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

  @Get('current')
  @ApiOperation({
    summary: 'Retrieve the current version of a variant by its natural key.',
  })
  @ApiOkResponse({ description: 'The current version of the variant.' })
  async get(@Query() query: GetVariantDto): Promise<Variant> {
    const variant = await this.service.get(
      query.project_id,
      query.collection,
      query.uri,
    );
    if (variant === null) {
      throw new NotFoundException({
        code: 'variant_not_found',
        message:
          'No variant found for the given project, collection and uri.',
      });
    }
    return variant;
  }
}
