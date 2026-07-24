import { ApiProperty } from '@nestjs/swagger';
import { Variant } from '../../domain/variant';

/** Response for a successful insert (analytics::variant::create). */
export class CreateVariantResponseDto {
  @ApiProperty({ description: "The stored record's generated id." })
  id: string;

  constructor(result: { id: string }) {
    this.id = result.id;
  }
}

/** A page of current variants (analytics::variant::query). */
export class VariantPageDto {
  @ApiProperty({ type: 'array', items: { type: 'object' }, description: 'Matching variant records.' })
  items: Variant[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cursor for the next page, or null when none remain.',
  })
  next_cursor: string | null;

  constructor(page: { items: Variant[]; next_cursor: string | null }) {
    this.items = page.items;
    this.next_cursor = page.next_cursor;
  }
}
