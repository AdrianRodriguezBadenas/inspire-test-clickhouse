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
  @ApiBody({
    type: CreateVariantDto,
    // A curated example, because a generated one is unusable here on both counts: the entity
    // has 288 fields, so the body Swagger builds from the schema is hundreds of lines nobody
    // would send, and the placeholders it invents for them are not valid input. What a person
    // hand-testing this API needs is the shortest body that works.
    examples: {
      minimal: {
        summary: 'The natural key plus the two enums — the smallest accepted record',
        value: {
          project_id: 42,
          collection: 'study-1',
          uri: 'chr1:12345:A:T',
          origin: 'GERMLINE',
          type: 'SNV/INDEL',
          version_date: '2026-07-01T00:00:00.000Z',
        },
      },
      annotated: {
        summary: 'With a few annotation fields, to show their shape',
        value: {
          project_id: 42,
          collection: 'study-1',
          uri: 'chr1:12345:A:T',
          origin: 'GERMLINE',
          type: 'SNV/INDEL',
          version_date: '2026-07-01T00:00:00.000Z',
          hpo: ['HP:0001250'],
          score: 0.87,
          allele_frequency: 0.0001,
          gene_symbol: 'BRCA1',
          feat_consequence: 'missense_variant',
        },
      },
    },
  })
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
