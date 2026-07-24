import { ApiProperty } from '@nestjs/swagger';

/** Response for a successful insert (analytics::variant::create). */
export class CreateVariantResponseDto {
  @ApiProperty({ description: "The stored record's generated id." })
  id: string;

  constructor(result: { id: string }) {
    this.id = result.id;
  }
}
