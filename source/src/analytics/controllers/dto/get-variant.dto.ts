import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

/** Query parameters for retrieving the current version of one variant. */
export class GetVariantDto {
  @ApiProperty({ description: 'Project scope. Part of the natural key.' })
  @Type(() => Number)
  @IsInt()
  project_id!: number;

  @ApiProperty({ description: 'Source collection. Part of the natural key.' })
  @IsString()
  collection!: string;

  @ApiProperty({ description: 'Variant URI. Part of the natural key.' })
  @IsString()
  uri!: string;
}
