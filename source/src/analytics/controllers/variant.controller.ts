/**
 * The REST access route. Kept indefinitely and by choice alongside GraphQL — the team
 * uses its Swagger surface to exercise the API by hand (adr-graphql-query-transport).
 *
 * A thin adapter: it shapes input and output and holds no logic of its own.
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VariantService } from '../application/variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryVariantsDto } from './dto/query-variants.dto';
import { CreatedVariantDto, VariantPageDto } from './dto/variant-response.dto';
import { LogsAction } from '../../common/observability/request-log.interceptor';

@ApiTags('variants')
@Controller('variants')
export class VariantController {
  constructor(private readonly service: VariantService) {}

  @Post()
  @LogsAction('analytics.variant.create')
  @ApiOperation({
    summary: 'Insert a variant record',
    description:
      'Appends one variant. Test-only: production ingest is file-based bulk loading, ' +
      'because ClickHouse produces one part per insert (ANL-01, TASK-2mf2yu).',
  })
  @ApiCreatedResponse({ type: CreatedVariantDto })
  async create(@Body() body: CreateVariantDto): Promise<CreatedVariantDto> {
    return new CreatedVariantDto(await this.service.create(body));
  }

  @Post('query')
  @LogsAction('analytics.variant.query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query current variants',
    description:
      'Reads the current version of each matching variant (greatest version_date per ' +
      'natural key). Audit history is never returned. The same contract is served by ' +
      'the read-only GraphQL surface at /graphql.',
  })
  @ApiBody({ type: QueryVariantsDto })
  @ApiOkResponse({ type: VariantPageDto })
  async query(@Body() body: QueryVariantsDto): Promise<VariantPageDto> {
    return new VariantPageDto(await this.service.query(body));
  }
}
