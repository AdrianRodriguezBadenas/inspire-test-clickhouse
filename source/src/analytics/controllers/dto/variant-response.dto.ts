/**
 * The response shapes of the variant endpoints. Each maps from the domain in its
 * constructor, so a controller never hand-assembles a body.
 */

import { ApiProperty } from '@nestjs/swagger';
import type { Variant } from '../../domain/variant';
import type { CreatedVariant } from '../../application/variant.service';
import type { VariantPage } from '../../domain/variant-query';

/** A variant as JSON: the stored record with its timestamps as ISO strings. */
export type VariantJson = Omit<Variant, 'created_at' | 'version_date'> & {
  created_at: string;
  version_date: string;
};

export function toVariantJson(variant: Variant): VariantJson {
  return {
    ...variant,
    created_at: variant.created_at.toISOString(),
    version_date: variant.version_date.toISOString(),
  };
}

export class CreatedVariantDto {
  @ApiProperty({ format: 'uuid', description: "The stored record's generated id." })
  readonly id: string;

  constructor(created: CreatedVariant) {
    this.id = created.id;
  }
}

export class VariantPageDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description:
      'The matching current variants — whole records, one per natural key. The field ' +
      'list is the variant entity; see the GraphQL schema for it field by field.',
  })
  readonly items: VariantJson[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Opaque cursor for the next page; null when this is the last one.',
  })
  readonly next_cursor: string | null;

  constructor(page: VariantPage) {
    this.items = page.items.map(toVariantJson);
    this.next_cursor = page.next_cursor;
  }
}
