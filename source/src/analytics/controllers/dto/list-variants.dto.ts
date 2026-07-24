import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Query parameters for listing variants (analytics::variant::list). */
export class ListVariantsDto {
  @ApiPropertyOptional({ description: 'Restrict to a project.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  project_id?: number;

  @ApiPropertyOptional({ description: 'Restrict to a collection.' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ description: 'Restrict to a variant URI.' })
  @IsOptional()
  @IsString()
  uri?: string;

  @ApiPropertyOptional({ description: 'Lower bound on created_at (inclusive).' })
  @IsOptional()
  @IsDateString()
  created_from?: string;

  @ApiPropertyOptional({ description: 'Upper bound on created_at (inclusive).' })
  @IsOptional()
  @IsDateString()
  created_to?: string;

  @ApiPropertyOptional({
    description: 'Page size; default 50, capped at 200.',
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor for the next page.' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
