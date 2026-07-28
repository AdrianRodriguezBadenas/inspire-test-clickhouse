/**
 * The request body of `POST /variants/query`.
 *
 * It declares the transport shape and documents the endpoint; it deliberately does not
 * validate the condition tree. That validation is the security boundary of the read
 * path and must be identical on every access route (an ANL-02 parity criterion), so it
 * lives once in the domain — see `variant-query.validation.ts`.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../domain/variant-query';
import type { VariantCondition, VariantOrder, VariantQuery } from '../../domain/variant-query';

export class QueryVariantsDto implements VariantQuery {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'A condition tree. A node is { and: [...] }, { or: [...] }, { not: {...} }, or a ' +
      'leaf { field, op, value }. Operators: eq, ne, lt, lte, gt, gte, in, nin, like, ' +
      'ilike, between, is_null, is_not_null. Fields must be known variant columns.',
    example: {
      and: [
        { field: 'project_id', op: 'eq', value: 42 },
        { field: 'score', op: 'gte', value: 0.9 },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  where?: VariantCondition | null;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Ordered list of { field, dir } terms; dir is asc or desc.',
    example: [{ field: 'version_date', dir: 'desc' }],
  })
  @IsOptional()
  @IsArray()
  order_by?: VariantOrder[] | null;

  @ApiPropertyOptional({
    description: `Page size. Defaults to ${DEFAULT_PAGE_SIZE}, capped at ${MAX_PAGE_SIZE}.`,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @IsInt()
  limit?: number | null;

  @ApiPropertyOptional({ description: 'Opaque cursor returned as next_cursor by a previous page.' })
  @IsOptional()
  @IsString()
  cursor?: string | null;
}
