import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Condition, OrderBy } from '../../domain/variant-query';

/**
 * Body for POST /variants/query. The `where` tree and `order_by` are validated in
 * depth by the query translator (field allow-list + operator whitelist); here we
 * only check the coarse shape and the pagination bounds.
 */
export class QueryVariantsDto {
  @ApiPropertyOptional({
    description:
      'Condition tree: and/or/not nodes or a leaf { field, op, value }.',
  })
  @IsOptional()
  @IsObject()
  where?: Condition;

  @ApiPropertyOptional({ description: 'Ordering: a list of { field, dir }.' })
  @IsOptional()
  @IsArray()
  order_by?: OrderBy[];

  @ApiPropertyOptional({
    description: 'Page size; default 50, capped at 200.',
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor for the next page.' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
