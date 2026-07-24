import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { NewVariant, Variant } from '../domain/variant';
import {
  VariantFilters,
  VariantRepository,
} from '../infrastructure/variant.repository';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface ListVariantsInput {
  filters: VariantFilters;
  limit?: number;
  cursor?: string;
}

export interface VariantPage {
  items: Variant[];
  next_cursor: string | null;
}

/**
 * Business logic for variants. Realizes analytics::variant::create (ANL-01):
 * assigns the system-generated fields and persists the record. Throws generic
 * `Error` on failure — translating to HTTP is the controller/filter's job.
 */
@Injectable()
export class VariantService {
  constructor(private readonly repository: VariantRepository) {}

  /**
   * Insert a variant. `id` and `created_at` are system-generated here and are not
   * taken from the caller. Returns the stored record's generated id.
   */
  async create(input: NewVariant): Promise<{ id: string }> {
    const variant: Variant = {
      ...input,
      id: uuidv4(),
      created_at: new Date(),
    };

    try {
      await this.repository.insert(variant);
    } catch (error) {
      throw new Error('Failed to store variant', { cause: error });
    }

    return { id: variant.id };
  }

  /**
   * Return a page of variants matching the filters. `limit` defaults to 50 and is
   * capped at 200; `next_cursor` is non-null when more results remain.
   */
  async list(input: ListVariantsInput): Promise<VariantPage> {
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = this.decodeCursor(input.cursor);

    const rows = await this.repository.queryCurrent(input.filters, limit + 1, offset);
    const hasMore = rows.length > limit;

    return {
      items: hasMore ? rows.slice(0, limit) : rows,
      next_cursor: hasMore ? this.encodeCursor(offset + limit) : null,
    };
  }

  /**
   * Retrieve the current version of one variant by its natural key, or null when
   * none matches.
   */
  async get(
    projectId: number,
    collection: string,
    uri: string,
  ): Promise<Variant | null> {
    return this.repository.findCurrent(projectId, collection, uri);
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(String(offset)).toString('base64');
  }

  private decodeCursor(cursor?: string): number {
    if (!cursor) return 0;
    const offset = parseInt(Buffer.from(cursor, 'base64').toString('utf8'), 10);
    return Number.isNaN(offset) || offset < 0 ? 0 : offset;
  }
}
